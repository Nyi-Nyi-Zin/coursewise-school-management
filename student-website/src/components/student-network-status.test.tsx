// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { StudentNetworkStatus } from "@/components/student-network-status";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: true,
  });
});

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

it("shows an alert when the student goes offline", () => {
  render(<StudentNetworkStatus />);

  window.dispatchEvent(new Event("offline"));

  return waitFor(() => {
    expect(screen.getByRole("alert").textContent).toContain("No internet connection");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});

it("does not report a restored connection while the browser is offline", async () => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: false,
  });
  globalThis.fetch = vi.fn(async () => ({ ok: true })) as typeof fetch;

  render(<StudentNetworkStatus />);
  window.dispatchEvent(new Event("online"));

  await waitFor(() => {
    expect(screen.getByRole("alert").textContent).toContain("No internet connection");
  });
  expect(screen.queryByText("Back online")).toBeNull();
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it("shows reconnecting and restored states after the connection returns", async () => {
  let resolveProbe: ((value: { ok: boolean }) => void) | undefined;
  globalThis.fetch = vi.fn(
    () => new Promise(resolve => {
      resolveProbe = resolve;
    }),
  ) as typeof fetch;
  render(<StudentNetworkStatus />);

  window.dispatchEvent(new Event("online"));

  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Reconnecting…"));
  resolveProbe?.({ ok: true });
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Back online"));
  expect(globalThis.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/icon-32x32.png?connection-check="),
    expect.objectContaining({ cache: "no-store" }),
  );
});
