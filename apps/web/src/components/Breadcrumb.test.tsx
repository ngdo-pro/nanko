import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Breadcrumb, type Crumb } from "./Breadcrumb";

function renderBreadcrumb(items: Crumb[]) {
  return render(
    <MemoryRouter initialEntries={["/current"]}>
      <Routes>
        <Route path="/current" element={<Breadcrumb items={items} />} />
        <Route path="/target" element={<p data-qa="target-screen">target</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Breadcrumb", () => {
  it("renders every crumb's label in order", () => {
    // GIVEN a three-level trail
    renderBreadcrumb([
      { label: "C1", to: "/target" },
      { label: "Booking", to: "/target" },
      { label: "API", to: null },
    ]);

    // WHEN the breadcrumb renders
    const items = screen.getAllByTestId("breadcrumb-item");

    // THEN the crumbs are shown in order
    expect(items.map((item) => item.textContent)).toEqual(["C1", "Booking", "API"]);
  });

  it("renders the current (last) crumb as plain text, not a link", () => {
    // GIVEN a trail whose last crumb has no destination
    renderBreadcrumb([
      { label: "C1", to: "/target" },
      { label: "Booking", to: null },
    ]);

    // WHEN the breadcrumb renders
    // THEN the current crumb is not a link
    const current = screen.getAllByTestId("breadcrumb-item")[1];
    expect(current.tagName).not.toBe("A");
  });

  it("navigates when an ancestor crumb is clicked", async () => {
    // GIVEN a trail with a clickable ancestor
    const user = userEvent.setup();
    renderBreadcrumb([
      { label: "C1", to: "/target" },
      { label: "Booking", to: null },
    ]);

    // WHEN the ancestor crumb is clicked
    await user.click(screen.getByText("C1"));

    // THEN it navigates to that crumb's destination
    expect(await screen.findByTestId("target-screen")).toBeInTheDocument();
  });
});
