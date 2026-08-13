import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Toolbar } from "./Toolbar";

function renderToolbar() {
  return render(
    <MemoryRouter initialEntries={["/projects/11111111-1111-1111-1111-111111111111"]}>
      <Routes>
        <Route path="/" element={<p data-qa="home-screen">home</p>} />
        <Route path="/projects/:projectId" element={<Toolbar />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Toolbar", () => {
  it("navigates to the home screen when the home button is clicked", async () => {
    // GIVEN the toolbar rendered on a project screen
    const user = userEvent.setup();
    renderToolbar();

    // WHEN the home button is clicked
    await user.click(screen.getByTestId("toolbar-home"));

    // THEN the home screen is shown
    expect(await screen.findByTestId("home-screen")).toBeInTheDocument();
  });
});
