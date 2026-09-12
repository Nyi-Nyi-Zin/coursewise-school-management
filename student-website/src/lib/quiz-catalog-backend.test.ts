import { beforeEach, expect, it, vi } from "vitest";
import { listAssessmentCatalogPage } from "./assessment-backend";

const mocks = vi.hoisted(() => ({
  db: { doc: vi.fn(), collection: vi.fn(), getAll: vi.fn() },
  records: [] as { id: string; data: Record<string, unknown> }[],
  summaries: {} as Record<string, Record<string, unknown>>,
  reads: [] as { collection: string; size: number }[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase-admin", () => ({ getFirebaseAdmin: () => ({ db: mocks.db }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reads = [];
  mocks.records = Array.from({ length: 23 }, (_, index) => ({ id: `q${String(index).padStart(2, "0")}`, data: {
    title: `Quiz ${String(index).padStart(2, "0")}`, courseId: "a", batchId: index % 2 ? "batch-a" : "", isPublished: true, kind: "chapter_quiz", passingPercent: 50,
  } }));
  mocks.summaries = { q22: { attemptCount: 1, bestPercentage: 80, passed: true } };
  mocks.db.doc.mockImplementation((path: string) => ({ path, get: async () => ({ exists: true, data: () => ({ status: "active" }) }) }));
  mocks.db.collection.mockImplementation((collectionName: string) => {
    const filters: [string, unknown][] = [];
    let limit = Infinity;
    let after = "";
    const chain = {
      where: (field: string, _operator: string, value: unknown) => { filters.push([field, value]); return chain; },
      orderBy: () => chain, select: vi.fn(() => chain), limit: vi.fn((value: number) => { limit = value; return chain; }),
      startAfter: (document: { id: string }) => { after = document.id; return chain; },
      get: async () => {
        const source = collectionName === "quizSummaries"
          ? Object.entries(mocks.summaries).map(([quizId, data]) => ({ id: `${quizId}_student`, data: { ...data, quizId, studentId: "student" } }))
          : mocks.records;
        const docs = source.filter(record => record.id > after && filters.every(([field, value]) => record.data[field] === value))
          .sort((a, b) => a.id.localeCompare(b.id)).slice(0, limit)
          .map(record => ({ id: record.id, data: () => record.data }));
        mocks.reads.push({ collection: collectionName, size: docs.length });
        return { docs, size: docs.length };
      },
    };
    return chain;
  });
  mocks.db.getAll.mockImplementation(async (...refs: { path: string }[]) => refs.map(ref => {
    const id = ref.path.split("/")[1];
    const data = ref.path.startsWith("quizSummaries/") ? mocks.summaries[id.replace(/_student$/, "")] : mocks.records.find(record => record.id === id)?.data;
    return { id, exists: Boolean(data), data: () => data };
  }));
});

const input = { enrollments: [{ courseId: "a", batchId: "batch-a" }], page: 0, query: "", filter: "all" as const };

it("pages projected metadata and keeps summaries across all pages", async () => {
  const first = await listAssessmentCatalogPage("student", input);
  const second = await listAssessmentCatalogPage("student", { ...input, page: 1 });
  expect(first.quizzes.map(quiz => quiz.id)).toEqual(Array.from({ length: 10 }, (_, i) => `q0${i}`));
  expect(second.quizzes[0].id).toBe("q10");
  expect(second.quizzes).toHaveLength(10);
  expect(second.summary).toEqual(first.summary);
  expect(second.summary).toMatchObject({ total: 23, completed: 1, bestScore: 80 });
  expect(second.scores[0].id).toBe("q22");
  expect(mocks.db.getAll).not.toHaveBeenCalled();
  expect(mocks.db.collection.mock.results[0].value.select).toHaveBeenCalled();
  expect(mocks.db.collection.mock.results[0].value.limit).toHaveBeenCalledWith(200);
});

it("filters before paging, clamps deleted pages, and preserves global counts", async () => {
  const searched = await listAssessmentCatalogPage("student", { ...input, query: "22", page: 100 });
  expect(searched.page).toBe(0);
  expect(searched.total).toBe(1);
  expect(searched.quizzes[0].id).toBe("q22");
  const completed = await listAssessmentCatalogPage("student", { ...input, filter: "completed" });
  expect(completed.quizzes.map(quiz => quiz.id)).toEqual(["q22"]);
  const empty = await listAssessmentCatalogPage("student", { ...input, query: "missing" });
  expect(empty.quizzes).toEqual([]);
  expect(empty.summary.total).toBe(23);
});

it("deduplicates course-wide quizzes and excludes other batches and unpublished records", async () => {
  mocks.records.push({ id: "private", data: { courseId: "a", batchId: "other", isPublished: true } },
    { id: "draft", data: { courseId: "a", batchId: "", isPublished: false } });
  const result = await listAssessmentCatalogPage("student", { ...input, enrollments: [...input.enrollments, { courseId: "a", batchId: "batch-b" }] });
  expect(result.total).toBe(23);
  expect(mocks.db.collection.mock.calls.filter(([name]) => name === "quizzes")).toHaveLength(1);
});

it("checks every enrollment before reading quiz metadata", async () => {
  mocks.db.doc.mockImplementation(() => ({ get: async () => ({ exists: false }) }));
  await expect(listAssessmentCatalogPage("student", input)).rejects.toMatchObject({ status: 403 });
  expect(mocks.db.collection).not.toHaveBeenCalled();
});

it("continues metadata cursors past 200 records and returns the final partial page", async () => {
  mocks.records = Array.from({ length: 213 }, (_, index) => ({ id: `q${String(index).padStart(3, "0")}`, data: {
    title: `Quiz ${String(index).padStart(3, "0")}`, courseId: "a", batchId: "", isPublished: true,
  } }));
  const result = await listAssessmentCatalogPage("student", { ...input, page: 21 });
  expect(result.total).toBe(213);
  expect(result.quizzes.map(quiz => quiz.id)).toEqual(["q210", "q211", "q212"]);
  expect(mocks.reads.filter(read => read.collection === "quizzes").map(read => read.size)).toEqual([200, 13]);
});

it("keeps final eligibility based on chapters outside the requested page", async () => {
  mocks.records.push({ id: "final", data: { title: "Final", courseId: "a", batchId: "batch-a", kind: "final_exam", isPublished: true } });
  const result = await listAssessmentCatalogPage("student", { ...input, query: "Final" });
  expect(result.quizzes[0]).toMatchObject({ eligible: false, totalChapterCount: 23, completedChapterCount: 1 });
  expect(result.quizzes[0].lockReason).toBe("Complete all chapter quizzes (1/23)");
});

it("locks a chapter quiz once its configured retakes are exhausted", async () => {
  mocks.records = [{ id: "limited", data: { title: "Limited quiz", courseId: "a", batchId: "batch-a", kind: "chapter_quiz", isPublished: true, maxRetakes: 1 } }];
  mocks.summaries = { limited: { attemptCount: 2, bestPercentage: 60, passed: true } };
  const result = await listAssessmentCatalogPage("student", input);
  expect(result.quizzes[0]).toMatchObject({ eligible: false, remainingAttempts: 0, lockReason: "No attempts remain" });
});
