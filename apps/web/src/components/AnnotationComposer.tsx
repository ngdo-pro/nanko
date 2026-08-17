import { useState } from "react";
import { dangerButtonStyle, GHOST_BUTTON_STYLE, INPUT_STYLE, LABEL_STYLE, PRIMARY_BUTTON_STYLE } from "../styles/controls";

// A minimal popover for creating (right-click on empty canvas) or editing
// (click an existing note) a sticky note — "auteur en texte libre" (TECHNICAL_REFERENCE.md):
// no account/login, just a free-text name. Same component for both modes:
// editing is just creation prefilled, plus a delete affordance.
export function AnnotationComposer({
  x,
  y,
  initialAuthorName = "",
  initialBody = "",
  links = [],
  onSave,
  onDelete,
  onClose,
}: {
  x: number;
  y: number;
  initialAuthorName?: string;
  initialBody?: string;
  // One row per target this note currently points an arrow at (element,
  // relation, or another note), each with its own label and unlink handler —
  // empty when there are no links. Drag a connection out of the note on the
  // canvas to add one; this popover can only show/remove them, not create one.
  links?: { label: string; onUnlink: () => void }[];
  onSave: (authorName: string, body: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [authorName, setAuthorName] = useState(initialAuthorName);
  const [body, setBody] = useState(initialBody);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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

      {links.map((link, index) => (
        <div
          key={index}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "var(--text)" }}
        >
          <span data-qa={`annotation-composer-link-${index}`}>
            Linked to <strong style={{ color: "var(--text-h)" }}>{link.label}</strong>
          </span>
          <button
            type="button"
            data-qa={`annotation-composer-unlink-${index}`}
            onClick={link.onUnlink}
            style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px", padding: 0 }}
          >
            Unlink
          </button>
        </div>
      ))}

      <div style={{ display: "flex", gap: "6px", justifyContent: "space-between" }}>
        {onDelete && (
          <button
            type="button"
            data-qa="annotation-composer-delete"
            onClick={() => (confirmingDelete ? onDelete() : setConfirmingDelete(true))}
            onBlur={() => setConfirmingDelete(false)}
            style={{ ...dangerButtonStyle(confirmingDelete), padding: "6px 10px", fontSize: "12px" }}
          >
            {confirmingDelete ? "Confirm delete?" : "Delete"}
          </button>
        )}
        <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
          <button
            type="button"
            data-qa="annotation-composer-cancel"
            onClick={onClose}
            style={{ ...GHOST_BUTTON_STYLE, padding: "6px 10px", fontSize: "12px" }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-qa="annotation-composer-save"
            disabled={authorName.trim() === "" || body.trim() === ""}
            onClick={() => onSave(authorName.trim(), body.trim())}
            style={{ ...PRIMARY_BUTTON_STYLE, padding: "6px 10px", fontSize: "12px" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
