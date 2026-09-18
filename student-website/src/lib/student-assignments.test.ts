import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDocs: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ firestore: {} }));
vi.mock("@/lib/student-data", () => ({ demoAnnouncements: [], demoAttendance: [], demoLessons: [] }));
vi.mock("@/lib/authenticated-api", () => ({ authenticatedApiFetch: vi.fn() }));
vi.mock("@/lib/cloudinary-upload-service", () => ({ uploadStudentProfilePhoto: vi.fn(), uploadAssignmentFileToCloudinary: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  ...mocks,
  collection: (_db: unknown, name: string) => name,
  query: (...parts: unknown[]) => parts,
  where: (...parts: unknown[]) => parts,
  orderBy: (...parts: unknown[]) => parts,
  doc: vi.fn(), getDoc: vi.fn(), limit: vi.fn(), addDoc: vi.fn(), serverTimestamp: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(),
}));

import { getPublishedAssignments, getStudentAssignmentSubmissions } from "./student-repository";

describe("student assignment queries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads and sorts published assignments without a composite orderBy query", async () => {
    mocks.getDocs.mockResolvedValue({ docs: [
      { id: "later", data: () => ({ title: "Later", dueAt: "2026-10-02T00:00:00.000Z" }) },
      { id: "sooner", data: () => ({ title: "Sooner", dueAt: "2026-10-01T00:00:00.000Z" }) },
    ] });

    const result = await getPublishedAssignments("course", "batch");
    expect(result.map(item => item.id)).toEqual(["sooner", "later"]);
    expect(mocks.getDocs.mock.calls[0][0]).not.toContainEqual(["dueAt", "asc"]);
  });

  it("loads and sorts submissions without a composite orderBy query", async () => {
    mocks.getDocs.mockResolvedValue({ docs: [
      { id: "older", data: () => ({ assignmentId: "a", submittedAt: "2026-10-01T00:00:00.000Z" }) },
      { id: "newer", data: () => ({ assignmentId: "b", submittedAt: "2026-10-02T00:00:00.000Z" }) },
    ] });

    const result = await getStudentAssignmentSubmissions("student", "course", "batch");
    expect(result.map(item => item.id)).toEqual(["newer", "older"]);
    expect(mocks.getDocs.mock.calls[0][0]).not.toContainEqual(["submittedAt", "desc"]);
  });
});
