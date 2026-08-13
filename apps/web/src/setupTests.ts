import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Match the `data-qa` convention used across data-qa attributes and apps/e2e's testIdAttribute.
configure({ testIdAttribute: "data-qa" });

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
