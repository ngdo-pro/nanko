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

  it("does not show a link row when there are no links", () => {
    // GIVEN a composer with no links
    render(<AnnotationComposer x={0} y={0} onSave={() => {}} onClose={() => {}} />);

    // WHEN it renders
    // THEN no link row appears
    expect(screen.queryByTestId("annotation-composer-link-0")).not.toBeInTheDocument();
  });

  it("shows the linked target's label when linked", () => {
    // GIVEN a composer linked to one element
    render(<AnnotationComposer x={0} y={0} links={[{ label: "Booking", onUnlink: () => {} }]} onSave={() => {}} onClose={() => {}} />);

    // WHEN it renders
    // THEN the link row names the target
    expect(screen.getByTestId("annotation-composer-link-0")).toHaveTextContent("Linked to Booking");
  });

  it("shows one row per link when linked to several targets", () => {
    // GIVEN a composer linked to two elements and a note
    render(
      <AnnotationComposer
        x={0}
        y={0}
        links={[
          { label: "Booking", onUnlink: () => {} },
          { label: "Payments", onUnlink: () => {} },
          { label: "note by Nicolas", onUnlink: () => {} },
        ]}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );

    // WHEN it renders
    // THEN each link gets its own row, in order
    expect(screen.getByTestId("annotation-composer-link-0")).toHaveTextContent("Linked to Booking");
    expect(screen.getByTestId("annotation-composer-link-1")).toHaveTextContent("Linked to Payments");
    expect(screen.getByTestId("annotation-composer-link-2")).toHaveTextContent("Linked to note by Nicolas");
  });

  it("calls the link's own onUnlink when its Unlink is clicked", () => {
    // GIVEN a composer linked to two elements
    const onUnlinkBooking = vi.fn();
    const onUnlinkPayments = vi.fn();
    render(
      <AnnotationComposer
        x={0}
        y={0}
        links={[
          { label: "Booking", onUnlink: onUnlinkBooking },
          { label: "Payments", onUnlink: onUnlinkPayments },
        ]}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );

    // WHEN clicking the second row's Unlink
    fireEvent.click(screen.getByTestId("annotation-composer-unlink-1"));

    // THEN only that link's handler is called
    expect(onUnlinkPayments).toHaveBeenCalled();
    expect(onUnlinkBooking).not.toHaveBeenCalled();
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
