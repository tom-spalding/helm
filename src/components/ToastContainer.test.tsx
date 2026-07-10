import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useToastStore } from "../store/toast";
import { ToastContainer } from "./ToastContainer";

describe("ToastContainer", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("renders nothing when there are no toasts", () => {
    const { container } = render(<ToastContainer />);
    expect(container.querySelector("[role='alert']")).toBeNull();
  });

  it("renders an error toast with role=alert", () => {
    render(<ToastContainer />);
    act(() => useToastStore.getState().showToast("Failed to save note: disk full", "error"));
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to save note: disk full");
  });

  it("renders in an aria-live polite region", () => {
    const { container } = render(<ToastContainer />);
    expect(container.querySelector("[aria-live='polite']")).not.toBeNull();
  });

  it("dismisses a toast when its close button is clicked", async () => {
    const user = userEvent.setup();
    render(<ToastContainer />);
    act(() => useToastStore.getState().showToast("bye", "info"));
    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText("bye")).toBeNull();
  });
});
