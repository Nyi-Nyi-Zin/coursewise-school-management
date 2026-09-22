import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedUser } from "./server-api";

const mocks = vi.hoisted(() => ({
  getAdmin: vi.fn(),
  verify: vi.fn(),
  profileGet: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase-admin", () => ({ getFirebaseAdmin: mocks.getAdmin }));

const request = () =>
  new Request("http://localhost/api/test", {
    headers: { authorization: "Bearer token" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verify.mockResolvedValue({ uid: "student-a", email_verified: true });
  mocks.profileGet.mockResolvedValue({
    exists: true,
    data: () => ({ role: "student", isActive: true }),
  });
  mocks.getAdmin.mockReturnValue({
    auth: { verifyIdToken: mocks.verify },
    db: { doc: () => ({ get: mocks.profileGet }) },
  });
});

describe("student API authentication failure classification", () => {
  it("returns the authenticated verified student", async () => {
    await expect(requireAuthenticatedUser(request())).resolves.toMatchObject({
      uid: "student-a",
    });
  });

  it("classifies invalid or revoked tokens as unauthorized", async () => {
    mocks.verify.mockRejectedValue(new Error("auth/id-token-revoked"));
    await expect(requireAuthenticatedUser(request())).rejects.toMatchObject({
      status: 401,
    });
  });

  it("classifies missing server credentials as service unavailable", async () => {
    mocks.getAdmin.mockImplementation(() => {
      throw new Error("missing credentials");
    });
    await expect(requireAuthenticatedUser(request())).rejects.toMatchObject({
      status: 503,
    });
  });

  it("classifies Firestore outages as service unavailable", async () => {
    mocks.profileGet.mockRejectedValue(new Error("firestore unavailable"));
    await expect(requireAuthenticatedUser(request())).rejects.toMatchObject({
      status: 503,
    });
  });

  it("keeps verified-email authorization distinct from authentication", async () => {
    mocks.verify.mockResolvedValue({ uid: "student-a", email_verified: false });
    await expect(requireAuthenticatedUser(request())).rejects.toMatchObject({
      status: 403,
    });
  });
});
