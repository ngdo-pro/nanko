import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Toolbar({ children }: { children?: ReactNode }) {
  return (
    <header
      data-qa="toolbar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        height: "48px",
        padding: "0 0.5rem",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      <Link
        to="/"
        data-qa="toolbar-home"
        aria-label="Home"
        title="Home"
        className="toolbar-icon-button"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          borderRadius: "6px",
          color: "var(--text-h)",
        }}
      >
        <HomeIcon />
      </Link>
      {children}
    </header>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}
