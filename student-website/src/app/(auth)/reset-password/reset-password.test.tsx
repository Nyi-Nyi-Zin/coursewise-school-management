// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "./page";
import { STRONG_PASSWORD_MESSAGE } from "../../../../../shared/auth-validation";

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), verify: vi.fn(), security: vi.fn(), error: vi.fn() }));
vi.mock("firebase/auth", () => ({ confirmPasswordReset: mocks.confirm, verifyPasswordResetCode: mocks.verify }));
vi.mock("../../../lib/firebase", () => ({ firebaseAuth: {}, isFirebaseConfigured: true }));
vi.mock("../../../lib/recaptcha", () => ({ verifyStudentAuthSecurity: mocks.security }));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));

describe("ResetPasswordPage password policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/reset-password?mode=resetPassword&oobCode=test-code");
    mocks.verify.mockResolvedValue("student@example.com");
    mocks.security.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(undefined);
  });
  afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); });

  async function submit(password: string) {
    render(<ResetPasswordPage />);
    const input = await screen.findByLabelText(/^New password/, { selector: "input" });
    expect(input.getAttribute("minlength")).toBe("8");
    expect(screen.getByText(STRONG_PASSWORD_MESSAGE)).toBeTruthy();
    fireEvent.change(input, { target: { value: password } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: password } });
    fireEvent.submit(input.closest("form")!);
  }

  it.each(["123456", "12345678", "password1!", "PASSWORD1!", "Password!!", "Password12"])("rejects %s before contacting Firebase", async password => {
    await submit(password);
    expect(mocks.error).toHaveBeenCalledWith(STRONG_PASSWORD_MESSAGE);
    expect(mocks.security).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("accepts a password meeting the registration and change-password policy", async () => {
    await submit("Student12!");
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith({}, "test-code", "Student12!"));
    expect(await screen.findByText("Your password has been updated.")).toBeTruthy();
  });

  it("shows live validation and only enables submit for a strong matching password", async () => {
    render(<ResetPasswordPage />);
    const password = await screen.findByLabelText(/^New password/, { selector: "input" });
    const confirmation = screen.getByLabelText("Confirm password");
    const button = screen.getByRole("button", { name: "Update password" });

    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(password, { target: { value: "weak" } });
    expect(password.getAttribute("aria-invalid")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(password, { target: { value: "Student12!" } });
    fireEvent.change(confirmation, { target: { value: "Student12?" } });
    expect(screen.getByText("Passwords do not match.")).toBeTruthy();
    expect(confirmation.getAttribute("aria-invalid")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(confirmation, { target: { value: "Student12!" } });
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });
});
