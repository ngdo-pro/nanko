import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, MERCURE_URL, type PingResponse, type Project } from "../api";
import { dangerButtonStyle, ERROR_TEXT_STYLE, INPUT_STYLE, PRIMARY_BUTTON_STYLE } from "../styles/controls";

function ProjectListScreen() {
  const [ping, setPing] = useState<PingResponse | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/ping`)
      .then((res) => res.json())
      .then(setPing)
      .catch((err) => setPing({ status: "error", service: String(err) }));
  }, []);

  useEffect(() => {
    const url = new URL(MERCURE_URL);
    url.searchParams.append("topic", "spike/test");
    const source = new EventSource(url);
    source.onmessage = (event) => {
      setEvents((prev) => [...prev, event.data]);
    };
    return () => source.close();
  }, []);

  function loadProjects() {
    fetch(`${API_URL}/api/projects`)
      .then((res) => res.json())
      .then(setProjects)
      .catch((err) => setError(String(err)));
  }

  useEffect(loadProjects, []);

  async function handleDelete(id: string) {
    setError(null);

    const response = await fetch(`${API_URL}/api/projects/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? `Request failed with status ${response.status}`);
      return;
    }

    loadProjects();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`${API_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? `Request failed with status ${response.status}`);
      return;
    }

    setName("");
    setSlug("");
    loadProjects();
  }

  return (
    <main style={{ fontFamily: "monospace", minHeight: "100vh", boxSizing: "border-box" }}>
      <header style={{ display: "flex", alignItems: "center", height: "48px", padding: "0 24px", borderBottom: "1px solid var(--border)" }}>
        <h1>nanko</h1>
      </header>

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: "32px" }}>
        <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h2>Projects</h2>

          <form onSubmit={handleSubmit} data-qa="project-form" style={{ display: "flex", gap: "8px" }}>
            <input
              data-qa="project-name-input"
              placeholder="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ ...INPUT_STYLE, flex: 1 }}
            />
            <input
              data-qa="project-slug-input"
              placeholder="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              style={{ ...INPUT_STYLE, flex: 1 }}
            />
            <button type="submit" data-qa="project-submit" style={PRIMARY_BUTTON_STYLE}>
              create
            </button>
          </form>

          {error && (
            <p data-qa="project-error" style={ERROR_TEXT_STYLE}>
              {error}
            </p>
          )}

          {projects === null ? (
            <p style={{ fontSize: "13px", color: "var(--text)", margin: 0 }}>loading...</p>
          ) : projects.length === 0 ? (
            <p data-qa="project-list-empty" style={{ fontSize: "13px", color: "var(--text)", margin: 0 }}>
              No projects yet — create the first one above.
            </p>
          ) : (
            <ul data-qa="project-list" style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
              {projects.map((project) => (
                <ProjectRow key={project.id} project={project} onDelete={() => handleDelete(project.id)} />
              ))}
            </ul>
          )}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "var(--text)" }}>API health (GET /api/ping)</span>
          <pre
            data-qa="ping-status"
            style={{ margin: 0, padding: "8px 10px", borderRadius: "6px", background: "var(--code-bg)", fontSize: "12px" }}
          >
            {ping ? JSON.stringify(ping, null, 2) : "loading..."}
          </pre>
        </section>

        {/* Pure debug output (raw Mercure event feed) — collapsed by default so it
            doesn't compete for attention with the actual product surface above. */}
        <details style={{ fontSize: "12px", color: "var(--text)" }}>
          <summary style={{ cursor: "pointer", userSelect: "none", color: "var(--text-h)" }}>Mercure events (topic: spike/test)</summary>
          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <p style={{ margin: 0 }}>
              Publier avec: curl -X POST {API_URL}/api/publish
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {events.map((data, i) => (
                <li key={i}>{data}</li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </main>
  );
}

function ProjectRow({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <li
      data-qa="project-item"
      data-qa-slug={project.slug}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1px solid var(--border)",
      }}
    >
      <Link to={`/projects/${project.id}`} style={{ color: "var(--text-h)", textDecoration: "none" }}>
        {project.name} ({project.slug})
      </Link>
      <button
        type="button"
        data-qa="project-delete"
        onClick={() => (confirmingDelete ? onDelete() : setConfirmingDelete(true))}
        onBlur={() => setConfirmingDelete(false)}
        style={{ ...dangerButtonStyle(confirmingDelete), padding: "4px 10px", fontSize: "12px" }}
      >
        {confirmingDelete ? "Confirm delete?" : "delete"}
      </button>
    </li>
  );
}

export default ProjectListScreen;
