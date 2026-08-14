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

export type GraphRelation = {
  id: string;
  source_element_id: string;
  target_element_id: string;
  status: string;
  label: string | null;
  technology: string | null;
  realized_at_milestone_id: string | null;
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
): Promise<Response> {
  return fetch(`${API_URL}/api/projects/${projectId}/relations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ milestone_id: milestoneId, source_element_id: sourceElementId, target_element_id: targetElementId }),
  });
}

export function updateRelation(
  relationId: string,
  milestoneId: string,
  label: string | null,
  technology: string | null,
): Promise<Response> {
  return fetch(`${API_URL}/api/relations/${relationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ milestone_id: milestoneId, label, technology }),
  });
}

export function deleteRelation(relationId: string, milestoneId: string): Promise<Response> {
  return fetch(`${API_URL}/api/relations/${relationId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ milestone_id: milestoneId }),
  });
}

// A sticky note pinned at a canvas position — kept across milestones (not
// versioned, never part of a diff), optionally pointing at one element or
// relation via an arrow link.
export type Annotation = {
  id: string;
  project_id: string;
  element_id: string | null;
  relation_id: string | null;
  scope_element_id: string | null;
  x: number;
  y: number;
  author_name: string;
  body: string;
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
  elementId: string | null = null,
): Promise<Response> {
  return fetch(`${API_URL}/api/projects/${projectId}/annotations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope_element_id: scopeElementId, x, y, author_name: authorName, body, element_id: elementId }),
  });
}

// Wholesale update (text + position + link) — mirrors updateElement's
// archetype handling: callers always pass every field back, even the ones
// that didn't change. Passing null for both elementId/relationId clears any link.
export function updateAnnotation(
  annotationId: string,
  authorName: string,
  body: string,
  x: number,
  y: number,
  elementId: string | null = null,
  relationId: string | null = null,
): Promise<Response> {
  return fetch(`${API_URL}/api/annotations/${annotationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author_name: authorName, body, x, y, element_id: elementId, relation_id: relationId }),
  });
}

export function deleteAnnotation(annotationId: string): Promise<Response> {
  return fetch(`${API_URL}/api/annotations/${annotationId}`, { method: "DELETE" });
}
