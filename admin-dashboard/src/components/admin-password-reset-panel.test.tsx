// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPasswordResetPanel } from "./admin-password-reset-panel";

const createReset = vi.fn();
vi.mock("../lib/firebase", () => ({ hasFirebaseConfiguration: true }));
vi.mock("../lib/admin-password-reset-service", () => ({ createAdminPasswordResetLink: (email: string) => createReset(email) }));

describe("AdminPasswordResetPanel", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });
  it("renders a secure link after a successful backend reset request", async () => {
    createReset.mockResolvedValue("https://reset.example/secure"); render(<AdminPasswordResetPanel />);
    fireEvent.change(screen.getByPlaceholderText("student@example.com"), { target: { value: "student@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /create secure link/i }));
    await waitFor(() => expect(screen.getByText(/one-time password reset link was created/i)).toBeTruthy());
    expect((screen.getByDisplayValue("https://reset.example/secure") as HTMLTextAreaElement).value).toBe("https://reset.example/secure");
  });
  it("renders a clear error when the backend reset request fails", async () => {
    createReset.mockRejectedValue(new Error("forbidden")); render(<AdminPasswordResetPanel />);
    fireEvent.change(screen.getByPlaceholderText("student@example.com"), { target: { value: "student@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /create secure link/i }));
    await waitFor(() => expect(screen.getByText(/could not be created/i)).toBeTruthy());
  });
  it("keeps the action disabled and sends only one request while pending", async () => {
    let resolveRequest!: (value: string) => void;
    createReset.mockReturnValue(new Promise<string>(resolve => { resolveRequest = resolve; }));
    render(<AdminPasswordResetPanel />);
    fireEvent.change(screen.getByPlaceholderText("student@example.com"), { target: { value: "student@example.com" } });
    const button = screen.getByRole("button", { name: /create secure link/i });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(createReset).toHaveBeenCalledTimes(1);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    resolveRequest("https://reset.example/secure");
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  });
});
