import { Icon } from "@iconify/react";
import { useToastStore } from "../store/toast";

/**
 * Fixed-position stack of transient notifications, bottom-right. Rendered once
 * at the app root. The wrapper is an aria-live region so screen readers
 * announce new toasts without stealing focus.
 */
export function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.kind === "error" ? "alert" : "status"}
          className={`flex max-w-md items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.kind === "error"
              ? "border-red-500/40 bg-red-950/90 text-red-100"
              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
          }`}
        >
          <Icon
            icon={toast.kind === "error" ? "uil:exclamation-triangle" : "uil:info-circle"}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <span className="min-w-0 break-words">{toast.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(toast.id)}
            className="ml-auto shrink-0 opacity-60 transition-opacity hover:opacity-100"
          >
            <Icon icon="uil:times" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
