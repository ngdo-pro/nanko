import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAnnotation,
  createElement,
  createMilestone,
  createRelation,
  deleteElement,
  deleteRelation,
  reorderMilestones,
  updateAnnotation,
  updateElement,
  updateMilestone,
  updateRelation,
  upsertElementPosition,
} from "./api";

describe("api", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("upsertElementPosition", () => {
    it("PATCHes the element's position scoped to the given milestone", async () => {
      // GIVEN an element and the currently active milestone
      // WHEN upserting its position
      await upsertElementPosition("element-1", "milestone-1", 42, 7);

      // THEN a PATCH is sent to the element's position endpoint with the milestone and coordinates
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/elements/element-1/position", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_id: "milestone-1", x: 42, y: 7 }),
      });
    });
  });

  describe("createMilestone", () => {
    it("POSTs the new milestone scoped to the given project", async () => {
      // GIVEN a project
      // WHEN creating a milestone with a date
      await createMilestone("project-1", "Launch", "2026-03-01");

      // THEN a POST is sent with the given label and date
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/projects/project-1/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Launch", occurs_on: "2026-03-01" }),
      });
    });

    it("sends a null occurs_on by default", async () => {
      // GIVEN a project
      // WHEN creating a milestone without a date
      await createMilestone("project-1", "Launch");

      // THEN occurs_on is sent as null
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/projects/project-1/milestones",
        expect.objectContaining({ body: JSON.stringify({ label: "Launch", occurs_on: null }) }),
      );
    });
  });

  describe("updateMilestone", () => {
    it("PATCHes the milestone's label and date", async () => {
      // GIVEN an existing milestone
      // WHEN updating its label and date
      await updateMilestone("milestone-1", "Launch v2", "2026-04-15");

      // THEN a PATCH is sent to the milestone's endpoint with the new values
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/milestones/milestone-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Launch v2", occurs_on: "2026-04-15" }),
      });
    });
  });

  describe("reorderMilestones", () => {
    it("PUTs the full ordered id list scoped to the given project", async () => {
      // GIVEN a project with three milestones
      // WHEN reordering them
      await reorderMilestones("project-1", ["c", "a", "b"]);

      // THEN a PUT is sent with the ordered id list
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/projects/project-1/milestones/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_ids: ["c", "a", "b"] }),
      });
    });
  });

  describe("createElement", () => {
    it("POSTs the new element scoped to the given project, milestone, and parent", async () => {
      // GIVEN a project, the active milestone, and a parent element
      // WHEN creating a new container under it, with no archetype specified
      await createElement("project-1", "milestone-1", "container", "system-1", "API");

      // THEN a POST is sent with the given attributes and a null archetype
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/projects/project-1/elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_id: "milestone-1", kind: "container", parent_id: "system-1", name: "API", archetype: null }),
      });
    });

    it("sends a null parent_id for a top-level system", async () => {
      // GIVEN the C1 root (no parent)
      // WHEN creating a new system
      await createElement("project-1", "milestone-1", "system", null, "Booking");

      // THEN parent_id is sent as null
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/projects/project-1/elements",
        expect.objectContaining({
          body: JSON.stringify({ milestone_id: "milestone-1", kind: "system", parent_id: null, name: "Booking", archetype: null }),
        }),
      );
    });

    it("sends the given archetype when creating a container", async () => {
      // GIVEN a project, the active milestone, and a parent system
      // WHEN creating a container tagged as a database
      await createElement("project-1", "milestone-1", "container", "system-1", "Primary DB", "database");

      // THEN the archetype is included in the request
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/projects/project-1/elements",
        expect.objectContaining({
          body: JSON.stringify({ milestone_id: "milestone-1", kind: "container", parent_id: "system-1", name: "Primary DB", archetype: "database" }),
        }),
      );
    });
  });

  describe("updateElement", () => {
    it("PATCHes the element's attributes scoped to the given milestone", async () => {
      // GIVEN an existing element and the active milestone
      // WHEN updating its attributes, including its archetype
      await updateElement("element-1", "milestone-1", "Payments", "Handles payments", "Symfony", "service");

      // THEN a PATCH is sent with the new attributes
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/elements/element-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone_id: "milestone-1",
          name: "Payments",
          description: "Handles payments",
          technology: "Symfony",
          archetype: "service",
        }),
      });
    });
  });

  describe("deleteElement", () => {
    it("DELETEs the element scoped to the given milestone", async () => {
      // GIVEN an existing element and the active milestone
      // WHEN deleting it
      await deleteElement("element-1", "milestone-1");

      // THEN a DELETE is sent carrying the milestone in its body
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/elements/element-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_id: "milestone-1" }),
      });
    });
  });

  describe("createRelation", () => {
    it("POSTs the new relation scoped to the given project and milestone", async () => {
      // GIVEN a project, the active milestone, and two elements
      // WHEN creating a relation between them, with no anchor specified
      await createRelation("project-1", "milestone-1", "element-1", "element-2");

      // THEN a POST is sent with the given endpoints and a null anchor
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/projects/project-1/relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone_id: "milestone-1",
          source_element_id: "element-1",
          target_element_id: "element-2",
          source_handle: null,
          target_handle: null,
        }),
      });
    });

    it("POSTs the given anchor", async () => {
      // GIVEN a project, the active milestone, and two elements
      // WHEN creating a relation anchored from the source's left edge to the target's center
      await createRelation("project-1", "milestone-1", "element-1", "element-2", "left", "center");

      // THEN the POST body carries the given anchor
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/projects/project-1/relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone_id: "milestone-1",
          source_element_id: "element-1",
          target_element_id: "element-2",
          source_handle: "left",
          target_handle: "center",
        }),
      });
    });
  });

  describe("updateRelation", () => {
    it("PATCHes the relation's label, technology, and anchor scoped to the given milestone", async () => {
      // GIVEN an existing relation and the active milestone
      // WHEN updating its label and technology, carrying the current anchor back unchanged
      await updateRelation("relation-1", "milestone-1", "reads/writes", "HTTP", "left", "center");

      // THEN a PATCH is sent with the new attributes and the anchor
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/relations/relation-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone_id: "milestone-1",
          label: "reads/writes",
          technology: "HTTP",
          source_handle: "left",
          target_handle: "center",
        }),
      });
    });
  });

  describe("deleteRelation", () => {
    it("DELETEs the relation scoped to the given milestone", async () => {
      // GIVEN an existing relation and the active milestone
      // WHEN deleting it
      await deleteRelation("relation-1", "milestone-1");

      // THEN a DELETE is sent carrying the milestone in its body
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/relations/relation-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_id: "milestone-1" }),
      });
    });
  });

  describe("createAnnotation", () => {
    it("POSTs the given links", async () => {
      // GIVEN a project and an element
      // WHEN creating a note linked to that element, anchored from the note's right edge to the element's center
      await createAnnotation("project-1", null, 10, 20, "Nicolas", "note", [{ element_id: "element-1", source_handle: "right", target_handle: "center" }]);

      // THEN the POST body carries the given links array
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/projects/project-1/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope_element_id: null,
          x: 10,
          y: 20,
          author_name: "Nicolas",
          body: "note",
          links: [{ element_id: "element-1", source_handle: "right", target_handle: "center" }],
        }),
      });
    });

    it("defaults to no links when none are given", async () => {
      // GIVEN a project, no links (a brand-new unlinked note)
      // WHEN creating it
      await createAnnotation("project-1", null, 10, 20, "Nicolas", "note");

      // THEN the POST body carries an empty links array
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/projects/project-1/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope_element_id: null,
          x: 10,
          y: 20,
          author_name: "Nicolas",
          body: "note",
          links: [],
        }),
      });
    });
  });

  describe("updateAnnotation", () => {
    it("PATCHes the given links", async () => {
      // GIVEN an existing note linked to an element
      // WHEN updating it, carrying its current links back unchanged
      await updateAnnotation("annotation-1", "Nicolas", "note", 10, 20, [{ element_id: "element-1", source_handle: "right", target_handle: "center" }]);

      // THEN the PATCH body carries the given links array
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/annotations/annotation-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: "Nicolas",
          body: "note",
          x: 10,
          y: 20,
          links: [{ element_id: "element-1", source_handle: "right", target_handle: "center" }],
        }),
      });
    });

    it("PATCHes an empty links array to clear every link", async () => {
      // GIVEN an existing note with links
      // WHEN updating it with an empty links array
      await updateAnnotation("annotation-1", "Nicolas", "note", 10, 20, []);

      // THEN the PATCH body carries an empty links array
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/annotations/annotation-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: "Nicolas",
          body: "note",
          x: 10,
          y: 20,
          links: [],
        }),
      });
    });
  });
});
