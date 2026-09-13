import { beforeEach, expect, it, vi } from "vitest";

import { POST } from "./route";

const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), sign: vi.fn(), get: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudinary-server", () => ({ createSignedUpload: mocks.sign, destroyPrivateAsset: vi.fn() }));
vi.mock("@/lib/firebase-admin", () => ({
  getFirebaseAdmin: () => ({ db: { doc: (path: string) => ({ get: () => mocks.get(path) }) } }),
}));
vi.mock("@/lib/server-api", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/server-api")>(),
  requireAuthenticatedUser: mocks.authenticate,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue({ uid: "student-a" });
  mocks.sign.mockImplementation(parameters => ({ cloudName: "demo", apiKey: "key", signature: "signed", ...parameters }));
  mocks.get.mockImplementation((path: string) => {
    if (path === "assignments/assignment-a") return Promise.resolve({ exists: true, data: () => ({ courseId: "course-1", batchId: "batch-a", isPublished: true }) });
    if (path === "enrollments/course-1_batch-a_student-a") return Promise.resolve({ exists: true, data: () => ({ status: "active" }) });
    return Promise.resolve({ exists: true, data: () => ({}) });
  });
});

function assignmentRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/uploads/cloudinary-signature", {
    method: "POST",
    body: JSON.stringify({ kind: "assignment", assignmentId: "assignment-a", courseId: "course-1", batchId: "batch-a", contentType: "application/pdf", size: 1024, ...overrides }),
  });
}

it("signs a private raw upload only for the student's active assignment", async () => {
  const response = await POST(assignmentRequest());
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ resourceType: "raw", type: "authenticated", folder: "coursewise/assignments/student-a/assignment-a" });
  expect(body.public_id).toMatch(/^[0-9a-f-]{36}$/);
});

it("rejects oversized, unsupported, and out-of-scope assignment uploads", async () => {
  expect((await POST(assignmentRequest({ size: 10 * 1024 * 1024 + 1 }))).status).toBe(400);
  expect((await POST(assignmentRequest({ contentType: "application/x-msdownload" }))).status).toBe(400);
  mocks.get.mockImplementation((path: string) => Promise.resolve({ exists: true, data: () => path.startsWith("assignments/") ? { courseId: "other", batchId: "batch-a", isPublished: true } : { status: "active" } }));
  expect((await POST(assignmentRequest())).status).toBe(403);
});

it("does not issue another student avatar signature after a photo is set", async () => {
  mocks.get.mockResolvedValue({ exists: true, data: () => ({ photoUrl: "https://example.com/avatar.jpg" }) });
  const response = await POST(new Request("http://localhost/api/uploads/cloudinary-signature", {
    method: "POST",
    body: JSON.stringify({ kind: "avatar", contentType: "image/jpeg", size: 1024 }),
  }));
  expect(response.status).toBe(409);
  expect(mocks.sign).not.toHaveBeenCalled();
});
