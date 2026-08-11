import { expect, test, type Page } from "@playwright/test";

async function createProject(page: Page, name: string, slug: string): Promise<void> {
  await page.getByTestId("project-name-input").fill(name);
  await page.getByTestId("project-slug-input").fill(slug);
  await page.getByTestId("project-submit").click();
}

function uniqueSlug(): string {
  return `e2e-${test.info().testId}-${Date.now()}`;
}

test("creating a project shows it in the list", async ({ page }) => {
  const slug = uniqueSlug();
  const name = `E2E ${slug}`;

  // GIVEN the app is loaded and the API is reachable
  await page.goto("/");
  await expect(page.getByTestId("ping-status")).toContainText('"status": "ok"');

  // WHEN submitting the project form with a fresh slug
  await createProject(page, name, slug);

  // THEN the new project appears in the list
  await expect(page.locator(`[data-qa="project-item"][data-qa-slug="${slug}"]`)).toHaveCount(1);
});

test("submitting a duplicate slug shows an error and does not create a second entry", async ({ page }) => {
  const slug = uniqueSlug();
  const name = `E2E ${slug}`;
  const projectItem = page.locator(`[data-qa="project-item"][data-qa-slug="${slug}"]`);

  // GIVEN a project already exists with this slug
  await page.goto("/");
  await createProject(page, name, slug);
  await expect(projectItem).toHaveCount(1);

  // WHEN submitting the form again with the same slug
  await createProject(page, name, slug);

  // THEN the duplicate is rejected and the list is not affected
  await expect(page.getByTestId("project-error")).toHaveText("slug already in use");
  await expect(projectItem).toHaveCount(1);
});
