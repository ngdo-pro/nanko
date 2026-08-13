import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Milestone } from "../api";
import CanvasScreen from "./CanvasScreen";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const MILESTONES_URL = `http://localhost:8000/api/projects/${PROJECT_ID}/milestones`;
const GRAPH_URL_PREFIX = `http://localhost:8000/api/projects/${PROJECT_ID}/graph`;

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  } as Response;
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

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}`]}>
      <Routes>
        <Route path="/projects/:projectId" element={<CanvasScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CanvasScreen", () => {
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

  it("requests the graph at the milestone with the highest sort order", async () => {
    // GIVEN a project with two milestones and a graph with one system
    fetchMock.mockImplementation((url: string) => {
      if (url === MILESTONES_URL) {
        return Promise.resolve(jsonResponse([milestone({ id: "past", sort_order: 0 }), milestone({ id: "latest", sort_order: 1 })]));
      }
      if (url.startsWith(GRAPH_URL_PREFIX)) {
        return Promise.resolve(jsonResponse({ elements: [], relations: [], positions: {}, warnings: [] }));
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    // WHEN the canvas screen mounts
    renderScreen();

    // THEN the graph is requested with the latest milestone id
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=latest`));
    expect(await screen.findByTestId("canvas-graph")).toBeInTheDocument();
  });

  it("shows an empty state when the project has no milestone", async () => {
    // GIVEN a project with no milestones
    fetchMock.mockImplementation((url: string) => {
      if (url === MILESTONES_URL) return Promise.resolve(jsonResponse([]));
      throw new Error(`unexpected fetch: ${url}`);
    });

    // WHEN the canvas screen mounts
    renderScreen();

    // THEN the no-milestone empty state is shown and the graph is never requested
    expect(await screen.findByTestId("canvas-no-milestone")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/graph"));
  });

  it("shows an error state when the graph request fails", async () => {
    // GIVEN a milestone that the graph endpoint rejects
    fetchMock.mockImplementation((url: string) => {
      if (url === MILESTONES_URL) return Promise.resolve(jsonResponse([milestone()]));
      if (url.startsWith(GRAPH_URL_PREFIX)) return Promise.resolve(jsonResponse({ error: "milestone not found" }, { ok: false, status: 404 }));
      throw new Error(`unexpected fetch: ${url}`);
    });

    // WHEN the canvas screen mounts
    renderScreen();

    // THEN the error is shown
    expect(await screen.findByTestId("canvas-error")).toHaveTextContent("milestone not found");
  });
});
