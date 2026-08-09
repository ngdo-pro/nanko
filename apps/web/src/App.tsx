import { useEffect, useState } from "react";

const API_URL = "http://localhost:8000";
const MERCURE_URL = "http://localhost:3001/.well-known/mercure";

type PingResponse = {
  status: string;
  service: string;
};

function App() {
  const [ping, setPing] = useState<PingResponse | null>(null);
  const [events, setEvents] = useState<string[]>([]);

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

  return (
    <main style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h1>nanko</h1>

      <section>
        <h2>GET /api/ping</h2>
        <pre>{ping ? JSON.stringify(ping, null, 2) : "loading..."}</pre>
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
