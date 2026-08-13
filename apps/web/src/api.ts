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

export type GraphElement = {
  id: string;
  project_id: string;
  parent_id: string | null;
  kind: "system" | "container" | "component";
  is_external: boolean;
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
