// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EmailActionPage from "./page";

const mocks = vi.hoisted(() => ({ apply: vi.fn() }));

vi.mock("firebase/auth", () => ({ applyActionCode: mocks.apply }));
vi.mock("@/lib/firebase", () => ({
  firebaseAuth: {},
  isFirebaseConfigured: true,
}));

describe("EmailActionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apply.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("verifies an email and rejects an untrusted return origin", async () => {
    const continueUrl = encodeURIComponent(
      "https://new-student.example.com/login"
    );
    window.history.replaceState(
      {},
      "",
      `/auth/action?mode=verifyEmail&oobCode=test-code&continueUrl=${continueUrl}`
    );

    render(<EmailActionPage />);

    expect(
      await screen.findByText(
        "Your email address has been verified. You can now sign in."
      )
    ).toBeTruthy();
    expect(mocks.apply).toHaveBeenCalledWith({}, "test-code");
    expect(
      screen.getByRole("link", { name: "Back to login" }).getAttribute("href")
    ).toBe("/login");
  });

  it("shows a safe error state for unsupported or expired actions", async () => {
    window.history.replaceState(
      {},
      "",
      "/auth/action?mode=unsupported&oobCode=test-code"
    );

    render(<EmailActionPage />);

    expect(
      await screen.findByText(
        /This email action link is invalid or has expired/
      )
    ).toBeTruthy();
    expect(mocks.apply).not.toHaveBeenCalled();
  });
});
