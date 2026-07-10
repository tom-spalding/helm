import { Editor } from "@tiptap/core";
import { Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

// Inline the extension logic here so the test is self-contained.
// This mirrors what will live in NoteEditor.tsx.
const HeadingKeyboardFix = Extension.create({
  name: "headingKeyboardFix",
  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.parent.type.name !== "heading") return false;
        if ($from.parentOffset !== 0) return false;
        return editor.chain().setParagraph().run();
      },
    };
  },
});

function makeEditor(content: string) {
  return new Editor({
    extensions: [StarterKit, HeadingKeyboardFix],
    content,
    element: document.createElement("div"),
  });
}

describe("HeadingKeyboardFix", () => {
  it("converts a heading to a paragraph when Backspace is pressed at position 0", () => {
    const editor = makeEditor("<h1>Hello</h1>");
    // Place cursor at offset 0 of the heading
    editor.commands.setTextSelection(1);
    editor.commands.keyboardShortcut("Backspace");
    expect(editor.isActive("heading")).toBe(false);
    expect(editor.isActive("paragraph")).toBe(true);
    editor.destroy();
  });

  it("does NOT convert heading to paragraph when Backspace is pressed mid-word", () => {
    const editor = makeEditor("<h1>Hello</h1>");
    // Place cursor at offset 3 (mid-word)
    editor.commands.setTextSelection(4);
    editor.commands.keyboardShortcut("Backspace");
    expect(editor.isActive("heading")).toBe(true);
    editor.destroy();
  });

  it("does nothing when Backspace is pressed at position 0 of a paragraph", () => {
    const editor = makeEditor("<p>Hello</p>");
    editor.commands.setTextSelection(1);
    editor.commands.keyboardShortcut("Backspace");
    expect(editor.isActive("paragraph")).toBe(true);
    editor.destroy();
  });
});
