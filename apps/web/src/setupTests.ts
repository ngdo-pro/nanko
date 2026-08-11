import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

afterEach(cleanup);

class FakeEventSource {
  url: string | URL;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string | URL) {
    this.url = url;
  }

  close(): void {}
}

// jsdom has no EventSource implementation, and App.tsx opens one on mount.
Object.defineProperty(globalThis, "EventSource", {
  writable: true,
  value: FakeEventSource,
});
