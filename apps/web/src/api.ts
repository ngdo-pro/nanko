export const API_URL = "http://localhost:8000";
export const MERCURE_URL = "http://localhost:3001/.well-known/mercure";

export type PingResponse = {
  status: string;
  service: string;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type Milestone = {
  id: string;
  project_id: string;
  label: string;
  occurs_on: string | null;
  sort_order: number;
  created_at: string;
};

export type ElementArchetype = "service" | "database" | "queue";

export type GraphElement = {
  id: string;
  project_id: string;
  parent_id: string | null;
  kind: "system" | "container" | "component";
  is_external: boolean;
  archetype: ElementArchetype | null;
  name: string;
  description: string | null;
  technology: string | null;
};

export type RelationHandle = "top" | "right" | "bottom" | "left" | "center";

export type GraphRelation = {
  id: string;
  source_element_id: string;
  target_element_id: string;
  status: string;
  label: string | null;
  technology: string | null;
  realized_at_milestone_id: string | null;
  source_handle: RelationHandle | null;
  target_handle: RelationHandle | null;
};

export type GraphWarning = {
  type: string;
  subject_id: string | null;
  message: string;
};

export type Graph = {
  elements: GraphElement[];
  relations: GraphRelation[];
  positions: Record<string, { x: number; y: number }>;
  warnings: GraphWarning[];
};

export function createMilestone(projectId: string, label: string, occursOn: string | null = null): Promise<Response> {
  return fetch(`${API_URL}/api/projects/${projectId}/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, occurs_on: occursOn }),
  });
}

export function updateMilestone(milestoneId: string, label: string, occursOn: string | null): Promise<Response> {
  return fetch(`${API_URL}/api/milestones/${milestoneId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, occurs_on: occursOn }),
  });
}

// The full ordered id list for the project — not a partial/adjacent-only
// reorder — since sort_order is a single total order the backend reassigns
// wholesale to match exactly what's passed here.
export function reorderMilestones(projectId: string, orderedMilestoneIds: string[]): Promise<Response> {
  return fetch(`${API_URL}/api/projects/${projectId}/milestones/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ milestone_ids: orderedMilestoneIds }),
  });
}

export function upsertElementPosition(elementId: string, milestoneId: string, x: number, y: number): Promise<Response> {
  return fetch(`${API_URL}/api/elements/${elementId}/position`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ milestone_id: milestoneId, x, y }),
  });
}

export function createElement(
  projectId: string,
  milestoneId: string,
  kind: "system" | "container" | "component",
  parentId: string | null,
  name: string,
  archetype: ElementArchetype | null = null,
): Promise<Response> {
  return fetch(`${API_URL}/api/projects/${projectId}/elements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ milestone_id: milestoneId, kind, parent_id: parentId, name, archetype }),
  });
}

// archetype is required (not optional): the backend overwrites it wholesale
// on every update (it isn't versioned), so omitting it here would silently
// clear it — callers must always pass the current value back explicitly.
export function updateElement(
  elementId: string,
  milestoneId: string,
  name: string,
  description: string | null,
  technology: string | null,
  archetype: ElementArchetype | null,
): Promise<Response> {
  return fetch(`${API_URL}/api/elements/${elementId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ milestone_id: milestoneId, name, description, technology, archetype }),
  });
}

export function deleteElement(elementId: string, milestoneId: string): Promise<Response> {
  return fetch(`${API_URL}/api/elements/${elementId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ milestone_id: milestoneId }),
  });
}

export function createRelation(
  projectId: string,
  milestoneId: string,
  sourceElementId: string,
  targetElementId: string,
  sourceHandle: RelationHandle | null = null,
  targetHandle: RelationHandle | null = null,
): Promise<Response> {
  return fetch(`${API_URL}/api/projects/${projectId}/relations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      milestone_id: milestoneId,
      source_element_id: sourceElementId,
      target_element_id: targetElementId,
      source_handle: sourceHandle,
      target_handle: targetHandle,
    }),
  });
}

// sourceHandle/targetHandle are required (not optional), same reasoning as
// archetype in updateElement above: the backend overwrites relation_version
// wholesale on every update, so omitting them here would silently clear the
// anchor from this milestone onward — callers must always pass the current
// value back explicitly.
export function updateRelation(
  relationId: string,
  milestoneId: string,
  label: string | null,
  technology: string | null,
  sourceHandle: RelationHandle | null,
  targetHandle: RelationHandle | null,
): Promise<Response> {
  return fetch(`${API_URL}/api/relations/${relationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ milestone_id: milestoneId, label, technology, source_handle: sourceHandle, target_handle: targetHandle }),
  });
}

export function deleteRelation(relationId: string, milestoneId: string): Promise<Response> {
  return fetch(`${API_URL}/api/relations/${relationId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ milestone_id: milestoneId }),
  });
}

// One arrow from a note to a target it points at — an element, a relation
// (via its synthetic canvas anchor), or another note. `id` is server-assigned
// and churns on every update (the backend full-replaces a note's links by
// delete+reinsert), so it's never sent back in a write payload — see
// AnnotationLinkInput.
export type AnnotationLink = {
  id: string;
  element_id: string | null;
  relation_id: string | null;
  target_annotation_id: string | null;
  source_handle: RelationHandle | null;
  target_handle: RelationHandle | null;
};

// The write-side shape of one link entry: exactly one of the three target
// fields set (XOR, enforced server-side), no `id` (see AnnotationLink above).
export type AnnotationLinkInput = {
  element_id?: string;
  relation_id?: string;
  target_annotation_id?: string;
  source_handle?: RelationHandle | null;
  target_handle?: RelationHandle | null;
};

// A sticky note pinned at a canvas position — kept across milestones (not
// versioned, never part of a diff), optionally pointing at several elements,
// relations, and/or other notes via arrow links.
export type Annotation = {
  id: string;
  project_id: string;
  scope_element_id: string | null;
  x: number;
  y: number;
  author_name: string;
  body: string;
  links: AnnotationLink[];
  created_at: string;
  updated_at: string;
};

export function createAnnotation(
  projectId: string,
  scopeElementId: string | null,
  x: number,
  y: number,
  authorName: string,
  body: string,
  links: AnnotationLinkInput[] = [],
): Promise<Response> {
  return fetch(`${API_URL}/api/projects/${projectId}/annotations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope_element_id: scopeElementId,
      x,
      y,
      author_name: authorName,
      body,
      links,
    }),
  });
}

// Wholesale update (text + position + links) — mirrors updateElement's
// archetype handling: callers always pass every field back, even the ones
// that didn't change. `links` is not defaulted (unlike createAnnotation's,
// where a brand-new note legitimately starts with none) — the backend
// full-replaces the link set on every update, so an omitted array here would
// silently clear every existing link. Pass `[]` explicitly to clear all.
export function updateAnnotation(
  annotationId: string,
  authorName: string,
  body: string,
  x: number,
  y: number,
  links: AnnotationLinkInput[],
): Promise<Response> {
  return fetch(`${API_URL}/api/annotations/${annotationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      author_name: authorName,
      body,
      x,
      y,
      links,
    }),
  });
}

export function deleteAnnotation(annotationId: string): Promise<Response> {
  return fetch(`${API_URL}/api/annotations/${annotationId}`, { method: "DELETE" });
}
