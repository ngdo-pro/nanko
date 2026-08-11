import { useEffect, useState } from "react";

const API_URL = "http://localhost:8000";
const MERCURE_URL = "http://localhost:3001/.well-known/mercure";

type PingResponse = {
  status: string;
  service: string;
};

type Project = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

function App() {
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
    <main style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h1>nanko</h1>

      <section>
        <h2>GET /api/ping</h2>
        <pre data-qa="ping-status">{ping ? JSON.stringify(ping, null, 2) : "loading..."}</pre>
      </section>

      <section>
        <h2>Projects</h2>
        <form onSubmit={handleSubmit} data-qa="project-form">
          <input
            data-qa="project-name-input"
            placeholder="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />{" "}
          <input
            data-qa="project-slug-input"
            placeholder="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />{" "}
          <button type="submit" data-qa="project-submit">create</button>
        </form>
        {error && (
          <p data-qa="project-error" style={{ color: "red" }}>
            {error}
          </p>
        )}
        <ul data-qa="project-list">
          {projects?.map((project) => (
            <li key={project.id} data-qa="project-item" data-qa-slug={project.slug}>
              {project.name} ({project.slug})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Mercure events (topic: spike/test)</h2>
        <p>Publier avec: curl -X POST {API_URL}/api/publish</p>
        <ul>
          {events.map((data, i) => (
            <li key={i}>{data}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
