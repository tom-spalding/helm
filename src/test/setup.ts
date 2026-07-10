import "@testing-library/jest-dom";

// jsdom doesn't implement ResizeObserver, which @dnd-kit (Kanban board) and some
// components rely on at import/render time. Provide a no-op stub for tests.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
