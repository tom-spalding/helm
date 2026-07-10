import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tauriCommands } from "../lib/tauri-commands";
import { QuickCapture } from "./QuickCapture";

const hideMock = vi.fn();

vi.mock("../lib/tauri-commands", () => ({
  tauriCommands: {
    getVaults: vi.fn(),
    writeNote: vi.fn(),
  },
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ hide: hideMock }),
}));

describe("QuickCapture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tauriCommands.getVaults).mockResolvedValue([
      { id: "v1", name: "Notes", path: "/vault" },
      { id: "v2", name: "Work", path: "/work" },
    ]);
    vi.mocked(tauriCommands.writeNote).mockResolvedValue(undefined);
  });

  it("saves to the first vault on Enter and hides the window", async () => {
    const user = userEvent.setup();
    render(<QuickCapture />);

    await user.type(screen.getByRole("textbox"), "Buy milk");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(tauriCommands.writeNote).toHaveBeenCalledOnce());
    const [filePath, raw] = vi.mocked(tauriCommands.writeNote).mock.calls[0];
    expect(filePath).toMatch(/^\/vault\/buy-milk-\d+\.md$/);
    expect(raw).toContain("title: Buy milk");
    await waitFor(() => expect(hideMock).toHaveBeenCalled());
  });

  it("Shift+Enter inserts a newline instead of saving", async () => {
    const user = userEvent.setup();
    render(<QuickCapture />);

    await user.type(screen.getByRole("textbox"), "line one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(screen.getByRole("textbox"), "line two");

    expect(tauriCommands.writeNote).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("line one\nline two");
  });

  it("does not save blank input on Enter", async () => {
    const user = userEvent.setup();
    render(<QuickCapture />);
    await user.click(screen.getByRole("textbox"));
    await user.keyboard("{Enter}");
    expect(tauriCommands.writeNote).not.toHaveBeenCalled();
  });

  it("hides the window on Escape without saving", async () => {
    const user = userEvent.setup();
    render(<QuickCapture />);
    await user.type(screen.getByRole("textbox"), "draft");
    await user.keyboard("{Escape}");
    expect(hideMock).toHaveBeenCalled();
    expect(tauriCommands.writeNote).not.toHaveBeenCalled();
  });

  it("clears the textarea after a successful save", async () => {
    const user = userEvent.setup();
    render(<QuickCapture />);
    await user.type(screen.getByRole("textbox"), "Buy milk");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
  });

  it("shows the destination vault name", async () => {
    render(<QuickCapture />);
    expect(await screen.findByText(/Notes/)).toBeInTheDocument();
  });
});
