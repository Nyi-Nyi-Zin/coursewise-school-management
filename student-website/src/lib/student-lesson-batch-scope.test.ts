import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDocs: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), doc: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ firestore: {} }));
vi.mock("@/lib/student-data", () => ({ demoAnnouncements: [], demoAttendance: [], demoLessons: [], getDemoLessonProgress: vi.fn(), setDemoLessonProgress: vi.fn() }));
vi.mock("@/lib/authenticated-api", () => ({ authenticatedApiFetch: vi.fn() }));
vi.mock("@/lib/cloudinary-upload-service", () => ({ uploadStudentProfilePhoto: vi.fn(), uploadAssignmentFileToCloudinary: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  ...mocks,
  collection: (_db: unknown, name: string) => name,
  query: (...parts: unknown[]) => parts,
  where: (...parts: unknown[]) => parts,
  orderBy: (...parts: unknown[]) => parts,
  limit: vi.fn(), addDoc: vi.fn(), serverTimestamp: () => "timestamp", updateDoc: vi.fn(),
}));

import { getLessonById, getLessonProgress, getPublishedLessons, updateLessonProgress } from "./student-repository";

describe("student lesson course-batch scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.doc.mockImplementation((...parts: unknown[]) => parts.join("/"));
  });

  it("queries published lessons by course and batch and hides legacy unassigned lessons", async () => {
    mocks.getDocs.mockResolvedValue({ docs: [{ id: "lesson-a", data: () => ({ title: "Lesson A", courseId: "course", batchId: "batch-a", isPublished: true }) }] });
    const lessons = await getPublishedLessons("course", "batch-a");
    expect(lessons[0]).toMatchObject({ id: "lesson-a", courseId: "course", batchId: "batch-a" });
    expect(mocks.getDocs.mock.calls[0][0]).toContainEqual(["courseId", "==", "course"]);
    expect(mocks.getDocs.mock.calls[0][0]).toContainEqual(["batchId", "==", "batch-a"]);
    expect(mocks.getDocs.mock.calls[0][0]).toContainEqual(["isPublished", "==", true]);
    await expect(getPublishedLessons("course")).resolves.toEqual([]);
  });

  it("rejects a direct lesson read outside the selected pair", async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ title: "Batch B", courseId: "course", batchId: "batch-b", isPublished: true }) });
    await expect(getLessonById("lesson-b", "course", "batch-a")).resolves.toBeNull();
  });

  it("reads and writes progress with the full student course-batch scope", async () => {
    mocks.getDocs.mockResolvedValue({ docs: [{ id: "progress", data: () => ({ lessonId: "lesson-a", status: "complete" }) }] });
    expect((await getLessonProgress("student", "course", "batch-a")).get("lesson-a")).toBe("complete");
    expect(mocks.getDocs.mock.calls[0][0]).toContainEqual(["batchId", "==", "batch-a"]);

    await updateLessonProgress("student", "lesson-a", "course", "batch-a", "continue");
    expect(mocks.doc).toHaveBeenLastCalledWith({}, "lessonProgress", "course_batch-a_lesson-a_student");
    expect(mocks.setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      studentId: "student", lessonId: "lesson-a", courseId: "course", batchId: "batch-a", status: "continue",
    }), { merge: true });
  });
});
