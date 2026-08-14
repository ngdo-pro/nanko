import { Link } from "react-router-dom";

export type Crumb = {
  label: string;
  // null for the current (deepest) crumb: shown as plain text, not a link.
  to: string | null;
};

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav data-qa="breadcrumb" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
      {items.map((item, index) => (
        <span key={item.to ?? item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {index > 0 && (
            <span aria-hidden="true" style={{ color: "var(--text)", fontSize: "15px" }}>
              ›
            </span>
          )}
          {item.to ? (
            <Link to={item.to} data-qa="breadcrumb-item" style={{ color: "var(--text)", textDecoration: "none" }}>
              {item.label}
            </Link>
          ) : (
            <span data-qa="breadcrumb-item" style={{ color: "var(--text-h)", fontWeight: 600 }}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
