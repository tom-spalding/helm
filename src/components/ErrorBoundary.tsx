import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render errors anywhere below it so a single crashing component
 * (editor, graph view, …) shows a recoverable message instead of blanking
 * the whole window. Notes live on disk, so a reload is always safe.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="flex h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] px-8 text-center"
        >
          <p className="text-lg font-semibold text-[var(--color-text)]">Something went wrong</p>
          <p className="max-w-xl break-words text-sm text-[var(--color-text-muted)]">
            {this.state.error.message}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Your notes are safe on disk. Reloading will restore the app.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          >
            Reload Helm
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
