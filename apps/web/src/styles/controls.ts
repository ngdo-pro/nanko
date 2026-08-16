import type { CSSProperties } from "react";

// Shared visual language for form controls and buttons across panels
// (ElementPanel, RelationPanel, AnnotationComposer, ProjectListScreen,
// CompareScreen, ...) so a style tweak lands everywhere at once instead of
// drifting file by file.

export const LABEL_STYLE: CSSProperties = { display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "var(--text)" };

export const INPUT_STYLE: CSSProperties = {
  font: "inherit",
  fontSize: "13px",
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text-h)",
};

// Compact variant for inline toolbar controls (e.g. the From/To selects on
// CompareScreen), where the roomier panel padding would be too tall.
export const COMPACT_INPUT_STYLE: CSSProperties = { ...INPUT_STYLE, padding: "4px 6px" };

const BUTTON_BASE: CSSProperties = {
  font: "inherit",
  fontSize: "13px",
  padding: "6px 10px",
  borderRadius: "6px",
  cursor: "pointer",
};

// The accent-colored call-to-action — the single most important action in a
// given context (save a note, create the first milestone).
export const PRIMARY_BUTTON_STYLE: CSSProperties = {
  ...BUTTON_BASE,
  border: "1px solid var(--accent)",
  background: "var(--accent-bg)",
  color: "var(--accent)",
};

// The default, low-emphasis action (create element, submit a form).
export const SECONDARY_BUTTON_STYLE: CSSProperties = {
  ...BUTTON_BASE,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text-h)",
};

// A button that reads as plain text until hovered/focused — cancel, close.
export const GHOST_BUTTON_STYLE: CSSProperties = {
  ...BUTTON_BASE,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
};

// Two-step delete pattern used throughout the app (ElementPanel,
// RelationPanel, AnnotationComposer, ProjectListScreen): the first click
// arms the button, a second confirms. `active` is that armed state.
export function dangerButtonStyle(active: boolean): CSSProperties {
  return {
    ...BUTTON_BASE,
    border: `1px solid ${active ? "var(--warning)" : "var(--border)"}`,
    background: active ? "var(--warning-bg)" : "transparent",
    color: active ? "var(--warning)" : "var(--text)",
  };
}

export function toggleButtonStyle(active: boolean): CSSProperties {
  return {
    ...BUTTON_BASE,
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    background: active ? "var(--accent-bg)" : "var(--bg)",
    color: active ? "var(--accent)" : "var(--text-h)",
  };
}

export const ERROR_TEXT_STYLE: CSSProperties = { color: "var(--error)", fontSize: "13px" };

// Centered placeholder for a screen-level loading/empty/error state — the
// bare <p> these replace used to sit flush under the toolbar with no
// breathing room; every such state now gets the same treatment.
export const STATE_CONTAINER_STYLE: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  padding: "24px",
  textAlign: "center",
  color: "var(--text)",
  fontSize: "14px",
};
