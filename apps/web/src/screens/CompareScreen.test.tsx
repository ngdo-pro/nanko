import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GraphElement, Milestone } from "../api";
import CompareScreen from "./CompareScreen";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const MILESTONES_URL = `http://localhost:8000/api/projects/${PROJECT_ID}/milestones`;
const GRAPH_URL_PREFIX = `http://localhost:8000/api/projects/${PROJECT_ID}/graph`;
const DIFF_URL_PREFIX = `http://localhost:8000/api/projects/${PROJECT_ID}/diff`;

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as Response;
}

function milestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: "milestone-1",
    project_id: PROJECT_ID,
    label: "Launch",
    occurs_on: null,
    sort_order: 0,
    created_at: "2026-08-10T00:00:00+00:00",
    ...overrides,
  };
}

function element(overrides: Partial<GraphElement> = {}): GraphElement {
  return {
    id: "system-1",
    project_id: PROJECT_ID,
    parent_id: null,
    kind: "system",
    is_external: false,
    archetype: null,
    name: "Booking",
    description: null,
    technology: null,
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}/compare`]}>
      <Routes>
        <Route path="/projects/:projectId/compare" element={<CompareScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CompareScreen", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockTwoMilestonesAndGraphs() {
    fetchMock.mockImplementation((url: string) => {
      if (url === MILESTONES_URL) {
        return Promise.resolve(jsonResponse([milestone({ id: "past", label: "Past", sort_order: 0 }), milestone({ id: "latest", label: "Latest", sort_order: 1 })]));
      }
      if (url === `${GRAPH_URL_PREFIX}?milestone_id=past`) {
        return Promise.resolve(jsonResponse({ elements: [element({ id: "system-1", name: "Booking (past)" })], relations: [], positions: {}, warnings: [] }));
      }
      if (url === `${GRAPH_URL_PREFIX}?milestone_id=latest`) {
        return Promise.resolve(jsonResponse({ elements: [element({ id: "system-1", name: "Booking (latest)" })], relations: [], positions: {}, warnings: [] }));
      }
      if (url.startsWith(DIFF_URL_PREFIX)) {
        return Promise.resolve(jsonResponse({ elements: [{ id: "system-1", status: "modified", changed_fields: ["name"] }], relations: [] }));
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
  }

  it("shows a message when the project has fewer than two milestones", async () => {
    // GIVEN a project with a single milestone
    fetchMock.mockImplementation((url: string) => {
      if (url === MILESTONES_URL) return Promise.resolve(jsonResponse([milestone()]));
      throw new Error(`unexpected fetch: ${url}`);
    });

    // WHEN the compare screen mounts
    renderScreen();

    // THEN a message explains comparison needs two milestones, and no graph is requested
    expect(await screen.findByTestId("compare-not-enough-milestones")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/graph"));
  });

  it("defaults to comparing the two most recent milestones", async () => {
    // GIVEN a project with two milestones
    mockTwoMilestonesAndGraphs();

    // WHEN the compare screen mounts
    renderScreen();

    // THEN both panes render, showing each milestone's own graph
    expect(await screen.findByText("Booking (past)")).toBeInTheDocument();
    expect(await screen.findByText("Booking (latest)")).toBeInTheDocument();
    expect(screen.getByTestId("compare-from-select")).toHaveValue("past");
    expect(screen.getByTestId("compare-to-select")).toHaveValue("latest");
  });

  it("renders each pane read-only — no create button, no editable panels", async () => {
    // GIVEN a project with two milestones
    mockTwoMilestonesAndGraphs();

    // WHEN the compare screen mounts and a node in a pane is clicked
    renderScreen();
    await screen.findByText("Booking (past)");
    const nodes = await screen.findAllByTestId("element-node");
    fireEvent.click(nodes[0]);

    // THEN no create button and no element panel ever appear
    expect(screen.queryByTestId("create-element")).not.toBeInTheDocument();
    expect(screen.queryByTestId("element-panel")).not.toBeInTheDocument();
  });

  it("uses distinct testids for the two canvas panes", async () => {
    // GIVEN a project with two milestones
    mockTwoMilestonesAndGraphs();

    // WHEN the compare screen mounts
    renderScreen();

    // THEN both panes are present under distinct testids (findByTestId would
    // otherwise throw on the ambiguous shared "canvas-graph" id)
    expect(await screen.findByTestId("compare-canvas-from")).toBeInTheDocument();
    expect(await screen.findByTestId("compare-canvas-to")).toBeInTheDocument();
  });

  it("re-requests the 'to' graph when a different milestone is picked", async () => {
    // GIVEN the compare screen showing past vs latest
    mockTwoMilestonesAndGraphs();
    renderScreen();
    await screen.findByText("Booking (latest)");

    // WHEN the "to" selection changes to "past"
    fireEvent.change(screen.getByTestId("compare-to-select"), { target: { value: "past" } });

    // THEN the graph for "past" is requested again (independently of "from"),
    // and its pane re-renders with the new milestone's data (waiting for the
    // actual re-render, not just the fetch call, so the new CanvasGraph's
    // effects don't fire after this test's cleanup has torn down globals)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=past`));
    await waitFor(() => expect(screen.getAllByText("Booking (past)")).toHaveLength(2));
  });

  it("links back to the canvas for the current project", async () => {
    // GIVEN a project with two milestones
    mockTwoMilestonesAndGraphs();

    // WHEN the compare screen mounts
    renderScreen();
    await screen.findByText("Booking (past)");

    // THEN a link back to the canvas is shown
    expect(screen.getByTestId("compare-exit")).toHaveAttribute("href", `/projects/${PROJECT_ID}`);
  });

  describe("overlay mode", () => {
    it("requests the diff between the two selected milestones", async () => {
      // GIVEN a project with two milestones
      mockTwoMilestonesAndGraphs();

      // WHEN the compare screen mounts
      renderScreen();

      // THEN the diff is requested between them, without waiting for overlay mode to be selected
      // (fetched eagerly alongside the two graphs, per the hook's own contract)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${DIFF_URL_PREFIX}?from_milestone_id=past&to_milestone_id=latest`));
    });

    it("shows a single merged canvas instead of two panes once overlay mode is selected", async () => {
      // GIVEN the compare screen in the default side-by-side mode
      mockTwoMilestonesAndGraphs();
      renderScreen();
      await screen.findByText("Booking (past)");
      expect(screen.getByTestId("compare-canvas-from")).toBeInTheDocument();
      expect(screen.getByTestId("compare-canvas-to")).toBeInTheDocument();

      // WHEN switching to overlay mode
      fireEvent.click(screen.getByTestId("compare-mode-overlay"));

      // THEN the two side-by-side panes are replaced by a single overlay canvas
      expect(await screen.findByTestId("compare-canvas-overlay")).toBeInTheDocument();
      expect(screen.queryByTestId("compare-canvas-from")).not.toBeInTheDocument();
      expect(screen.queryByTestId("compare-canvas-to")).not.toBeInTheDocument();
    });

    it("shows the diff legend only in overlay mode", async () => {
      // GIVEN the compare screen in the default side-by-side mode
      mockTwoMilestonesAndGraphs();
      renderScreen();
      await screen.findByText("Booking (past)");
      expect(screen.queryByTestId("diff-legend")).not.toBeInTheDocument();

      // WHEN switching to overlay mode
      fireEvent.click(screen.getByTestId("compare-mode-overlay"));

      // THEN the legend explaining the added/modified/removed symbols appears
      expect(await screen.findByTestId("diff-legend")).toBeInTheDocument();
    });

    it("renders the merged element once, reflecting its diff status", async () => {
      // GIVEN a project where the diff marks the one element as modified
      mockTwoMilestonesAndGraphs();
      renderScreen();
      await screen.findByText("Booking (past)");

      // WHEN switching to overlay mode
      fireEvent.click(screen.getByTestId("compare-mode-overlay"));
      await screen.findByTestId("compare-canvas-overlay");

      // THEN the element appears once (using the "to" milestone's fields), tagged as modified
      const nodes = await screen.findAllByTestId("element-node");
      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toHaveTextContent("Booking (latest)");
      expect(screen.getByTestId("element-node-diff-badge")).toHaveTextContent("~");
    });

    it("shows a textual diff panel listing the same modified element", async () => {
      // GIVEN a project where the diff marks the one element as modified
      mockTwoMilestonesAndGraphs();
      renderScreen();
      await screen.findByText("Booking (past)");

      // WHEN switching to overlay mode
      fireEvent.click(screen.getByTestId("compare-mode-overlay"));
      await screen.findByTestId("compare-canvas-overlay");

      // THEN the diff panel lists the same element under "Modified"
      expect(screen.getByTestId("diff-panel-section-modified")).toHaveTextContent("Booking (latest)");
    });
  });
});
