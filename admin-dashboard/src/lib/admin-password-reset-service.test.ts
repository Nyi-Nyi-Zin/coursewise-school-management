import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticatedApiFetch = vi.fn();
vi.mock("./authenticated-api", () => ({ authenticatedApiFetch }));
vi.mock("./firebase", () => ({ hasFirebaseConfiguration: true }));

describe("createAdminPasswordResetLink", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("calls the protected backend endpoint with the trimmed student email", async () => {
    authenticatedApiFetch.mockResolvedValue({ link: "https://reset.example/link" });
    const { createAdminPasswordResetLink } = await import("./admin-password-reset-service");
    await expect(createAdminPasswordResetLink(" student@example.com ")).resolves.toBe("https://reset.example/link");
    expect(authenticatedApiFetch).toHaveBeenCalledWith("/api/password-reset-link", {
      method: "POST",
      body: JSON.stringify({ email: "student@example.com" }),
    });
  });
});
