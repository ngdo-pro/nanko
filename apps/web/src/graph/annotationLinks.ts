import { MarkerType, type Connection } from "@xyflow/react";
import type { AnnotationLinkInput, RelationHandle } from "../api";
import type { AnnotationLinkEdge as AnnotationLinkEdgeType } from "./AnnotationLinkEdge";
import { relationAnchorId, relationIdFromAnchorId } from "./relationAnchors";
import type { AnnotationNode, AnnotationNodeLink } from "./toAnnotationNodes";

export const ANNOTATION_LINK_EDGE_PREFIX = "annotation-link-";

export function annotationLinkEdgeId(annotationId: string, linkId: string): string {
  return `${ANNOTATION_LINK_EDGE_PREFIX}${annotationId}-${linkId}`;
}

// One dashed decorative arrow per link entry, fanning out from its note
// (a note→N links now, not the old note→1) — never part of `edges` state,
// never selectable, never a real relation.
export function toAnnotationLinkEdges(annotationNodes: AnnotationNode[]): AnnotationLinkEdgeType[] {
  return annotationNodes.flatMap((node) =>
    node.data.links.map((link) => ({
      id: annotationLinkEdgeId(node.id, link.id),
      type: "annotationLink" as const,
      source: node.id,
      // Exactly one of these is non-null per link (server-enforced XOR).
      target: link.elementId ?? link.targetAnnotationId ?? relationAnchorId(link.relationId as string),
      sourceHandle: link.sourceHandle,
      targetHandle: link.targetHandle,
      selectable: false,
      data: { sourceHandle: link.sourceHandle, targetHandle: link.targetHandle },
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--note-border)" },
    })),
  );
}

// The write-side shape for a PATCH/POST `links` array — drops the client-side
// `id` (it churns on every update, since the backend full-replaces via
// delete+reinsert) and the null target-kind keys the XOR shape doesn't carry.
export function toLinkPayload(links: AnnotationNodeLink[]): AnnotationLinkInput[] {
  return links.map((link) => ({
    ...(link.elementId !== null ? { element_id: link.elementId } : {}),
    ...(link.relationId !== null ? { relation_id: link.relationId } : {}),
    ...(link.targetAnnotationId !== null ? { target_annotation_id: link.targetAnnotationId } : {}),
    source_handle: link.sourceHandle,
    target_handle: link.targetHandle,
  }));
}

export type ConnectionResolution =
  | { kind: "reject" }
  | { kind: "noop" }
  | { kind: "append"; annotationId: string; link: AnnotationLinkInput }
  | { kind: "relation" };

// Classifies a raw react-flow connection drag before CanvasGraph decides what
// to do with it. Kept pure (no state writes, no DOM) so the confirmed
// behaviors — note→element/note→note/note→relation-anchor all append, an
// element/relation-anchor-sourced drag into a note is rejected, and a
// re-dragged existing link is a silent no-op — are unit-testable without a
// mounted <ReactFlow>.
export function resolveAnnotationConnection(connection: Connection, annotationNodes: AnnotationNode[]): ConnectionResolution {
  const { source, target, sourceHandle, targetHandle } = connection;
  const isAnnotation = (id: string) => annotationNodes.some((node) => node.id === id);
  const targetRelationId = relationIdFromAnchorId(target);

  if (!isAnnotation(source)) {
    // Notes only ever point outward — a drag from an element or a relation
    // anchor into a note (or into another relation anchor) is never valid.
    if (isAnnotation(target) || targetRelationId !== null) return { kind: "reject" };
    return { kind: "relation" };
  }

  // Self-link: defense in depth, the backend also rejects this.
  if (source === target) return { kind: "reject" };

  const link: AnnotationLinkInput = targetRelationId
    ? {
        relation_id: targetRelationId,
        source_handle: (sourceHandle ?? null) as RelationHandle | null,
        target_handle: (targetHandle ?? null) as RelationHandle | null,
      }
    : isAnnotation(target)
      ? {
          target_annotation_id: target,
          source_handle: (sourceHandle ?? null) as RelationHandle | null,
          target_handle: (targetHandle ?? null) as RelationHandle | null,
        }
      : {
          element_id: target,
          source_handle: (sourceHandle ?? null) as RelationHandle | null,
          target_handle: (targetHandle ?? null) as RelationHandle | null,
        };

  const existingLinks = annotationNodes.find((node) => node.id === source)?.data.links ?? [];
  const isDuplicate = existingLinks.some(
    (existing) =>
      existing.elementId === (link.element_id ?? null) &&
      existing.relationId === (link.relation_id ?? null) &&
      existing.targetAnnotationId === (link.target_annotation_id ?? null),
  );
  if (isDuplicate) return { kind: "noop" };

  return { kind: "append", annotationId: source, link };
}
