// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "./page";

const mocks = vi.hoisted(() => ({ requestReset: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../../lib/firebase", () => ({ isFirebaseConfigured: true }));
vi.mock("../../../lib/auth-service", () => ({ requestPasswordReset: (email: string) => mocks.requestReset(email) }));
vi.mock("sonner", () => ({ toast: mocks.toast }));

describe("ForgotPasswordPage", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });
  it("shows the student a confirmation after Firebase accepts the password reset request", async () => {
    mocks.requestReset.mockResolvedValue(undefined); render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "student@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => expect(screen.getByText(/Firebase has sent reset instructions/i)).toBeTruthy());
    expect(mocks.requestReset).toHaveBeenCalledWith("student@example.com");
    expect(mocks.toast.success).toHaveBeenCalledWith("Password reset email sent.");
  });
  it("shows a non-sensitive recovery error if Firebase rejects the request", async () => {
    mocks.requestReset.mockRejectedValue(new Error("unavailable")); render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "student@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("We could not send a reset email. Confirm your email or contact the administrator."));
    expect(screen.queryByText(/Firebase has sent reset instructions/i)).toBeNull();
  });
});
