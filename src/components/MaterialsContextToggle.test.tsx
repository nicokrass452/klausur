import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MaterialsContextToggle } from "./MaterialsContextToggle";

describe("MaterialsContextToggle", () => {
  it("renders the toggle with the default German label", () => {
    render(<MaterialsContextToggle checked={false} onChange={() => {}} />);
    expect(screen.getByText("Hochgeladene Materialien nutzen")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("reflects the checked state", () => {
    render(<MaterialsContextToggle checked={true} onChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("calls onChange with the new value when clicked", () => {
    const onChange = vi.fn();
    render(<MaterialsContextToggle checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("disables the input when disabled prop is set", () => {
    render(<MaterialsContextToggle checked={false} onChange={() => {}} disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("does not show the usage badge when materialContext is missing or not used", () => {
    const { rerender } = render(<MaterialsContextToggle checked={false} onChange={() => {}} />);
    expect(screen.queryByText(/Chunks aus deinen Materialien/)).not.toBeInTheDocument();

    rerender(
      <MaterialsContextToggle
        checked={false}
        onChange={() => {}}
        materialContext={{ used: false, chunkCount: 0, examScoped: false }}
      />
    );
    expect(screen.queryByText(/Chunks aus deinen Materialien/)).not.toBeInTheDocument();
  });

  it("shows the usage badge with chunk count when materialContext.used is true", () => {
    render(
      <MaterialsContextToggle
        checked={true}
        onChange={() => {}}
        materialContext={{ used: true, chunkCount: 3, examScoped: false }}
      />
    );
    expect(screen.getByText(/3 Chunks aus deinen Materialien/)).toBeInTheDocument();
    expect(screen.queryByText(/diese Klausur/)).not.toBeInTheDocument();
  });

  it("shows the exam-scoped suffix when examScoped is true", () => {
    render(
      <MaterialsContextToggle
        checked={true}
        onChange={() => {}}
        materialContext={{ used: true, chunkCount: 1, examScoped: true }}
      />
    );
    // Singular "Chunk" for count === 1.
    expect(screen.getByText(/1 Chunk aus deinen Materialien \(diese Klausur\)/)).toBeInTheDocument();
  });
});
