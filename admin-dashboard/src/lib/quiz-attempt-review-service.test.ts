import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = { collection: vi.fn(), getDocs: vi.fn(), limit: vi.fn(), orderBy: vi.fn(), query: vi.fn(), where: vi.fn() };
vi.mock("firebase/firestore", () => firestore);
vi.mock("./firebase", () => ({ hasFirebaseConfiguration: true, getFirebaseClient: () => ({ db: "mock-db" }) }));

describe("loadBatchQuizAttempts", () => {
  beforeEach(() => { vi.clearAllMocks(); firestore.collection.mockReturnValue("attempts"); firestore.where.mockImplementation((...args: unknown[]) => args); firestore.orderBy.mockImplementation((...args: unknown[]) => args); firestore.limit.mockImplementation((...args: unknown[]) => args); firestore.query.mockImplementation((...args: unknown[]) => args); firestore.getDocs.mockResolvedValue({ docs: [{ id: "selected-attempt", data: () => ({ studentId: "student-a", score: 9, totalMarks: 10, quizId: "quiz-a" }) }] }); });

  it("queries only the selected course and batch before rendering private attempts", async () => {
    const { loadBatchQuizAttempts } = await import("./quiz-attempt-review-service");
    const attempts = await loadBatchQuizAttempts({ courseId: "course-a", batchId: "batch-a" });
    expect(firestore.where).toHaveBeenCalledWith("courseId", "==", "course-a");
    expect(firestore.where).toHaveBeenCalledWith("batchId", "==", "batch-a");
    expect(attempts).toEqual([{ id: "selected-attempt", studentId: "student-a", score: 9, totalMarks: 10, quizId: "quiz-a" }]);
  });

  it("does not query Firestore for an incomplete scope", async () => {
    const { loadBatchQuizAttempts } = await import("./quiz-attempt-review-service");
    await expect(loadBatchQuizAttempts({ courseId: "course-a", batchId: "" })).resolves.toEqual([]);
    expect(firestore.getDocs).not.toHaveBeenCalled();
  });

  it("queries recent attempts without pair filters for the all-pairs scope", async () => {
    const { loadBatchQuizAttempts } = await import("./quiz-attempt-review-service");
    const attempts = await loadBatchQuizAttempts({ courseId: "", batchId: "" });
    expect(firestore.where).not.toHaveBeenCalled();
    expect(firestore.orderBy).toHaveBeenCalledWith("submittedAt", "desc");
    expect(firestore.getDocs).toHaveBeenCalledOnce();
    expect(attempts).toHaveLength(1);
  });
});
