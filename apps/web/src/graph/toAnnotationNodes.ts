import type { Node } from "@xyflow/react";
import type { Annotation } from "../api";

export type AnnotationNodeData = {
  authorName: string;
  body: string;
  elementId: string | null;
  relationId: string | null;
  // Render-time-only fields — never set by toAnnotationNodes, injected by
  // CanvasGraph when merging annotation nodes into the ReactFlow nodes array
  // (not part of the persisted/API shape, so kept out of the pure mapping below).
  isEditing?: boolean;
  onCommitEdit?: (body: string) => void;
  onCancelEdit?: () => void;
};

export type AnnotationNode = Node<AnnotationNodeData, "annotation">;

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
      elementId: annotation.element_id,
      relationId: annotation.relation_id,
    },
  }));
}
