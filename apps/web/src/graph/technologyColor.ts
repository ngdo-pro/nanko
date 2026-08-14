import type { ElementArchetype } from "../api";

// Best-effort brand color per technology, purely a visual aid (e.g. a colored
// stripe on the element card) — not an authoritative or exhaustive registry.
// Keys are lowercase; matched as a substring of the element's `technology`
// field, so "Postgres 15" or "Amazon RDS Postgres" both match "postgres".
const TECHNOLOGY_COLORS: Record<string, string> = {
  postgres: "#336791",
  postgresql: "#336791",
  mysql: "#00758f",
  mariadb: "#003545",
  mongodb: "#47a248",
  redis: "#dc382d",
  sqlite: "#0f80cc",
  cassandra: "#1287b1",
  dynamodb: "#4053d6",
  rabbitmq: "#ff6600",
  kafka: "#7b4b94",
  elasticsearch: "#fec514",
  kubernetes: "#326ce5",
  docker: "#2496ed",
  nginx: "#009639",
  react: "#61dafb",
  vue: "#42b883",
  angular: "#dd0031",
  symfony: "#000000",
  node: "#5fa04e",
  python: "#3776ab",
  django: "#092e20",
  rails: "#cc0000",
};

// Suggestions offered via <datalist> on technology inputs — a display-cased
// convenience list, not tied 1:1 to TECHNOLOGY_COLORS keys (e.g. "postgres"
// is a color-matching alias of "postgresql", not a separate suggestion).
export const KNOWN_TECHNOLOGIES = [
  "PostgreSQL",
  "MySQL",
  "MariaDB",
  "MongoDB",
  "Redis",
  "SQLite",
  "Cassandra",
  "DynamoDB",
  "RabbitMQ",
  "Kafka",
  "Elasticsearch",
  "Kubernetes",
  "Docker",
  "Nginx",
  "React",
  "Vue",
  "Angular",
  "Symfony",
  "Node.js",
  "Python",
  "Django",
  "Ruby on Rails",
];

export function technologyColor(technology: string | null): string | null {
  if (!technology) return null;

  const normalized = technology.trim().toLowerCase();
  if (normalized === "") return null;

  for (const [key, color] of Object.entries(TECHNOLOGY_COLORS)) {
    if (normalized.includes(key)) return color;
  }

  return null;
}

// Only technologies unambiguous enough to infer an archetype from their name
// alone — deliberately not "service" for anything (Node.js, Symfony, etc.
// are used for far too many kinds of container to guess reliably).
const ARCHETYPE_BY_TECHNOLOGY: Record<string, ElementArchetype> = {
  postgres: "database",
  postgresql: "database",
  mysql: "database",
  mariadb: "database",
  mongodb: "database",
  redis: "database",
  sqlite: "database",
  cassandra: "database",
  dynamodb: "database",
  elasticsearch: "database",
  rabbitmq: "queue",
  kafka: "queue",
};

export function suggestedArchetype(technology: string | null): ElementArchetype | null {
  if (!technology) return null;

  const normalized = technology.trim().toLowerCase();
  if (normalized === "") return null;

  for (const [key, archetype] of Object.entries(ARCHETYPE_BY_TECHNOLOGY)) {
    if (normalized.includes(key)) return archetype;
  }

  return null;
}
