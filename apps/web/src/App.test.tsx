import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

type Project = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

const PING_URL = "http://localhost:8000/api/ping";
const PROJECTS_URL = "http://localhost:8000/api/projects";

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  } as Response;
}

function existingProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Nanko",
    slug: "nanko",
    created_at: "2026-08-10T00:00:00+00:00",
    updated_at: "2026-08-10T00:00:00+00:00",
    ...overrides,
  };
}

describe("App", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and renders the project list on mount", async () => {
    // GIVEN the API returns an existing project
    fetchMock.mockImplementation((url: string) => {
      if (url === PING_URL) return Promise.resolve(jsonResponse({ status: "ok", service: "spike-symfony-api" }));
      if (url === PROJECTS_URL) return Promise.resolve(jsonResponse([existingProject()]));
      throw new Error(`unexpected fetch: ${url}`);
    });

    // WHEN the app mounts
    render(<App />);

    // THEN the project is rendered in the list
    expect(await screen.findByText("Nanko (nanko)")).toBeInTheDocument();
  });

  it("creates a project, clears the form, and reloads the list", async () => {
    // GIVEN an empty project list and an API that accepts the creation
    const user = userEvent.setup();
    let projectsListedCount = 0;

    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === PING_URL) return Promise.resolve(jsonResponse({ status: "ok", service: "spike-symfony-api" }));
      if (url === PROJECTS_URL && (!init || init.method === undefined)) {
        projectsListedCount += 1;
        const projects = projectsListedCount === 1 ? [] : [existingProject({ name: "New", slug: "new" })];
        return Promise.resolve(jsonResponse(projects));
      }
      if (url === PROJECTS_URL && init?.method === "POST") {
        return Promise.resolve(jsonResponse(existingProject({ name: "New", slug: "new" }), { status: 201 }));
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    render(<App />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(PROJECTS_URL));

    // WHEN filling and submitting the form
    await user.type(screen.getByPlaceholderText("name"), "New");
    await user.type(screen.getByPlaceholderText("slug"), "new");
    await user.click(screen.getByRole("button", { name: "create" }));

    // THEN the new project appears, the form is cleared, and the correct payload was sent
    expect(await screen.findByText("New (new)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name")).toHaveValue("");
    expect(screen.getByPlaceholderText("slug")).toHaveValue("");
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(([, callInit]) => callInit?.method === "POST");
    expect(postCall?.[1]?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({ name: "New", slug: "new" });
  });

  it("deletes a project and reloads the list", async () => {
    // GIVEN an existing project and an API that accepts the deletion
    const user = userEvent.setup();
    let projectsListedCount = 0;

    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === PING_URL) return Promise.resolve(jsonResponse({ status: "ok", service: "spike-symfony-api" }));
      if (url === PROJECTS_URL && (!init || init.method === undefined)) {
        projectsListedCount += 1;
        const projects = projectsListedCount === 1 ? [existingProject()] : [];
        return Promise.resolve(jsonResponse(projects));
      }
      if (url === `${PROJECTS_URL}/11111111-1111-1111-1111-111111111111` && init?.method === "DELETE") {
        return Promise.resolve(jsonResponse(null, { status: 204 }));
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    render(<App />);
    expect(await screen.findByText("Nanko (nanko)")).toBeInTheDocument();

    // WHEN clicking delete
    await user.click(screen.getByRole("button", { name: "delete" }));

    // THEN the project is removed from the list
    await waitFor(() => expect(screen.queryByText("Nanko (nanko)")).not.toBeInTheDocument());
  });

  it("shows the server error and keeps the form filled when creation fails", async () => {
    // GIVEN an API that rejects the creation with an error
    const user = userEvent.setup();

    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === PING_URL) return Promise.resolve(jsonResponse({ status: "ok", service: "spike-symfony-api" }));
      if (url === PROJECTS_URL && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ error: "slug already in use" }, { ok: false, status: 409 }));
      }
      if (url === PROJECTS_URL) return Promise.resolve(jsonResponse([]));
      throw new Error(`unexpected fetch: ${url}`);
    });
    render(<App />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(PROJECTS_URL));

    // WHEN filling and submitting the form
    await user.type(screen.getByPlaceholderText("name"), "Dup");
    await user.type(screen.getByPlaceholderText("slug"), "dup");
    await user.click(screen.getByRole("button", { name: "create" }));

    // THEN the error is shown and the form keeps its values
    expect(await screen.findByText("slug already in use")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name")).toHaveValue("Dup");
    expect(screen.getByPlaceholderText("slug")).toHaveValue("dup");
  });
});
