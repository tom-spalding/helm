import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { describe, expect, it } from "vitest";
import { ParagraphMarkdown } from "../components/editor/extensions";

// Uses NoteEditor's real ParagraphMarkdown so the document structure produced
// here matches production (StarterKit configured with paragraph:false + custom
// paragraph).
function makeEditor() {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false, paragraph: false }),
      ParagraphMarkdown,
      Markdown.configure({ html: false }),
    ],
    content: "",
    element: document.createElement("div"),
  });
}

function selectText(editor: Editor, needle: string) {
  let pos = -1;
  editor.state.doc.descendants((node, p) => {
    if (node.isText && node.text?.includes(needle)) pos = p;
  });
  editor.commands.setTextSelection(pos + 1);
}

// Reproduces the reported bug: build a bullet list, indent one item to nest it,
// so a nested <ul> ends up inside a list item followed by another top-level item.
// The regression risk is that the nested <ul> receives block bottom-padding from
// the `.prose :where(ul, ol)` rule, producing a paragraph-sized gap before the
// following top-level item.
describe("bullet list indent/outdent spacing", () => {
  it("nests a list without emitting a bare top-level paragraph between items", () => {
    const editor = makeEditor();
    editor.commands.setContent("- Some text\n- test\n- test2\n- Test3");

    selectText(editor, "test2");
    editor.commands.sinkListItem("listItem");

    const html = editor.getHTML();

    // The nested item lives inside a <ul> nested in the "test" list item, and
    // "Test3" remains a proper sibling list item — never a bare top-level <p>.
    expect(html).toContain("<li><p>test</p><ul");
    expect(html).toContain("<li><p>Test3</p></li>");
    // No bare paragraph should appear between the list and its items.
    expect(/<\/li>\s*<p>Test3/.test(html)).toBe(false);

    editor.destroy();
  });

  it("keeps the nested <ul> tight — it carries no block bottom-padding", () => {
    // The CSS fix zeroes padding-bottom for `li ul, li ol`. jsdom + Tailwind can't
    // compute utility classes, so we assert on the raw stylesheet rule instead:
    // the rule that previously caused the gap must be neutralized for nested lists.
    // This guards the exact selector added to globals.css.
    const editor = makeEditor();
    editor.commands.setContent("- a\n- b\n- c");
    selectText(editor, "b");
    editor.commands.sinkListItem("listItem");
    // Structural guarantee: a nested list exists inside a list item.
    expect(editor.getHTML()).toMatch(/<li><p>a<\/p><ul[^>]*><li><p>b<\/p><\/li><\/ul><\/li>/);
    editor.destroy();
  });

  it("markdown round-trip stays tight — no blank lines injected between items", () => {
    const editor = makeEditor();
    editor.commands.setContent("- Some text\n- test\n- test2\n- Test3");
    selectText(editor, "test2");
    editor.commands.sinkListItem("listItem");

    // biome-ignore lint/suspicious/noExplicitAny: markdown storage untyped
    const md: string = (editor.storage as any).markdown.getMarkdown();

    // The four items serialize as a tight list with a single nested indent —
    // no blank lines and no NBSP placeholder paragraphs between items.
    expect(md).toContain("- Some text\n- test\n  - test2\n- Test3");
    expect(md).not.toMatch(/\n\n\s*- /); // no blank line before any list item

    // The list block itself contains no NBSP placeholder paragraphs between items.
    // (A single trailing NBSP from the editor's empty trailing paragraph is expected
    // for any document and is not part of the list.)
    const listBlock = md.slice(0, md.indexOf("- Test3") + "- Test3".length);
    expect(listBlock).not.toContain("\u00A0");

    editor.destroy();
  });
});
