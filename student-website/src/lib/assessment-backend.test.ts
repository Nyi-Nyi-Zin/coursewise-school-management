import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkChapterAnswer,
  recordIntegrityViolation,
  startAssessment,
  submitAssessment,
} from "./assessment-backend";

const mocks = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const refCache = new Map<string, unknown>();
  let attemptCounter = 0;
  return {
    store,
    refCache,
    resetStore: () => {
      store.clear();
      refCache.clear();
      attemptCounter = 0;
    },
    nextAttemptId: () => {
      attemptCounter += 1;
      return `attempt-${attemptCounter}`;
    },
    db: undefined as unknown,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase-admin", () => ({
  getFirebaseAdmin: () => ({ db: mocks.db }),
}));
vi.mock("firebase-admin/firestore", () => ({
  FieldPath: { documentId: () => "__name__" },
  FieldValue: {
    serverTimestamp: () => "server-timestamp",
    arrayUnion: (...values: unknown[]) => ({
      __firestoreOp: "arrayUnion",
      values,
    }),
  },
}));

function buildDb() {
  const snapshotFor = (path: string) => {
    const exists = mocks.store.has(path);
    const data = mocks.store.get(path);
    return {
      exists,
      id: path.split("/").pop() as string,
      path,
      data: () => (data ? { ...data } : undefined),
      ref: (mocks.db as Db).doc(path),
    };
  };
  const queryRef = (prefix: string) => {
    const clauses: { field: string; value: unknown }[] = [];
    const chain = {
      where: (field: string, _operator: string, value: unknown) => {
        clauses.push({ field, value });
        return chain;
      },
      orderBy: vi.fn(() => chain),
      select: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      startAfter: vi.fn(() => chain),
      doc: (id?: string) =>
        (mocks.db as Db).doc(`${prefix}/${id ?? mocks.nextAttemptId()}`),
      get: vi.fn(() => {
        const docs = [...mocks.store.entries()]
          .filter(([path]) => path.startsWith(`${prefix}/`))
          .filter(([, data]) =>
            clauses.every(({ field, value }) => data[field] === value)
          )
          .map(([path]) => snapshotFor(path));
        return Promise.resolve({ docs, size: docs.length });
      }),
    };
    return chain;
  };
  const makeDocRef = (path: string) => {
    return {
      path,
      id: path.split("/").pop() as string,
      collection: (name: string) => queryRef(`${path}/${name}`),
      get: () => Promise.resolve(snapshotFor(path)),
      set: (data: Record<string, unknown>, options?: { merge?: boolean }) => {
        const existing = mocks.store.get(path);
        if (options?.merge && existing)
          mocks.store.set(path, { ...existing, ...data });
        else mocks.store.set(path, { ...data });
        return Promise.resolve();
      },
      update: () => Promise.resolve(),
    };
  };
  const db: Db = {
    doc: (path: string) => {
      const cached = mocks.refCache.get(path);
      if (cached) return cached as DocRef;
      const ref = makeDocRef(path);
      mocks.refCache.set(path, ref);
      return ref;
    },
    collection: (name: string) => queryRef(name),
    getAll: (...refs: DocRef[]) =>
      Promise.resolve(refs.map(ref => snapshotFor(ref.path))),
    runTransaction: (fn: (tx: Transaction) => Promise<unknown>) =>
      fn({
        get: (ref: DocRef) => Promise.resolve(snapshotFor(ref.path)),
        set: (ref: DocRef, data: unknown, options?: unknown) =>
          ref.set(
            data as Record<string, unknown>,
            options as { merge?: boolean }
          ),
      }),
  };
  return db;
}

type DocRef =
  ReturnType<ReturnType<typeof buildDb>["doc"]> extends infer T
    ? T extends (...args: never) => infer R
      ? R
      : never
    : never;
type Db = ReturnType<typeof buildDb>;
type Transaction = {
  get: (
    ref: DocRef
  ) => Promise<{ data: () => Record<string, unknown> | undefined }>;
  set: (ref: DocRef, data: unknown, options?: unknown) => Promise<void>;
};

const BASE_NOW = new Date("2026-09-13T00:00:00.000Z").getTime();
const STUDENT = "student";
const FINAL = "final-1";

function seedEnrollment(
  studentId = STUDENT,
  courseId = "course",
  batchId = "batch-a"
) {
  mocks.store.set(`enrollments/${courseId}_${batchId}_${studentId}`, {
    status: "active",
  });
}

function seedQuiz(
  id: string,
  questions: Array<{
    id: string;
    prompt: string;
    options: string[];
    correctAnswerIndex: number;
  }>,
  data: Record<string, unknown> = {}
) {
  mocks.store.set(`quizzes/${id}`, {
    id,
    courseId: "course",
    batchId: "batch-a",
    kind: "chapter_quiz",
    title: id,
    durationMinutes: 0,
    passingPercent: 50,
    maxRetakes: -1,
    isPublished: true,
    ...data,
  });
  for (const question of questions) {
    mocks.store.set(`quizzes/${id}/questions/${question.id}`, {
      prompt: question.prompt,
      options: question.options,
      marks: 1,
      type: "multiple_choice",
    });
    mocks.store.set(`quizzes/${id}/answerKeys/${question.id}`, {
      correctAnswerIndex: question.correctAnswerIndex,
      correctAnswerIndices: [question.correctAnswerIndex],
      explanation: `${question.id} explanation`,
    });
  }
}

function seedChapterQuiz() {
  seedEnrollment();
  seedQuiz("chapter-1", [
    {
      id: "q1",
      prompt: "One",
      options: ["A", "B", "C"],
      correctAnswerIndex: 1,
    },
    {
      id: "q2",
      prompt: "Two",
      options: ["X", "Y", "Z"],
      correctAnswerIndex: 2,
    },
  ]);
}

function seedFinalExam(data: Record<string, unknown> = {}) {
  seedEnrollment();
  mocks.store.set(`users/${STUDENT}`, {
    name: "Student One",
    studentId: "ST-1",
    activeCourseId: "course",
    activeBatchId: "batch-a",
  });
  mocks.store.set("courses/course", { title: "Intro Course" });
  mocks.store.set("batches/batch-a", { name: "Batch A" });
  seedQuiz("chapter-1", [
    { id: "c1", prompt: "Chapter", options: ["A", "B"], correctAnswerIndex: 1 },
  ]);
  mocks.store.set(`quizSummaries/chapter-1_${STUDENT}`, {
    quizId: "chapter-1",
    studentId: STUDENT,
    kind: "chapter_quiz",
    attemptCount: 1,
    latestPercentage: 100,
    bestPercentage: 100,
    passed: true,
  });
  seedQuiz(
    FINAL,
    [
      {
        id: "q1",
        prompt: "One",
        options: ["A", "B", "C"],
        correctAnswerIndex: 1,
      },
      {
        id: "q2",
        prompt: "Two",
        options: ["X", "Y", "Z"],
        correctAnswerIndex: 2,
      },
    ],
    {
      kind: "final_exam",
      durationMinutes: 1,
      drawQuestionCount: 2,
      passingPercent: 70,
      ...data,
    }
  );
}

function displayedIndex(
  quizId: string,
  questionId: string,
  originalIndex: number
) {
  const session = mocks.store.get(
    `assessmentSessions/${quizId}_${STUDENT}`
  ) as { optionOrders: Record<string, number[]> };
  return session.optionOrders[questionId].findIndex(
    value => value === originalIndex
  );
}

function attemptDocs() {
  return [...mocks.store.entries()].filter(([path]) =>
    path.startsWith("quizAttempts/")
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_NOW);
  mocks.resetStore();
  mocks.db = buildDb();
});
afterEach(() => vi.useRealTimers());

describe("assessment session lifecycle", () => {
  it("rejects a conflicting concurrent start and reuses the session with the matching id", async () => {
    seedChapterQuiz();
    const first = await startAssessment(STUDENT, "chapter-1");
    expect(first.sessionId).toBeTruthy();
    await expect(
      startAssessment(STUDENT, "chapter-1", "other-token")
    ).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("already open in another tab"),
    });
    const reused = await startAssessment(STUDENT, "chapter-1", first.sessionId);
    expect(reused.sessionId).toBe(first.sessionId);
    expect(
      mocks.store.get(`quizAttemptCounters/chapter-1_${STUDENT}`)?.count
    ).toBe(1);
    expect(
      (
        mocks.store.get(`assessmentSessions/chapter-1_${STUDENT}`) as {
          questionSnapshot: unknown[];
        }
      ).questionSnapshot
    ).toHaveLength(2);
  });

  it("checks the current chapter question against the stored snapshot and rejects stale sessions", async () => {
    seedChapterQuiz();
    const session = await startAssessment(STUDENT, "chapter-1");
    const feedback = await checkChapterAnswer(
      STUDENT,
      "chapter-1",
      "q1",
      [1],
      session.sessionId
    );
    expect(feedback.correct).toBe(true);
    await expect(
      checkChapterAnswer(STUDENT, "chapter-1", "q2", [2], "spoofed")
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      checkChapterAnswer(STUDENT, "chapter-1", "q2", [2], session.sessionId)
    ).resolves.toMatchObject({ correct: true });
    expect(
      mocks.store.get(`assessmentSessions/chapter-1_${STUDENT}`)
    ).toHaveProperty("questionSnapshot");
  });

  it("submits an expired final exam after grace grading unanswered and late answers as incorrect", async () => {
    seedFinalExam();
    const started = await startAssessment(STUDENT, FINAL);
    vi.setSystemTime(BASE_NOW + 60_000 + 120_001);
    const result = await submitAssessment(STUDENT, FINAL, started.sessionId, [
      {
        questionId: "q1",
        selectedAnswerIndex: displayedIndex(FINAL, "q1", 1),
        selectedIndices: [displayedIndex(FINAL, "q1", 1)],
      },
      {
        questionId: "q2",
        selectedAnswerIndex: displayedIndex(FINAL, "q2", 2),
        selectedIndices: [displayedIndex(FINAL, "q2", 2)],
      },
    ]);
    expect(result.percentage).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.attemptNumber).toBe(1);
    expect(attemptDocs()).toHaveLength(1);
    const again = await submitAssessment(STUDENT, FINAL, started.sessionId, []);
    expect(again.id).toBe(result.id);
    expect(attemptDocs()).toHaveLength(1);
    expect(
      mocks.store.get(`quizAttemptCounters/${FINAL}_${STUDENT}`)?.count
    ).toBe(1);
  });

  it("accepts final-exam answers submitted within the grace period and issues a certificate", async () => {
    seedFinalExam();
    const started = await startAssessment(STUDENT, FINAL);
    vi.setSystemTime(BASE_NOW + 60_000 + 30_000);
    const result = await submitAssessment(STUDENT, FINAL, started.sessionId, [
      {
        questionId: "q1",
        selectedAnswerIndex: displayedIndex(FINAL, "q1", 1),
        selectedIndices: [displayedIndex(FINAL, "q1", 1)],
      },
      {
        questionId: "q2",
        selectedAnswerIndex: displayedIndex(FINAL, "q2", 2),
        selectedIndices: [displayedIndex(FINAL, "q2", 2)],
      },
    ]);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.certificateIssued).toBe(true);
    expect(mocks.store.has(`certificates/cert_${FINAL}_${STUDENT}`)).toBe(true);
  });

  it("grades against the frozen question snapshot when the instructor edits the answer key mid-attempt", async () => {
    seedFinalExam();
    const started = await startAssessment(STUDENT, FINAL);
    mocks.store.set(`quizzes/${FINAL}/answerKeys/q1`, {
      correctAnswerIndex: 0,
      correctAnswerIndices: [0],
      explanation: "edited",
    });
    const result = await submitAssessment(STUDENT, FINAL, started.sessionId, [
      {
        questionId: "q1",
        selectedAnswerIndex: displayedIndex(FINAL, "q1", 1),
        selectedIndices: [displayedIndex(FINAL, "q1", 1)],
      },
      {
        questionId: "q2",
        selectedAnswerIndex: displayedIndex(FINAL, "q2", 2),
        selectedIndices: [displayedIndex(FINAL, "q2", 2)],
      },
    ]);
    expect(result.percentage).toBe(100);
  });

  it("rejects a submission whose session id does not match the active session", async () => {
    seedFinalExam();
    await startAssessment(STUDENT, FINAL);
    await expect(
      submitAssessment(STUDENT, FINAL, "spoofed-token", [])
    ).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("invalid"),
    });
    expect(attemptDocs()).toHaveLength(0);
  });

  it("treats an abandoned expired final exam as a reserved attempt and enforces the cooldown", async () => {
    seedFinalExam({ durationMinutes: 1, retakeCooldownHours: 1 });
    const started = await startAssessment(STUDENT, FINAL);
    expect(started.expiresAtMillis).toBe(BASE_NOW + 60_000);
    vi.setSystemTime(BASE_NOW + 180_001);
    await expect(startAssessment(STUDENT, FINAL)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("expired attempt unlocks at"),
    });
    expect(
      mocks.store.get(`quizAttemptCounters/${FINAL}_${STUDENT}`)?.count
    ).toBe(1);
    vi.setSystemTime(BASE_NOW + 60_000 + 120_000 + 3_600_000 + 1_000);
    const relaunched = await startAssessment(STUDENT, FINAL);
    expect(relaunched.sessionId).not.toBe(started.sessionId);
    expect(
      mocks.store.get(`quizAttemptCounters/${FINAL}_${STUDENT}`)?.count
    ).toBe(2);
  });

  it("terminates and server-submits a final exam at the third integrity warning", async () => {
    seedFinalExam();
    const started = await startAssessment(STUDENT, FINAL);
    await expect(
      recordIntegrityViolation(STUDENT, FINAL, "tab-hidden", started.sessionId)
    ).resolves.toMatchObject({
      violationCount: 1,
      shouldSubmit: false,
    });
    await recordIntegrityViolation(
      STUDENT,
      FINAL,
      "window-blur",
      started.sessionId
    );
    await expect(
      recordIntegrityViolation(
        STUDENT,
        FINAL,
        "context-menu",
        started.sessionId
      )
    ).resolves.toMatchObject({
      violationCount: 3,
      shouldSubmit: true,
      autoSubmitted: true,
      result: { percentage: 0, passed: false },
    });
    expect(
      mocks.store.get(`assessmentSessions/${FINAL}_${STUDENT}`)
    ).toMatchObject({ status: "submitted" });
    expect(attemptDocs()).toHaveLength(1);
    const ignored = await submitAssessment(STUDENT, FINAL, started.sessionId, [
      { questionId: "q1", selectedAnswerIndex: displayedIndex(FINAL, "q1", 1) },
      { questionId: "q2", selectedAnswerIndex: displayedIndex(FINAL, "q2", 2) },
    ]);
    expect(ignored).toMatchObject({ percentage: 0, passed: false });
    expect(attemptDocs()).toHaveLength(1);
    await expect(
      recordIntegrityViolation(STUDENT, FINAL, "replayed", started.sessionId)
    ).rejects.toMatchObject({ status: 409 });
  });
});
