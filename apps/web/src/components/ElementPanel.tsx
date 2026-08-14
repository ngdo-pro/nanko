import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ElementArchetype, GraphElement } from "../api";
import { KNOWN_TECHNOLOGIES, suggestedArchetype } from "../graph/technologyColor";

const AUTOSAVE_DEBOUNCE_MS = 400;

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

// Archetype only applies to containers/components — a C4 system (C1) is a
// whole system, not a "service" or "database" in its own right.
function supportsArchetype(kind: GraphElement["kind"]): boolean {
  return kind === "container" || kind === "component";
}

export function ElementPanel({
  element,
  onSave,
  onDelete,
  onClose,
}: {
  element: GraphElement;
  onSave: (name: string, description: string | null, technology: string | null, archetype: ElementArchetype | null) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(element.name);
  const [description, setDescription] = useState(element.description ?? "");
  const [technology, setTechnology] = useState(element.technology ?? "");
  const [archetype, setArchetype] = useState<ElementArchetype | null>(element.archetype);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const skipNextSave = useRef(true);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // A different element got selected: reset the form to its own values,
  // and skip the autosave effect that reset would otherwise trigger.
  // Deliberately keyed on `element.id` alone, not the whole `element` object:
  // the parent recreates that object on every render (including ones
  // unrelated to this element, e.g. React Flow's own dimension-observer
  // updates after a node's rendered size changes) — depending on the object
  // reference would re-fire this reset mid-edit and silently discard
  // whatever the user just typed/selected, cancelling its pending autosave.
  useEffect(() => {
    setName(element.name);
    setDescription(element.description ?? "");
    setTechnology(element.technology ?? "");
    setArchetype(element.archetype);
    setConfirmingDelete(false);
    skipNextSave.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.id]);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    if (name.trim() === "") return;

    const timeout = setTimeout(() => {
      onSaveRef.current(name.trim(), description.trim() || null, technology.trim() || null, archetype);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [name, description, technology, archetype]);

  return (
    <div
      data-qa="element-panel"
      style={{
        width: "260px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        borderLeft: "1px solid var(--border)",
        background: "var(--bg)",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <strong style={{ color: "var(--text-h)", fontSize: "13px" }}>Edit element</strong>
        <button
          type="button"
          data-qa="element-panel-close"
          onClick={onClose}
          aria-label="Close"
          style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      <label style={LABEL_STYLE}>
        Name
        <input data-qa="element-panel-name" style={INPUT_STYLE} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label style={LABEL_STYLE}>
        Description
        <textarea
          data-qa="element-panel-description"
          style={{ ...INPUT_STYLE, resize: "vertical", minHeight: "60px" }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label style={LABEL_STYLE}>
        Technology
        <input
          data-qa="element-panel-technology"
          list="element-panel-technology-options"
          style={INPUT_STYLE}
          value={technology}
          onChange={(e) => {
            const value = e.target.value;
            setTechnology(value);

            // Preselect the archetype from a recognized technology (e.g.
            // MongoDB -> Database) — only while nothing has been chosen yet,
            // so it never overrides a deliberate choice, and only for
            // element kinds where the archetype field is even shown.
            if (supportsArchetype(element.kind) && archetype === null) {
              const suggestion = suggestedArchetype(value);
              if (suggestion) setArchetype(suggestion);
            }
          }}
        />
        <datalist id="element-panel-technology-options">
          {KNOWN_TECHNOLOGIES.map((tech) => (
            <option key={tech} value={tech} />
          ))}
        </datalist>
      </label>

      {supportsArchetype(element.kind) && (
        <label style={LABEL_STYLE}>
          Archetype
          <select
            data-qa="element-panel-archetype"
            style={INPUT_STYLE}
            value={archetype ?? ""}
            onChange={(e) => setArchetype(e.target.value === "" ? null : (e.target.value as ElementArchetype))}
          >
            <option value="">Generic</option>
            <option value="service">Service</option>
            <option value="database">Database</option>
            <option value="queue">Queue</option>
          </select>
        </label>
      )}

      <button
        type="button"
        data-qa="element-panel-delete"
        onClick={() => (confirmingDelete ? onDelete() : setConfirmingDelete(true))}
        onBlur={() => setConfirmingDelete(false)}
        style={{
          marginTop: "8px",
          padding: "8px",
          borderRadius: "6px",
          border: `1px solid ${confirmingDelete ? "var(--warning)" : "var(--border)"}`,
          background: confirmingDelete ? "var(--warning-bg)" : "transparent",
          color: confirmingDelete ? "var(--warning)" : "var(--text)",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        {confirmingDelete ? "Confirm delete?" : "Delete"}
      </button>
    </div>
  );
}
