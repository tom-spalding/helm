import { Editor } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { CodeBlockGapCursor } from "../components/editor/extensions";
import { lowlight } from "../lib/lowlight";

function makeEditor() {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      CodeBlockGapCursor,
    ],
    content: {
      type: "doc",
      content: [
        { type: "codeBlock", content: [{ type: "text", text: "first" }] },
        { type: "codeBlock", content: [{ type: "text", text: "second" }] },
      ],
    },
    element: document.createElement("div"),
  });
}

function nodeTypes(editor: Editor): string[] {
  const types: string[] = [];
  editor.state.doc.forEach((node) => {
    types.push(node.type.name);
  });
  return types;
}

// Dispatch the key through the view's real keydown handler (as the browser does),
// so the extension's full transaction — including the selection it sets — is applied.
// TipTap's editor.commands.keyboardShortcut only replays doc-changing steps and drops
// the custom selection, which would not reflect real editor behavior.
function pressKey(editor: Editor, key: "ArrowDown" | "ArrowUp") {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  editor.view.someProp("handleKeyDown", (f) => f(editor.view, event));
}

describe("CodeBlockGapCursor", () => {
  it("inserts a paragraph between two adjacent code blocks on ArrowDown at end of first", () => {
    const editor = makeEditor();
    // "first" occupies positions 1..6; end of first code block is at pos 6.
    editor.commands.setTextSelection(6);
    pressKey(editor, "ArrowDown");

    // A paragraph now sits between the two code blocks. (StarterKit's TrailingNode
    // also keeps a paragraph at the very end of the doc — ignore that here.)
    expect(nodeTypes(editor).slice(0, 3)).toEqual(["codeBlock", "paragraph", "codeBlock"]);
    // Cursor should sit inside the new between-blocks paragraph — typing lands there.
    editor.commands.insertContent("hello");
    expect(editor.state.doc.child(1).type.name).toBe("paragraph");
    expect(editor.state.doc.child(1).textContent).toBe("hello");
    editor.destroy();
  });

  it("inserts a paragraph before the first code block on ArrowUp at its start", () => {
    const editor = makeEditor();
    editor.commands.setTextSelection(1); // start of first code block
    pressKey(editor, "ArrowUp");

    expect(nodeTypes(editor).slice(0, 3)).toEqual(["paragraph", "codeBlock", "codeBlock"]);
    editor.destroy();
  });

  it("does not fire on ArrowDown when the following sibling is a paragraph", () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        CodeBlockLowlight.configure({ lowlight }),
        CodeBlockGapCursor,
      ],
      content: {
        type: "doc",
        content: [
          { type: "codeBlock", content: [{ type: "text", text: "code" }] },
          { type: "paragraph", content: [{ type: "text", text: "text" }] },
        ],
      },
      element: document.createElement("div"),
    });
    editor.commands.setTextSelection(5); // end of code block
    pressKey(editor, "ArrowDown");
    // No new paragraph inserted — default navigation handles it.
    expect(nodeTypes(editor)).toEqual(["codeBlock", "paragraph"]);
    editor.destroy();
  });
});
