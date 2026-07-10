import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NoteFrontmatter } from "../../types/note";
import { PropertyPanel } from "./PropertyPanel";

function makeFrontmatter(overrides: Partial<NoteFrontmatter> = {}): NoteFrontmatter {
  return {
    id: "01JPMXYZ123",
    title: "Untitled",
    created: "2026-07-10",
    updated: "2026-07-10",
    tags: [],
    urgent: false,
    important: false,
    state: "Prepare",
    blocked: false,
    ...overrides,
  };
}

describe("PropertyPanel title sync", () => {
  it("fires onTitleInput live on each keystroke, and onChange only on blur", () => {
    const onTitleInput = vi.fn();
    const onChange = vi.fn();
    render(
      <PropertyPanel
        frontmatter={makeFrontmatter()}
        onChange={onChange}
        onTitleInput={onTitleInput}
      />,
    );

    const input = screen.getByPlaceholderText("Untitled");
    fireEvent.change(input, { target: { value: "My" } });
    fireEvent.change(input, { target: { value: "My Untitled" } });

    // Live sync to the store happens on every keystroke...
    expect(onTitleInput).toHaveBeenCalledWith("My");
    expect(onTitleInput).toHaveBeenLastCalledWith("My Untitled");
    // ...while the persisting onChange has NOT fired yet (no blur).
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ title: "My Untitled" });
  });

  it("resyncs the field when the title changes in the store (e.g. renamed from the list)", () => {
    const { rerender } = render(
      <PropertyPanel frontmatter={makeFrontmatter({ title: "Old" })} onChange={vi.fn()} />,
    );
    const input = screen.getByDisplayValue("Old");

    // Same note (same id), title changed externally in the store.
    rerender(<PropertyPanel frontmatter={makeFrontmatter({ title: "New" })} onChange={vi.fn()} />);
    expect(input).toHaveValue("New");
  });
});
