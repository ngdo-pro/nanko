import type { Node } from "@xyflow/react";
import type { Annotation, AnnotationLink, RelationHandle } from "../api";

// The render-time shape of one link (camelCase, handles defaulted) — see
// resolveAnnotationLinkHandles below for why the handles are never null here.
export type AnnotationNodeLink = {
  id: string;
  elementId: string | null;
  relationId: string | null;
  targetAnnotationId: string | null;
  sourceHandle: RelationHandle;
  targetHandle: RelationHandle;
};

export type AnnotationNodeData = {
  authorName: string;
  body: string;
  links: AnnotationNodeLink[];
  // Render-time-only fields — never set by toAnnotationNodes, injected by
  // CanvasGraph when merging annotation nodes into the ReactFlow nodes array
  // (not part of the persisted/API shape, so kept out of the pure mapping below).
  isEditing?: boolean;
  onCommitEdit?: (body: string) => void;
  onCancelEdit?: () => void;
};

export type AnnotationNode = Node<AnnotationNodeData, "annotation">;

// Existing note-to-element links predate the anchor feature and carry no handle
// in the database — default to the bottom/top pair the decorative arrow always
// rendered with, so no existing note re-anchors visually on deploy. Runs per
// link now (each link can be anchored independently).
export function resolveAnnotationLinkHandles(link: Pick<AnnotationLink, "source_handle" | "target_handle">): {
  sourceHandle: RelationHandle;
  targetHandle: RelationHandle;
} {
  return {
    sourceHandle: link.source_handle ?? "bottom",
    targetHandle: link.target_handle ?? "top",
  };
}

// Pure mapping from the API shape to React Flow nodes — kept separate from
// ElementNode/toFlowGraph's element/relation graph entirely: a post-it isn't
// part of the resolved graph, it's independent board metadata, never diffed.
export function toAnnotationNodes(annotations: Annotation[]): AnnotationNode[] {
  return annotations.map((annotation) => ({
    id: annotation.id,
    type: "annotation",
    position: { x: annotation.x, y: annotation.y },
    data: {
      authorName: annotation.author_name,
      body: annotation.body,
      links: annotation.links.map((link) => ({
        id: link.id,
        elementId: link.element_id,
        relationId: link.relation_id,
        targetAnnotationId: link.target_annotation_id,
        ...resolveAnnotationLinkHandles(link),
      })),
    },
  }));
}
