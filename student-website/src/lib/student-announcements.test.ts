import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDocs: vi.fn(), getDoc: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ firestore: {} }));
vi.mock("@/lib/student-data", () => ({ demoAnnouncements: [], demoAttendance: [], demoLessons: [] }));
vi.mock("@/lib/authenticated-api", () => ({ authenticatedApiFetch: vi.fn() }));
vi.mock("@/lib/cloudinary-upload-service", () => ({ uploadStudentProfilePhoto: vi.fn(), uploadAssignmentFileToStorage: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  ...mocks,
  collection: (_db: unknown, name: string) => name,
  doc: vi.fn(),
  query: (...parts: unknown[]) => parts,
  where: (...parts: unknown[]) => parts,
  orderBy: (...parts: unknown[]) => parts,
  limit: vi.fn(), addDoc: vi.fn(), serverTimestamp: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(),
}));

import { getStudentAnnouncements } from "./student-repository";

describe("student announcements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
  });

  it("loads published notices from every enrolled batch without truncation", async () => {
    mocks.getDocs.mockImplementation(async (parts: unknown[]) => {
      if (parts[0] === "enrollments") return { docs: ["a", "b", "c"].map(batchId => ({ data: () => ({ courseId: "course", batchId }) })) };
      const batchId = (parts.find(part => Array.isArray(part) && part[0] === "batchId") as string[])[2];
      expect(parts).toContainEqual(["isPublished", "==", true]);
      return { docs: Array.from({ length: 9 }, (_, index) => ({ id: `${batchId}-${index}`, data: () => ({ title: `${batchId} notice` }) })) };
    });
    const result = await getStudentAnnouncements("student");
    expect(result).toHaveLength(27);
    expect(new Set(result.map(item => item.title))).toEqual(new Set(["a notice", "b notice", "c notice"]));
    expect(mocks.getDocs.mock.calls[0][0]).toContainEqual(["studentId", "==", "student"]);
    expect(mocks.getDocs.mock.calls[0][0]).toContainEqual(["status", "==", "active"]);
  });

  it("does not request announcements when the student has no active enrollments", async () => {
    mocks.getDocs.mockResolvedValue({ docs: [] });
    expect(await getStudentAnnouncements("student")).toEqual([]);
    expect(mocks.getDocs).toHaveBeenCalledTimes(1);
  });
});
