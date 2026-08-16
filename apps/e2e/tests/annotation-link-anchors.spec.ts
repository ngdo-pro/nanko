import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

const API_URL = "http://localhost:8000";

// The note-to-element decorative arrow shares the same anchor feature as relations
// (relation-anchors.spec.ts) but is a separate code path (AnnotationLinkEdge, not
// RelationEdge) — it was shipped with the anchor UI wired up but the backend/rendering
// never updated to carry the chosen handle, so every note arrow silently stayed
// pinned to bottom/top regardless of which edge the user actually dragged from.
// This is the one place that regression is caught: it needs real layout, not jsdom.

async function seedProject(request: APIRequestContext, name: string) {
  const slug = `e2e-${name}-${Date.now()}`;
  const project = await (await request.post(`${API_URL}/api/projects`, { data: { name, slug } })).json();
  const milestone = await (
    await request.post(`${API_URL}/api/projects/${project.id}/milestones`, { data: { label: "Launch" } })
  ).json();
  return { project, milestone };
}

async function seedElement(request: APIRequestContext, projectId: string, milestoneId: string, name: string) {
  return (
    await request.post(`${API_URL}/api/projects/${projectId}/elements`, {
      data: { milestone_id: milestoneId, kind: "system", name },
    })
  ).json();
}

async function seedAnnotation(
  request: APIRequestContext,
  projectId: string,
  elementId: string,
  sourceHandle: string,
  targetHandle: string,
) {
  return (
    await request.post(`${API_URL}/api/projects/${projectId}/annotations`, {
      data: {
        x: -200,
        y: 0,
        author_name: "Nicolas",
        body: "note",
        links: [{ element_id: elementId, source_handle: sourceHandle, target_handle: targetHandle }],
      },
    })
  ).json();
}

// Matches on the specific `react-flow__node-{type}` class, not the generic `react-flow__node` —
// that generic substring also matches the outer `.react-flow__nodes` (plural) container ancestor,
// which would make the xpath resolve to two elements and fail in strict mode.
async function flowSpaceBox(node: Locator, nodeType: "element" | "annotation"): Promise<{ x: number; y: number; width: number; height: number }> {
  const wrapper = node.locator(`xpath=ancestor::div[contains(@class, 'react-flow__node-${nodeType}')]`);
  return wrapper.evaluate((el) => {
    const match = getComputedStyle(el).transform.match(/matrix\(([^)]+)\)/);
    if (!match) throw new Error(`unexpected transform "${getComputedStyle(el).transform}"`);
    const [, , , , tx, ty] = match[1].split(",").map(Number);
    const div = el as HTMLElement;
    return { x: tx, y: ty, width: div.offsetWidth, height: div.offsetHeight };
  });
}

async function pathEndpoints(page: Page, edgeId: string): Promise<{ start: { x: number; y: number }; end: { x: number; y: number } }> {
  const edgePath = page.locator(`path[id="${edgeId}"]`);
  await expect(edgePath).toHaveCount(1);
  const d = await edgePath.getAttribute("d");
  if (!d) throw new Error("edge path has no d attribute");

  const numbers = d.match(/-?[\d.]+/g)?.map(Number);
  if (!numbers || numbers.length < 4) throw new Error(`could not parse path d="${d}"`);
  return {
    start: { x: numbers[0], y: numbers[1] },
    end: { x: numbers[numbers.length - 2], y: numbers[numbers.length - 1] },
  };
}

test("a center-anchored note-to-element arrow starts and ends at the node centers", async ({ page, request }) => {
  const { project, milestone } = await seedProject(request, "annotation-anchors-center");
  const target = await seedElement(request, project.id, milestone.id, "Target");
  const annotation = await seedAnnotation(request, project.id, target.id, "center", "center");

  await page.goto(`/projects/${project.id}`);

  const noteNode = page.locator('[data-qa="annotation-node"]');
  const targetNode = page.locator('[data-qa="element-node"]', { hasText: "Target" });
  await expect(noteNode).toBeAttached();
  await expect(targetNode).toBeAttached();

  const noteBox = await flowSpaceBox(noteNode, "annotation");
  const targetBox = await flowSpaceBox(targetNode, "element");
  const noteCenter = { x: noteBox.x + noteBox.width / 2, y: noteBox.y + noteBox.height / 2 };
  const targetCenter = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };

  const { start, end } = await pathEndpoints(page, `annotation-link-${annotation.id}-${annotation.links[0].id}`);

  expect(Math.abs(start.x - noteCenter.x)).toBeLessThan(1);
  expect(Math.abs(start.y - noteCenter.y)).toBeLessThan(1);
  expect(Math.abs(end.x - targetCenter.x)).toBeLessThan(1);
  expect(Math.abs(end.y - targetCenter.y)).toBeLessThan(1);
});

test("a right-anchored note-to-element arrow does not fall back to the note's bottom edge", async ({ page, request }) => {
  const { project, milestone } = await seedProject(request, "annotation-anchors-right");
  const target = await seedElement(request, project.id, milestone.id, "Target");
  const annotation = await seedAnnotation(request, project.id, target.id, "right", "left");

  await page.goto(`/projects/${project.id}`);

  const noteNode = page.locator('[data-qa="annotation-node"]');
  await expect(noteNode).toBeAttached();
  const noteBox = await flowSpaceBox(noteNode, "annotation");
  const noteBottomMid = { x: noteBox.x + noteBox.width / 2, y: noteBox.y + noteBox.height };

  const { start } = await pathEndpoints(page, `annotation-link-${annotation.id}-${annotation.links[0].id}`);

  // The bug this guards against: linkEdges hard-coded sourceHandle to "bottom" regardless
  // of the handle the user actually dragged from — so a "right" anchor would silently
  // render from the bottom-center instead, at noteBottomMid.
  expect(Math.abs(start.x - noteBottomMid.x)).toBeGreaterThan(noteBox.width / 4);
});
