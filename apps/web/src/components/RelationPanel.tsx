import { useEffect, useRef, useState } from "react";
import type { GraphRelation, RelationHandle } from "../api";
import { KNOWN_TECHNOLOGIES } from "../graph/technologyColor";
import { dangerButtonStyle, INPUT_STYLE, LABEL_STYLE } from "../styles/controls";

const AUTOSAVE_DEBOUNCE_MS = 400;

export function RelationPanel({
  relation,
  onSave,
  onDelete,
  onClose,
}: {
  relation: GraphRelation;
  onSave: (label: string | null, technology: string | null, sourceHandle: RelationHandle | null, targetHandle: RelationHandle | null) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(relation.label ?? "");
  const [technology, setTechnology] = useState(relation.technology ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const skipNextSave = useRef(true);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  // Not user-editable here (no anchor picker in this panel yet) — carried
  // forward as-is on every save so autosaving label/technology doesn't
  // silently reset the anchor at this milestone (see updateRelation's comment
  // in api.ts for why the backend requires it to be passed back explicitly).
  const handlesRef = useRef({ source: relation.source_handle, target: relation.target_handle });
  handlesRef.current = { source: relation.source_handle, target: relation.target_handle };

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
      onSaveRef.current(label.trim() || null, technology.trim() || null, handlesRef.current.source, handlesRef.current.target);
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
        style={{ ...dangerButtonStyle(confirmingDelete), marginTop: "8px", padding: "8px", width: "100%" }}
      >
        {confirmingDelete ? "Confirm delete?" : "Delete"}
      </button>
    </div>
  );
}
