import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { GraphRelation } from "../api";
import { KNOWN_TECHNOLOGIES } from "../graph/technologyColor";

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

export function RelationPanel({
  relation,
  onSave,
  onDelete,
  onClose,
}: {
  relation: GraphRelation;
  onSave: (label: string | null, technology: string | null) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(relation.label ?? "");
  const [technology, setTechnology] = useState(relation.technology ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const skipNextSave = useRef(true);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // A different relation got selected: reset the form to its own values,
  // and skip the autosave effect that reset would otherwise trigger.
  // Deliberately keyed on `relation.id` alone, not the whole `relation`
  // object — see the same comment in ElementPanel for why depending on the
  // object reference is a real bug (parent recreates it on unrelated
  // re-renders, silently discarding an in-progress edit).
  useEffect(() => {
    setLabel(relation.label ?? "");
    setTechnology(relation.technology ?? "");
    setConfirmingDelete(false);
    skipNextSave.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relation.id]);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      onSaveRef.current(label.trim() || null, technology.trim() || null);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [label, technology]);

  return (
    <div
      data-qa="relation-panel"
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
        <strong style={{ color: "var(--text-h)", fontSize: "13px" }}>Edit relation</strong>
        <button
          type="button"
          data-qa="relation-panel-close"
          onClick={onClose}
          aria-label="Close"
          style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      <label style={LABEL_STYLE}>
        Label
        <input data-qa="relation-panel-label" style={INPUT_STYLE} value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>

      <label style={LABEL_STYLE}>
        Technology
        <input
          data-qa="relation-panel-technology"
          list="relation-panel-technology-options"
          style={INPUT_STYLE}
          value={technology}
          onChange={(e) => setTechnology(e.target.value)}
        />
        <datalist id="relation-panel-technology-options">
          {KNOWN_TECHNOLOGIES.map((tech) => (
            <option key={tech} value={tech} />
          ))}
        </datalist>
      </label>

      <button
        type="button"
        data-qa="relation-panel-delete"
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
