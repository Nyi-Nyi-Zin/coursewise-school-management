import { beforeEach, describe, expect, it, vi } from "vitest";

const firebaseFunctions = { httpsCallable: vi.fn() };
const createClient = vi.fn();
vi.mock("firebase/functions", () => firebaseFunctions);
vi.mock("./firebase", () => ({ hasFirebaseConfiguration: true, getFirebaseClient: () => createClient() }));

describe("createAdminPasswordResetLink", () => {
  beforeEach(() => { vi.clearAllMocks(); createClient.mockReturnValue({ functions: "functions-client" }); });
  it("calls the protected admin reset callable with the trimmed student email", async () => {
    const callable = vi.fn().mockResolvedValue({ data: { link: "https://reset.example/link" } }); firebaseFunctions.httpsCallable.mockReturnValue(callable);
    const { createAdminPasswordResetLink } = await import("./admin-password-reset-service");
    await expect(createAdminPasswordResetLink(" student@example.com ")).resolves.toBe("https://reset.example/link");
    expect(firebaseFunctions.httpsCallable).toHaveBeenCalledWith("functions-client", "adminCreatePasswordResetLink");
    expect(callable).toHaveBeenCalledWith({ email: "student@example.com" });
  });
});
