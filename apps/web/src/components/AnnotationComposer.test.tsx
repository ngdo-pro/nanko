import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnnotationComposer } from "./AnnotationComposer";

describe("AnnotationComposer", () => {
  it("shows Add note when creating (no onDelete)", () => {
    // GIVEN a composer with no delete handler (create mode)
    render(<AnnotationComposer x={0} y={0} onSave={() => {}} onClose={() => {}} />);

    // WHEN it renders
    // THEN it reads "Add note"
    expect(screen.getByText("Add note")).toBeInTheDocument();
  });

  it("shows Edit note when a delete handler is given (edit mode)", () => {
    // GIVEN a composer with a delete handler
    render(<AnnotationComposer x={0} y={0} onSave={() => {}} onDelete={() => {}} onClose={() => {}} />);

    // WHEN it renders
    // THEN it reads "Edit note"
    expect(screen.getByText("Edit note")).toBeInTheDocument();
  });

  it("does not show a link row when there is no link", () => {
    // GIVEN a composer with no linked element
    render(<AnnotationComposer x={0} y={0} onSave={() => {}} onClose={() => {}} />);

    // WHEN it renders
    // THEN no link row appears
    expect(screen.queryByTestId("annotation-composer-link")).not.toBeInTheDocument();
  });

  it("shows the linked element's name when linked", () => {
    // GIVEN a composer linked to an element
    render(<AnnotationComposer x={0} y={0} linkedElementLabel="Booking" onSave={() => {}} onClose={() => {}} />);

    // WHEN it renders
    // THEN the link row names the element
    expect(screen.getByTestId("annotation-composer-link")).toHaveTextContent("Linked to Booking");
  });

  it("calls onUnlink when Unlink is clicked", () => {
    // GIVEN a composer linked to an element
    const onUnlink = vi.fn();
    render(<AnnotationComposer x={0} y={0} linkedElementLabel="Booking" onUnlink={onUnlink} onSave={() => {}} onClose={() => {}} />);

    // WHEN clicking Unlink
    fireEvent.click(screen.getByTestId("annotation-composer-unlink"));

    // THEN the handler is called
    expect(onUnlink).toHaveBeenCalled();
  });

  it("calls onSave with the trimmed author and body", () => {
    // GIVEN an empty composer
    const onSave = vi.fn();
    render(<AnnotationComposer x={0} y={0} onSave={onSave} onClose={() => {}} />);

    // WHEN filling in author/body with surrounding whitespace and saving
    fireEvent.change(screen.getByTestId("annotation-composer-author"), { target: { value: "  Nicolas  " } });
    fireEvent.change(screen.getByTestId("annotation-composer-body"), { target: { value: "  a note  " } });
    fireEvent.click(screen.getByTestId("annotation-composer-save"));

    // THEN onSave receives the trimmed values
    expect(onSave).toHaveBeenCalledWith("Nicolas", "a note");
  });
});
