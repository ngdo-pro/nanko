import { Fragment, useEffect, useRef, useState } from "react";
import type { Milestone } from "../api";
import { todayMarkerIndex } from "./todayMarker";

const AUTOSAVE_DEBOUNCE_MS = 400;

const ITEM_STYLE = {
  padding: "5px 10px",
  borderRadius: "999px",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text-h)",
  fontFamily: "inherit",
  fontSize: "13px",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};

const MOVE_BUTTON_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  padding: 0,
  border: "none",
  background: "none",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: "11px",
  lineHeight: 1,
};

export function MilestoneTimeline({
  milestones,
  selectedMilestoneId,
  onSelect,
  onCreate,
  onUpdate,
  onReorder,
  today,
}: {
  milestones: Milestone[];
  selectedMilestoneId: string;
  onSelect: (milestoneId: string) => void;
  onCreate: () => void;
  onUpdate: (milestoneId: string, label: string, occursOn: string | null) => void;
  onReorder: (orderedMilestoneIds: string[]) => void;
  // Overridable only for deterministic tests — defaults to the real date.
  today?: string;
}) {
  const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order);
  const resolvedToday = today ?? new Date().toISOString().slice(0, 10);
  const markerIndex = todayMarkerIndex(sorted, resolvedToday);
  const selectedIndex = sorted.findIndex((milestone) => milestone.id === selectedMilestoneId);
  const selectedMilestone = selectedIndex === -1 ? null : sorted[selectedIndex];

  function moveEarlier(index: number) {
    if (index <= 0) return;
    const next = sorted.map((milestone) => milestone.id);
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onReorder(next);
  }

  function moveLater(index: number) {
    if (index >= sorted.length - 1) return;
    const next = sorted.map((milestone) => milestone.id);
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onReorder(next);
  }

  return (
    <div data-qa="milestone-timeline" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {markerIndex === -1 && <TodayMarker />}
      {sorted.map((milestone, index) => {
        const isSelected = milestone.id === selectedMilestoneId;
        const isPast = milestone.occurs_on !== null && milestone.occurs_on < resolvedToday;

        return (
          <Fragment key={milestone.id}>
            <button
              type="button"
              data-qa="milestone-timeline-item"
              aria-current={isSelected ? "true" : undefined}
              onClick={() => onSelect(milestone.id)}
              style={{
                ...ITEM_STYLE,
                borderColor: isSelected ? "var(--accent)" : "var(--border)",
                color: isSelected ? "var(--accent)" : isPast ? "var(--text)" : "var(--text-h)",
                opacity: isPast && !isSelected ? 0.6 : 1,
              }}
            >
              {milestone.label}
            </button>
            {markerIndex === index && <TodayMarker />}
          </Fragment>
        );
      })}
      <button
        type="button"
        data-qa="milestone-timeline-create"
        onClick={onCreate}
        style={{ ...MOVE_BUTTON_STYLE, width: "24px", height: "24px", fontSize: "15px" }}
        aria-label="New milestone"
        title="New milestone"
      >
        +
      </button>
      {selectedMilestone && (
        <MilestoneEditor
          key={selectedMilestone.id}
          milestone={selectedMilestone}
          canMoveEarlier={selectedIndex > 0}
          canMoveLater={selectedIndex < sorted.length - 1}
          onUpdate={(label, occursOn) => onUpdate(selectedMilestone.id, label, occursOn)}
          onMoveEarlier={() => moveEarlier(selectedIndex)}
          onMoveLater={() => moveLater(selectedIndex)}
        />
      )}
    </div>
  );
}

function MilestoneEditor({
  milestone,
  canMoveEarlier,
  canMoveLater,
  onUpdate,
  onMoveEarlier,
  onMoveLater,
}: {
  milestone: Milestone;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  onUpdate: (label: string, occursOn: string | null) => void;
  onMoveEarlier: () => void;
  onMoveLater: () => void;
}) {
  const [label, setLabel] = useState(milestone.label);
  const [occursOn, setOccursOn] = useState(milestone.occurs_on ?? "");
  const skipNextSave = useRef(true);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // A different milestone got selected: reset the form to its own values,
  // and skip the autosave effect that reset would otherwise trigger.
  // Deliberately keyed on `milestone.id` alone (also enforced by the `key`
  // prop on this component in the parent, which remounts it wholesale on
  // selection change) — see the identical comment in ElementPanel for why
  // depending on the whole object reference is a real bug (the parent
  // recreates that object on unrelated re-renders, silently discarding an
  // in-progress edit).
  useEffect(() => {
    setLabel(milestone.label);
    setOccursOn(milestone.occurs_on ?? "");
    skipNextSave.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestone.id]);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    if (label.trim() === "") return;

    const timeout = setTimeout(() => {
      onUpdateRef.current(label.trim(), occursOn.trim() || null);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [label, occursOn]);

  return (
    <span
      data-qa="milestone-timeline-editor"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        marginLeft: "4px",
        padding: "3px 4px",
        borderRadius: "999px",
        border: "1px dashed var(--border)",
      }}
    >
      <button
        type="button"
        data-qa="milestone-timeline-move-earlier"
        onClick={onMoveEarlier}
        disabled={!canMoveEarlier}
        aria-label="Move earlier"
        title="Move earlier"
        style={{ ...MOVE_BUTTON_STYLE, opacity: canMoveEarlier ? 1 : 0.3, cursor: canMoveEarlier ? "pointer" : "default" }}
      >
        ◀
      </button>
      <input
        data-qa="milestone-timeline-label-input"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        size={Math.max(label.length, 4)}
        style={{
          font: "inherit",
          fontSize: "13px",
          color: "var(--text-h)",
          border: "none",
          background: "none",
          padding: "2px 4px",
          outline: "none",
        }}
      />
      <input
        type="date"
        data-qa="milestone-timeline-date-input"
        value={occursOn}
        onChange={(e) => setOccursOn(e.target.value)}
        style={{ font: "inherit", fontSize: "12px", color: "var(--text)", border: "none", background: "none", outline: "none" }}
      />
      <button
        type="button"
        data-qa="milestone-timeline-move-later"
        onClick={onMoveLater}
        disabled={!canMoveLater}
        aria-label="Move later"
        title="Move later"
        style={{ ...MOVE_BUTTON_STYLE, opacity: canMoveLater ? 1 : 0.3, cursor: canMoveLater ? "pointer" : "default" }}
      >
        ▶
      </button>
    </span>
  );
}

function TodayMarker() {
  return (
    <span
      data-qa="milestone-timeline-today"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "11px",
        color: "var(--accent)",
        fontWeight: 600,
      }}
    >
      <span aria-hidden="true" style={{ width: "1px", height: "16px", background: "var(--accent)" }} />
      today
    </span>
  );
}
