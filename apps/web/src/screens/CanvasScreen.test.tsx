import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GraphElement, Milestone } from "../api";
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

// A three-level fixture (system > container > component), matching what the
// real API returns for any scope: every element in the project, unfiltered.
const THREE_LEVEL_ELEMENTS: GraphElement[] = [
  element({ id: "system-1", kind: "system", parent_id: null, name: "Booking" }),
  element({ id: "container-1", kind: "container", parent_id: "system-1", name: "API" }),
  element({ id: "component-1", kind: "component", parent_id: "container-1", name: "Router" }),
];

function renderScreen(initialPath: string = `/projects/${PROJECT_ID}`) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/projects/:projectId" element={<CanvasScreen />} />
        <Route path="/projects/:projectId/systems/:systemId" element={<CanvasScreen />} />
        <Route path="/projects/:projectId/systems/:systemId/containers/:containerId" element={<CanvasScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CanvasScreen", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    // Every test in this file focuses on graph/milestone behavior — annotations
    // are fetched unconditionally by CanvasGraph (like the graph itself), so a
    // GET to that endpoint is short-circuited here instead of requiring every
    // mockImplementation below to account for it.
    const fetch = fetchMock as unknown as (url: string, options?: RequestInit) => Promise<Response>;
    vi.stubGlobal("fetch", (url: string, options?: RequestInit) => {
      if (url.includes("/annotations") && (options?.method ?? "GET") === "GET") {
        return Promise.resolve(jsonResponse([]));
      }
      return options === undefined ? fetch(url) : fetch(url, options);
    });
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

  it("requests the graph at the milestone with the highest sort order, unscoped at C1", async () => {
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

    // WHEN the canvas screen mounts at the C1 root
    renderScreen();

    // THEN the graph is requested with the latest milestone id and no scope
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=latest`));
    expect(await screen.findByTestId("canvas-graph")).toBeInTheDocument();
  });

  it("requests the graph scoped to the system when viewing C2", async () => {
    // GIVEN a project with a milestone
    fetchMock.mockImplementation((url: string) => {
      if (url === MILESTONES_URL) return Promise.resolve(jsonResponse([milestone()]));
      if (url.startsWith(GRAPH_URL_PREFIX)) return Promise.resolve(jsonResponse({ elements: [], relations: [], positions: {}, warnings: [] }));
      throw new Error(`unexpected fetch: ${url}`);
    });

    // WHEN the canvas screen mounts at a system's C2 view
    renderScreen(`/projects/${PROJECT_ID}/systems/system-1`);

    // THEN the graph is requested scoped to that system
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=milestone-1&scope_element_id=system-1`));
  });

  it("requests the graph scoped to the container when viewing C3", async () => {
    // GIVEN a project with a milestone
    fetchMock.mockImplementation((url: string) => {
      if (url === MILESTONES_URL) return Promise.resolve(jsonResponse([milestone()]));
      if (url.startsWith(GRAPH_URL_PREFIX)) return Promise.resolve(jsonResponse({ elements: [], relations: [], positions: {}, warnings: [] }));
      throw new Error(`unexpected fetch: ${url}`);
    });

    // WHEN the canvas screen mounts at a container's C3 view
    renderScreen(`/projects/${PROJECT_ID}/systems/system-1/containers/container-1`);

    // THEN the graph is requested scoped to the container (not the system)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=milestone-1&scope_element_id=container-1`));
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

  it("renders elements as custom nodes with their name", async () => {
    // GIVEN a graph with one system
    fetchMock.mockImplementation((url: string) => {
      if (url === MILESTONES_URL) return Promise.resolve(jsonResponse([milestone()]));
      if (url.startsWith(GRAPH_URL_PREFIX)) {
        return Promise.resolve(jsonResponse({ elements: [element()], relations: [], positions: {}, warnings: [] }));
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    // WHEN the canvas screen mounts
    renderScreen();

    // THEN the system renders as a custom node showing its name
    expect(await screen.findByTestId("element-node")).toHaveTextContent("Booking");
  });

  it("shows an empty-level message instead of a blank canvas when a system has no containers", async () => {
    // GIVEN a system with no containers (drilling into it yields zero elements at C2)
    fetchMock.mockImplementation((url: string) => {
      if (url === MILESTONES_URL) return Promise.resolve(jsonResponse([milestone()]));
      if (url.startsWith(GRAPH_URL_PREFIX)) {
        return Promise.resolve(jsonResponse({ elements: [element({ id: "system-1" })], relations: [], positions: {}, warnings: [] }));
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    // WHEN viewing that system's C2
    renderScreen(`/projects/${PROJECT_ID}/systems/system-1`);

    // THEN an explicit empty-level message is shown, not a blank canvas
    expect(await screen.findByTestId("canvas-empty-level")).toHaveTextContent("This system has no containers yet.");
    expect(screen.queryByTestId("element-node")).not.toBeInTheDocument();
  });

  describe("milestone timeline", () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url: string, options?: RequestInit) => {
        if (url === MILESTONES_URL && options?.method === undefined) {
          return Promise.resolve(
            jsonResponse([
              milestone({ id: "past", label: "Past", sort_order: 0 }),
              milestone({ id: "latest", label: "Latest", sort_order: 1 }),
            ]),
          );
        }
        if (url.startsWith(GRAPH_URL_PREFIX)) {
          return Promise.resolve(jsonResponse({ elements: [], relations: [], positions: {}, warnings: [] }));
        }
        if (url === MILESTONES_URL && options?.method === "POST") {
          return Promise.resolve(jsonResponse(milestone({ id: "new", label: "New milestone", sort_order: 2 }), { status: 201 }));
        }
        if (url === "http://localhost:8000/api/milestones/latest" && options?.method === "PATCH") {
          const body = JSON.parse(String(options.body));
          return Promise.resolve(jsonResponse(milestone({ id: "latest", label: body.label, occurs_on: body.occurs_on, sort_order: 1 })));
        }
        if (url === `${MILESTONES_URL}/reorder` && options?.method === "PUT") {
          return Promise.resolve(
            jsonResponse([
              milestone({ id: "latest", label: "Latest", sort_order: 0 }),
              milestone({ id: "past", label: "Past", sort_order: 1 }),
            ]),
          );
        }
        throw new Error(`unexpected fetch: ${options?.method ?? "GET"} ${url}`);
      });
    });

    it("renders every milestone in order, defaulting to the latest as selected", async () => {
      // WHEN the canvas screen mounts
      renderScreen();

      // THEN the timeline shows every milestone, ordered oldest first, defaulting to the latest as selected
      const items = await screen.findAllByTestId("milestone-timeline-item");
      expect(items.map((item) => item.textContent)).toEqual(["Past", "Latest"]);
      expect(items[1]).toHaveAttribute("aria-current", "true");
      expect(items[0]).not.toHaveAttribute("aria-current");

      // Wait for the graph fetch this mount kicked off to settle (and ReactFlow
      // to mount) before the test ends, so its effects don't fire post-cleanup.
      await screen.findByTestId("canvas-graph");
    });

    it("links to the compare screen for the current project", async () => {
      // WHEN the canvas screen mounts
      renderScreen();
      await screen.findByTestId("canvas-graph");

      // THEN a link to the compare screen is shown
      expect(await screen.findByTestId("canvas-compare-link")).toHaveAttribute("href", `/projects/${PROJECT_ID}/compare`);
    });

    it("requests the graph for the newly selected milestone", async () => {
      // GIVEN the canvas screen mounted at the latest milestone
      renderScreen();
      const items = await screen.findAllByTestId("milestone-timeline-item");
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=latest`));
      await screen.findByTestId("canvas-graph");

      // WHEN a different milestone is clicked
      fireEvent.click(items[0]);

      // THEN the graph is re-requested for that milestone
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=past`));
      // Wait for that second fetch to settle and ReactFlow to remount before the test ends.
      await screen.findByTestId("canvas-graph");
    });

    it("does not refetch the milestones list when the selection changes", async () => {
      // GIVEN the canvas screen mounted at the latest milestone
      renderScreen();
      const items = await screen.findAllByTestId("milestone-timeline-item");
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=latest`));
      await screen.findByTestId("canvas-graph");
      const milestonesCallsBefore = fetchMock.mock.calls.filter(([url]) => url === MILESTONES_URL).length;

      // WHEN a different milestone is clicked
      fireEvent.click(items[0]);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=past`));
      await screen.findByTestId("canvas-graph");

      // THEN the milestones list itself is not re-fetched
      const milestonesCallsAfter = fetchMock.mock.calls.filter(([url]) => url === MILESTONES_URL).length;
      expect(milestonesCallsAfter).toBe(milestonesCallsBefore);
    });

    it("keeps the selected milestone when drilling down to a different level", async () => {
      // GIVEN a system, and an older milestone selected instead of the latest
      fetchMock.mockImplementation((url: string) => {
        if (url === MILESTONES_URL) {
          return Promise.resolve(
            jsonResponse([
              milestone({ id: "past", label: "Past", sort_order: 0 }),
              milestone({ id: "latest", label: "Latest", sort_order: 1 }),
            ]),
          );
        }
        if (url.startsWith(GRAPH_URL_PREFIX)) {
          return Promise.resolve(jsonResponse({ elements: [element({ id: "system-1" })], relations: [], positions: {}, warnings: [] }));
        }
        throw new Error(`unexpected fetch: ${url}`);
      });
      renderScreen();
      const items = await screen.findAllByTestId("milestone-timeline-item");
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=latest`));
      fireEvent.click(items[0]);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=past`));

      // WHEN double-clicking the system node to drill down
      fireEvent.doubleClick(await screen.findByTestId("element-node"));

      // THEN the drilled-down graph is requested at the same, still-selected milestone (not reset to latest)
      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=past&scope_element_id=system-1`),
      );
      const itemsAfterDrillDown = await screen.findAllByTestId("milestone-timeline-item");
      const selected = itemsAfterDrillDown.find((item) => item.getAttribute("aria-current") === "true");
      expect(selected?.textContent).toBe("Past");
    });

    it("creates a new milestone and selects it, without refetching the milestones list", async () => {
      // GIVEN the canvas screen mounted at the latest milestone
      renderScreen();
      await screen.findAllByTestId("milestone-timeline-item");
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=latest`));
      await screen.findByTestId("canvas-graph");
      const isMilestonesListGet = (call: unknown[]) => call[0] === MILESTONES_URL && (call[1] as RequestInit | undefined)?.method === undefined;
      const milestonesListCallsBefore = fetchMock.mock.calls.filter(isMilestonesListGet).length;

      // WHEN the "New milestone" button is clicked
      fireEvent.click(screen.getByTestId("milestone-timeline-create"));

      // THEN the new milestone is selected and its editor shows up
      await waitFor(() => expect(screen.getByTestId("milestone-timeline-label-input")).toHaveValue("New milestone"));
      // AND the graph is requested at the new milestone
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${GRAPH_URL_PREFIX}?milestone_id=new`));
      await screen.findByTestId("canvas-graph");
      // AND the milestones list itself is not re-fetched — the new milestone is merged in locally
      const milestonesListCallsAfter = fetchMock.mock.calls.filter(isMilestonesListGet).length;
      expect(milestonesListCallsAfter).toBe(milestonesListCallsBefore);
    });

    it("renames the selected milestone via its editor", async () => {
      // GIVEN the canvas screen mounted at the latest milestone
      renderScreen();
      await screen.findAllByTestId("milestone-timeline-item");
      const labelInput = await screen.findByTestId("milestone-timeline-label-input");

      // WHEN its label is edited
      fireEvent.change(labelInput, { target: { value: "Beta" } });

      // THEN the corresponding timeline pill updates once the autosave debounce elapses
      await waitFor(() => expect(screen.getByText("Beta")).toBeInTheDocument(), { timeout: 2000 });
    });

    it("reorders milestones via the editor's move buttons", async () => {
      // GIVEN the canvas screen mounted at the latest milestone (second of two)
      renderScreen();
      const items = await screen.findAllByTestId("milestone-timeline-item");
      expect(items.map((item) => item.textContent)).toEqual(["Past", "Latest"]);

      // WHEN moving the selected (latest) milestone earlier
      fireEvent.click(screen.getByTestId("milestone-timeline-move-earlier"));

      // THEN the new order is reflected once the reorder response comes back
      await waitFor(() => {
        const reorderedItems = screen.getAllByTestId("milestone-timeline-item");
        expect(reorderedItems.map((item) => item.textContent)).toEqual(["Latest", "Past"]);
      });
    });
  });

  describe("breadcrumb", () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url: string) => {
        if (url === MILESTONES_URL) return Promise.resolve(jsonResponse([milestone()]));
        if (url.startsWith(GRAPH_URL_PREFIX)) {
          return Promise.resolve(jsonResponse({ elements: THREE_LEVEL_ELEMENTS, relations: [], positions: {}, warnings: [] }));
        }
        throw new Error(`unexpected fetch: ${url}`);
      });
    });

    it("shows a single C1 crumb at the root level", async () => {
      // WHEN viewing the C1 root
      renderScreen();

      // THEN only the C1 crumb is shown
      const items = await screen.findAllByTestId("breadcrumb-item");
      expect(items.map((item) => item.textContent)).toEqual(["C1"]);
    });

    it("shows C1 and the system name at C2", async () => {
      // WHEN viewing a system's C2
      renderScreen(`/projects/${PROJECT_ID}/systems/system-1`);

      // THEN the trail shows C1 then the system's resolved name
      const items = await screen.findAllByTestId("breadcrumb-item");
      expect(items.map((item) => item.textContent)).toEqual(["C1", "C2: Booking"]);
    });

    it("shows C1, the system, and the container name at C3", async () => {
      // WHEN viewing a container's C3
      renderScreen(`/projects/${PROJECT_ID}/systems/system-1/containers/container-1`);

      // THEN the trail shows all three resolved names
      const items = await screen.findAllByTestId("breadcrumb-item");
      expect(items.map((item) => item.textContent)).toEqual(["C1", "C2: Booking", "C3: API"]);
    });
  });

  describe("drill-down", () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url: string) => {
        if (url === MILESTONES_URL) return Promise.resolve(jsonResponse([milestone()]));
        if (url.startsWith(GRAPH_URL_PREFIX)) {
          return Promise.resolve(jsonResponse({ elements: THREE_LEVEL_ELEMENTS, relations: [], positions: {}, warnings: [] }));
        }
        throw new Error(`unexpected fetch: ${url}`);
      });
    });

    it("drills from C1 into a system's C2 on double-click", async () => {
      // GIVEN the C1 root, showing the "Booking" system node
      renderScreen();
      await screen.findByTestId("element-node");

      // WHEN double-clicking the system node
      // (fireEvent, not userEvent: userEvent's full mousedown→mouseup sequence
      // trips React Flow's node-drag listener, which jsdom's synthetic
      // MouseEvent.view=null breaks; React Flow only needs the "dblclick" itself)
      fireEvent.doubleClick(screen.getByTestId("element-node"));

      // THEN the view drills down to C2, now showing the system's container
      expect(await screen.findByText("API")).toBeInTheDocument();
      const items = await screen.findAllByTestId("breadcrumb-item");
      expect(items.map((item) => item.textContent)).toEqual(["C1", "C2: Booking"]);
    });

    it("drills from C2 into a container's C3 on double-click", async () => {
      // GIVEN a system's C2, showing the "API" container node
      renderScreen(`/projects/${PROJECT_ID}/systems/system-1`);
      await screen.findByText("API");

      // WHEN double-clicking the container node
      fireEvent.doubleClick(screen.getByTestId("element-node"));

      // THEN the view drills down to C3, now showing the container's component
      expect(await screen.findByText("Router")).toBeInTheDocument();
      const items = await screen.findAllByTestId("breadcrumb-item");
      expect(items.map((item) => item.textContent)).toEqual(["C1", "C2: Booking", "C3: API"]);
    });

    it("does not drill down further from C3, the deepest V1 level", async () => {
      // GIVEN a container's C3, showing the "Router" component node
      renderScreen(`/projects/${PROJECT_ID}/systems/system-1/containers/container-1`);
      await screen.findByText("Router");
      const fetchCountBeforeClick = fetchMock.mock.calls.length;

      // WHEN double-clicking the component node
      fireEvent.doubleClick(screen.getByTestId("element-node"));

      // THEN no navigation happens: the view is unchanged, no new fetch is triggered
      expect(screen.getByText("Router")).toBeInTheDocument();
      expect(fetchMock.mock.calls.length).toBe(fetchCountBeforeClick);
    });

    it("navigates back up to C1 via the breadcrumb", async () => {
      // GIVEN a system's C2
      const user = userEvent.setup();
      renderScreen(`/projects/${PROJECT_ID}/systems/system-1`);
      await screen.findByText("API");

      // WHEN clicking the C1 breadcrumb crumb
      await user.click(screen.getByText("C1"));

      // THEN the view is back at C1, showing the root system
      expect(await screen.findByText("Booking")).toBeInTheDocument();
      const items = await screen.findAllByTestId("breadcrumb-item");
      expect(items.map((item) => item.textContent)).toEqual(["C1"]);
    });
  });

  describe("editing", () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url: string, options?: RequestInit) => {
        if (url === MILESTONES_URL) return Promise.resolve(jsonResponse([milestone()]));
        if (url.startsWith(GRAPH_URL_PREFIX)) {
          return Promise.resolve(jsonResponse({ elements: [element({ id: "system-1", name: "Booking" })], relations: [], positions: {}, warnings: [] }));
        }
        if (url.endsWith("/position")) {
          return Promise.resolve(jsonResponse({}));
        }
        if (url === "http://localhost:8000/api/elements/system-1" && options?.method === "PATCH") {
          const body = JSON.parse(String(options.body));
          return Promise.resolve(
            jsonResponse({ id: "system-1", milestone_id: "milestone-1", name: body.name, description: body.description, technology: body.technology }),
          );
        }
        if (url === "http://localhost:8000/api/elements/system-1" && options?.method === "DELETE") {
          return Promise.resolve(jsonResponse(null, { status: 204 }));
        }
        if (url === `http://localhost:8000/api/projects/${PROJECT_ID}/elements` && options?.method === "POST") {
          return Promise.resolve(
            jsonResponse(
              { id: "system-2", project_id: PROJECT_ID, parent_id: null, kind: "system", is_external: false, name: "New system", description: null, technology: null },
              { status: 201 },
            ),
          );
        }
        throw new Error(`unexpected fetch: ${options?.method ?? "GET"} ${url}`);
      });
    });

    it("selects an element on click and shows it in the panel", async () => {
      // GIVEN the C1 root, showing the "Booking" system node
      renderScreen();
      const node = await screen.findByTestId("element-node");

      // WHEN clicking the node
      fireEvent.click(node);

      // THEN the panel opens, showing that element's current values
      expect(await screen.findByTestId("element-panel-name")).toHaveValue("Booking");
    });

    it("renames an element via the panel and updates the node label", async () => {
      // GIVEN a selected element
      renderScreen();
      fireEvent.click(await screen.findByTestId("element-node"));
      const nameInput = await screen.findByTestId("element-panel-name");

      // WHEN its name is edited
      fireEvent.change(nameInput, { target: { value: "Payments" } });

      // THEN the node label updates once the autosave debounce elapses
      await waitFor(() => expect(screen.getByTestId("element-node")).toHaveTextContent("Payments"), { timeout: 2000 });
    });

    it("deletes an element after confirming, removing its node", async () => {
      // GIVEN a selected element
      const user = userEvent.setup();
      renderScreen();
      fireEvent.click(await screen.findByTestId("element-node"));
      const deleteButton = await screen.findByTestId("element-panel-delete");

      // WHEN clicking delete twice (arm, then confirm)
      await user.click(deleteButton);
      await user.click(deleteButton);

      // THEN the node is removed
      await waitFor(() => expect(screen.queryByTestId("element-node")).not.toBeInTheDocument());
    });

    it("creates a new element at the current level and selects it", async () => {
      // GIVEN the C1 root
      const user = userEvent.setup();
      renderScreen();
      await screen.findByTestId("canvas-graph");

      // WHEN clicking the create button
      await user.click(screen.getByTestId("create-element"));

      // THEN the new element is added, selected, and shown in the panel
      expect(await screen.findByTestId("element-panel-name")).toHaveValue("New system");
      expect(screen.getByText("New system")).toBeInTheDocument();
    });
  });

  // No CanvasScreen-level test for edge selection/creation: React Flow never
  // renders edges in jsdom (they require measured node dimensions, which
  // ResizeObserver never provides here — the same limitation already hit for
  // node dragging). That logic is covered instead by RelationPanel.test.tsx
  // (form/debounce/delete-confirm behavior) and toFlowGraph.test.ts (edge data
  // mapping), plus manual verification in a real browser.
});
