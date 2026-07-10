import { Editor } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { describe, expect, it } from "vitest";
import { lowlight } from "../lib/lowlight";

// Mirrors the code-block branch of handlePaste in NoteEditor.tsx.
// When the selection is inside a codeBlock, paste the plain text verbatim
// (no markdown re-parsing). Otherwise fall through to tiptap-markdown's
// clipboardTextParser. Returns true when it handled the paste.
// biome-ignore lint/suspicious/noExplicitAny: ProseMirror EditorView type not re-exported
function pasteText(view: any, text: string): boolean {
  if (text && view.state.selection.$from.parent.type.name === "codeBlock") {
    view.dispatch(view.state.tr.insertText(text));
    return true;
  }
  let handled = false;
  // biome-ignore lint/suspicious/noExplicitAny: ProseMirror someProp callback is untyped
  view.someProp("clipboardTextParser", (f: any) => {
    const slice = f(text, view.state.selection.$from, false, view);
    if (slice) {
      view.dispatch(view.state.tr.replaceSelection(slice));
      handled = true;
    }
    return !!slice;
  });
  if (!handled) view.dispatch(view.state.tr.insertText(text));
  return true;
}

function makeEditor(content: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    element: document.createElement("div"),
  });
}

describe("code-block paste", () => {
  it("keeps pasted multi-line content inside the code block and preserves newlines", () => {
    // Markdown fenced block => a real codeBlock node containing "seed"
    const editor = makeEditor("```\nseed\n```");
    // Place the cursor at the end of the "seed" text node, inside the code block.
    let codeBlockEnd = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "codeBlock") codeBlockEnd = pos + node.nodeSize - 1;
    });
    editor.commands.setTextSelection(codeBlockEnd);
    expect(editor.isActive("codeBlock")).toBe(true);

    const json = '{\n  "a": 1,\n  "b": [2, 3]\n}';
    pasteText(editor.view, json);

    const { $from } = editor.state.selection;
    // Selection is still inside the code block after paste
    expect($from.parent.type.name).toBe("codeBlock");
    // The exact text — including newlines — lives verbatim inside the code block node
    expect($from.parent.textContent).toBe(`seed${json}`);

    // The pasted braces/newlines did NOT spill into extra top-level nodes.
    let codeBlockCount = 0;
    editor.state.doc.forEach((node) => {
      if (node.type.name === "codeBlock") codeBlockCount += 1;
    });
    expect(codeBlockCount).toBe(1);

    editor.destroy();
  });

  it("re-parses pasted markdown as document structure OUTSIDE a code block", () => {
    const editor = makeEditor("");
    editor.commands.setTextSelection(editor.state.doc.content.size);
    expect(editor.isActive("codeBlock")).toBe(false);

    // Markdown pasted outside a code block still runs through tiptap-markdown's
    // clipboardTextParser, so a heading marker becomes an actual heading node —
    // proving the outside-block path is unchanged.
    pasteText(editor.view, "# Heading");

    let sawHeading = false;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "heading") sawHeading = true;
    });
    expect(sawHeading).toBe(true);
    expect(editor.state.doc.textContent).toContain("Heading");

    editor.destroy();
  });
});
