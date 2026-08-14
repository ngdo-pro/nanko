import { useState, type CSSProperties } from "react";

const LABEL_STYLE: CSSProperties = { display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "var(--text)" };
const INPUT_STYLE: CSSProperties = {
  font: "inherit",
  fontSize: "13px",
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text-h)",
};

// A minimal popover for creating (right-click on empty canvas) or editing
// (click an existing note) a sticky note — "auteur en texte libre" (PLAN.md):
// no account/login, just a free-text name. Same component for both modes:
// editing is just creation prefilled, plus a delete affordance.
export function AnnotationComposer({
  x,
  y,
  initialAuthorName = "",
  initialBody = "",
  linkedElementLabel = null,
  onSave,
  onDelete,
  onUnlink,
  onClose,
}: {
  x: number;
  y: number;
  initialAuthorName?: string;
  initialBody?: string;
  // The element this note currently points an arrow at, by name — null when
  // there is no link. Drag a connection out of the note on the canvas to set
  // one; this popover can only show/clear it, not create it.
  linkedElementLabel?: string | null;
  onSave: (authorName: string, body: string) => void;
  onDelete?: () => void;
  onUnlink?: () => void;
  onClose: () => void;
}) {
  const [authorName, setAuthorName] = useState(initialAuthorName);
  const [body, setBody] = useState(initialBody);
  const isEditing = onDelete !== undefined;

  return (
    <div
      data-qa="annotation-composer"
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 10,
        width: "220px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        background: "var(--bg)",
        boxShadow: "var(--shadow)",
      }}
    >
      <strong style={{ color: "var(--text-h)", fontSize: "13px" }}>{isEditing ? "Edit note" : "Add note"}</strong>

      <label style={LABEL_STYLE}>
        Author
        <input
          data-qa="annotation-composer-author"
          style={INPUT_STYLE}
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          autoFocus
        />
      </label>

      <label style={LABEL_STYLE}>
        Note
        <textarea
          data-qa="annotation-composer-body"
          style={{ ...INPUT_STYLE, resize: "vertical", minHeight: "50px" }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>

      {linkedElementLabel !== null && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "var(--text)" }}>
          <span data-qa="annotation-composer-link">
            Linked to <strong style={{ color: "var(--text-h)" }}>{linkedElementLabel}</strong>
          </span>
          <button
            type="button"
            data-qa="annotation-composer-unlink"
            onClick={onUnlink}
            style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px", padding: 0 }}
          >
            Unlink
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "6px", justifyContent: "space-between" }}>
        {onDelete && (
          <button
            type="button"
            data-qa="annotation-composer-delete"
            onClick={onDelete}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--warning)", background: "var(--warning-bg)", color: "var(--warning)", cursor: "pointer", fontSize: "12px" }}
          >
            Delete
          </button>
        )}
        <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
          <button
            type="button"
            data-qa="annotation-composer-cancel"
            onClick={onClose}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: "12px" }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-qa="annotation-composer-save"
            disabled={authorName.trim() === "" || body.trim() === ""}
            onClick={() => onSave(authorName.trim(), body.trim())}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid var(--accent)",
              background: "var(--accent-bg)",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
