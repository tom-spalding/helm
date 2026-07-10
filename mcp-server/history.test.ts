import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { listNoteHistory, snapshotNoteFile } from "./history";

let vault: string;
let notePath: string;

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), "helm-mcp-history-"));
  notePath = path.join(vault, "note.md");
});

describe("snapshotNoteFile", () => {
  it("copies the current content into .helm-history/<id>/", () => {
    fs.writeFileSync(notePath, "version one");
    snapshotNoteFile(vault, "01ABC", notePath, 0, 50);

    const entries = listNoteHistory(vault, "01ABC");
    expect(entries).toHaveLength(1);
    expect(fs.readFileSync(entries[0].path, "utf-8")).toBe("version one");
    expect(entries[0].path).toContain(path.join(".helm-history", "01ABC"));
  });

  it("is a no-op when the note file does not exist", () => {
    snapshotNoteFile(vault, "01ABC", notePath, 0, 50);
    expect(listNoteHistory(vault, "01ABC")).toHaveLength(0);
  });

  it("coalesces snapshots younger than minAgeMs", () => {
    fs.writeFileSync(notePath, "v1");
    snapshotNoteFile(vault, "01ABC", notePath, 300_000, 50);
    fs.writeFileSync(notePath, "v2");
    snapshotNoteFile(vault, "01ABC", notePath, 300_000, 50);
    expect(listNoteHistory(vault, "01ABC")).toHaveLength(1);
  });

  it("minAgeMs of 0 always snapshots (used before deletes/restores)", () => {
    fs.writeFileSync(notePath, "v1");
    snapshotNoteFile(vault, "01ABC", notePath, 0, 50);
    fs.writeFileSync(notePath, "v2");
    snapshotNoteFile(vault, "01ABC", notePath, 0, 50);
    expect(listNoteHistory(vault, "01ABC")).toHaveLength(2);
  });

  it("prunes to maxKeep newest snapshots", () => {
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(notePath, `v${i}`);
      snapshotNoteFile(vault, "01ABC", notePath, 0, 3);
    }
    const entries = listNoteHistory(vault, "01ABC");
    expect(entries).toHaveLength(3);
    expect(fs.readFileSync(entries[0].path, "utf-8")).toBe("v4");
  });

  it("rejects non-alphanumeric note ids", () => {
    fs.writeFileSync(notePath, "x");
    expect(() => snapshotNoteFile(vault, "../evil", notePath, 0, 50)).toThrow();
  });
});

describe("listNoteHistory", () => {
  it("returns entries newest first", () => {
    fs.writeFileSync(notePath, "a");
    snapshotNoteFile(vault, "01ABC", notePath, 0, 50);
    fs.writeFileSync(notePath, "b");
    snapshotNoteFile(vault, "01ABC", notePath, 0, 50);

    const entries = listNoteHistory(vault, "01ABC");
    expect(entries).toHaveLength(2);
    expect(entries[0].tsMs).toBeGreaterThan(entries[1].tsMs);
    expect(fs.readFileSync(entries[0].path, "utf-8")).toBe("b");
  });

  it("returns [] for a note with no history", () => {
    expect(listNoteHistory(vault, "01NONE")).toEqual([]);
  });
});
