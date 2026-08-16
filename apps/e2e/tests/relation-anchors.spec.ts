import { expect, test, type Locator, type APIRequestContext, type Page } from "@playwright/test";

const API_URL = "http://localhost:8000";

// Anchor geometry can't be verified in jsdom (getBoundingClientRect returns zeros there, and
// xyflow's own handle-position formula only shows up under real layout) — this is the one place
// it's checked against real Chromium rendering. It caught a real bug during development: a
// center-anchored handle assigned Position.Top made xyflow compute the edge's endpoint at the
// handle's top edge, not its center (RelationEdge.tsx corrects for this explicitly).

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

async function seedRelation(
  request: APIRequestContext,
  projectId: string,
  milestoneId: string,
  sourceId: string,
  targetId: string,
  sourceHandle: string,
  targetHandle: string,
) {
  return (
    await request.post(`${API_URL}/api/projects/${projectId}/relations`, {
      data: {
        milestone_id: milestoneId,
        source_element_id: sourceId,
        target_element_id: targetId,
        source_handle: sourceHandle,
        target_handle: targetHandle,
      },
    })
  ).json();
}

// The node (positioned via CSS transform: translate(x,y) on its .react-flow__node-element
// wrapper) and edge paths live in the same pane, so their raw coordinates are directly
// comparable — unlike Locator.boundingBox(), which returns post-zoom, post-scroll page pixels.
async function flowSpaceBox(node: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const wrapper = node.locator("xpath=ancestor::div[contains(@class, 'react-flow__node-element')]");
  return wrapper.evaluate((el) => {
    const match = getComputedStyle(el).transform.match(/matrix\(([^)]+)\)/);
    if (!match) throw new Error(`unexpected transform "${getComputedStyle(el).transform}"`);
    const [, , , , tx, ty] = match[1].split(",").map(Number);
    const div = el as HTMLElement;
    return { x: tx, y: ty, width: div.offsetWidth, height: div.offsetHeight };
  });
}

// Mirrors xyflow's own getHandlePosition formula (Right -> handle's own right-middle, Left ->
// handle's own left-middle, ...), measured from the live DOM rather than assumed from the node's
// box — a handle's default CSS nudges it a few px outside the node border (e.g. `right: -4px`),
// so "the source's right edge" isn't literally the node's own bounding box edge.
async function handleFlowPosition(
  node: Locator,
  handleId: string,
  handleType: "source" | "target",
  formula: "top" | "right" | "bottom" | "left",
): Promise<{ x: number; y: number }> {
  const wrapper = node.locator("xpath=ancestor::div[contains(@class, 'react-flow__node-element')]");
  return wrapper.evaluate(
    (el, { handleId, handleType, formula }) => {
      const nodeEl = el as HTMLElement;
      const match = getComputedStyle(nodeEl).transform.match(/matrix\(([^)]+)\)/);
      if (!match) throw new Error(`unexpected transform "${getComputedStyle(nodeEl).transform}"`);
      const [, , , , tx, ty] = match[1].split(",").map(Number);
      const zoom = nodeEl.getBoundingClientRect().width / nodeEl.offsetWidth;

      const handleEl = nodeEl.querySelector(`[data-handleid="${handleId}"].${handleType}`) as HTMLElement | null;
      if (!handleEl) throw new Error(`no ${handleType} handle with id "${handleId}" found on this node`);
      const nodeRect = nodeEl.getBoundingClientRect();
      const handleRect = handleEl.getBoundingClientRect();
      const hx = tx + (handleRect.x - nodeRect.x) / zoom;
      const hy = ty + (handleRect.y - nodeRect.y) / zoom;
      const hw = handleRect.width / zoom;
      const hh = handleRect.height / zoom;

      switch (formula) {
        case "top":
          return { x: hx + hw / 2, y: hy };
        case "right":
          return { x: hx + hw, y: hy + hh / 2 };
        case "bottom":
          return { x: hx + hw / 2, y: hy + hh };
        case "left":
          return { x: hx, y: hy + hh / 2 };
      }
    },
    { handleId, handleType, formula },
  );
}

async function pathEndpoints(page: Page, relationId: string): Promise<{ start: { x: number; y: number }; end: { x: number; y: number } }> {
  const edgePath = page.locator(`path[id="${relationId}"]`);
  await expect(edgePath).toHaveCount(1);
  const d = await edgePath.getAttribute("d");
  if (!d) throw new Error("edge path has no d attribute");

  // Straight paths render as "M sx,sy Lex,ey"; bezier paths as "M sx,sy C ... ex,ey" — either
  // way the first two numbers are the start point and the last two are the end point.
  const numbers = d.match(/-?[\d.]+/g)?.map(Number);
  if (!numbers || numbers.length < 4) throw new Error(`could not parse path d="${d}"`);
  return {
    start: { x: numbers[0], y: numbers[1] },
    end: { x: numbers[numbers.length - 2], y: numbers[numbers.length - 1] },
  };
}

test("a center-anchored relation edge starts and ends at the node centers, not their top edges", async ({ page, request }) => {
  const { project, milestone } = await seedProject(request, "relation-anchors-center");
  const source = await seedElement(request, project.id, milestone.id, "Source");
  const target = await seedElement(request, project.id, milestone.id, "Target");
  const relation = await seedRelation(request, project.id, milestone.id, source.id, target.id, "center", "center");

  await page.goto(`/projects/${project.id}`);

  const sourceNode = page.locator('[data-qa="element-node"]', { hasText: "Source" });
  const targetNode = page.locator('[data-qa="element-node"]', { hasText: "Target" });
  await expect(sourceNode).toBeAttached();
  await expect(targetNode).toBeAttached();

  const sourceBox = await flowSpaceBox(sourceNode);
  const targetBox = await flowSpaceBox(targetNode);
  const sourceCenter = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const targetCenter = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };

  const { start, end } = await pathEndpoints(page, relation.id);

  expect(Math.abs(start.x - sourceCenter.x)).toBeLessThan(1);
  expect(Math.abs(start.y - sourceCenter.y)).toBeLessThan(1);
  expect(Math.abs(end.x - targetCenter.x)).toBeLessThan(1);
  expect(Math.abs(end.y - targetCenter.y)).toBeLessThan(1);
});

test("a mixed center-to-edge relation only recenters the center-anchored end", async ({ page, request }) => {
  const { project, milestone } = await seedProject(request, "relation-anchors-mixed");
  const source = await seedElement(request, project.id, milestone.id, "Source");
  const target = await seedElement(request, project.id, milestone.id, "Target");
  const relation = await seedRelation(request, project.id, milestone.id, source.id, target.id, "center", "left");

  await page.goto(`/projects/${project.id}`);

  const sourceNode = page.locator('[data-qa="element-node"]', { hasText: "Source" });
  const targetNode = page.locator('[data-qa="element-node"]', { hasText: "Target" });
  await expect(sourceNode).toBeAttached();
  await expect(targetNode).toBeAttached();

  const sourceBox = await flowSpaceBox(sourceNode);
  const targetBox = await flowSpaceBox(targetNode);
  const sourceCenter = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const targetLeftMid = await handleFlowPosition(targetNode, "left", "target", "left");
  const targetCenter = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };

  const { start, end } = await pathEndpoints(page, relation.id);

  // The center-anchored source end is recentered...
  expect(Math.abs(start.x - sourceCenter.x)).toBeLessThan(1);
  expect(Math.abs(start.y - sourceCenter.y)).toBeLessThan(1);
  // ...but the left-anchored target end uses xyflow's own (correct, un-recentered) handle math,
  // landing on the target's left-middle, clearly short of its horizontal center.
  expect(Math.abs(end.x - targetLeftMid.x)).toBeLessThan(1);
  expect(Math.abs(end.y - targetLeftMid.y)).toBeLessThan(1);
  expect(Math.abs(end.x - targetCenter.x)).toBeGreaterThan(targetBox.width / 4);
});

test("a right-to-left relation attaches to the source's right edge and the target's left edge", async ({ page, request }) => {
  const { project, milestone } = await seedProject(request, "relation-anchors-sides");
  const source = await seedElement(request, project.id, milestone.id, "Source");
  const target = await seedElement(request, project.id, milestone.id, "Target");
  const relation = await seedRelation(request, project.id, milestone.id, source.id, target.id, "right", "left");

  await page.goto(`/projects/${project.id}`);

  const sourceNode = page.locator('[data-qa="element-node"]', { hasText: "Source" });
  const targetNode = page.locator('[data-qa="element-node"]', { hasText: "Target" });
  await expect(sourceNode).toBeAttached();
  await expect(targetNode).toBeAttached();

  const sourceRightMid = await handleFlowPosition(sourceNode, "right", "source", "right");
  const targetLeftMid = await handleFlowPosition(targetNode, "left", "target", "left");

  const { start, end } = await pathEndpoints(page, relation.id);

  // Not "near the node's bottom-center" — the pre-anchor-feature default, and the failure mode
  // a wrong side-to-id mapping in ElementNode's handles would produce.
  expect(Math.abs(start.x - sourceRightMid.x)).toBeLessThan(1);
  expect(Math.abs(start.y - sourceRightMid.y)).toBeLessThan(1);
  expect(Math.abs(end.x - targetLeftMid.x)).toBeLessThan(1);
  expect(Math.abs(end.y - targetLeftMid.y)).toBeLessThan(1);
});
