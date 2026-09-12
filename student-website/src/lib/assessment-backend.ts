import "server-only";

import { randomInt } from "node:crypto";
import { FieldPath, FieldValue, type DocumentData, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { QuizCatalogPage, QuizCatalogRequest } from "@/lib/quiz-catalog";

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { ApiError } from "@/lib/server-api";

type QuizKind = "chapter_quiz" | "final_exam";
type SubmittedQuizAnswer = { questionId: string; selectedAnswerIndex: number; selectedIndices?: number[] };
type TrustedQuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  explanation: string;
  type?: "multiple_choice" | "multiple_select" | "true_false";
  correctAnswerIndex: number;
  correctAnswerIndices?: number[];
  marks: number;
};
type StoredQuizSummary = {
  quizId: string; studentId: string; kind: QuizKind; attemptCount: number;
  bestScore: number; bestTotalMarks: number; bestPercentage: number; bestAttemptId: string | null;
  latestAttemptId: string | null; latestScore: number; latestTotalMarks: number; latestPercentage: number;
  latestPassed: boolean; latestSubmittedAtMillis: number | null; latestTimeSpentSeconds: number; passed: boolean;
  nextEligibleAtMillis?: number | null; latestIntegrityViolations?: number;
};
type StoredSession = {
  quizId: string; studentId: string; courseId: string; batchId: string; kind: QuizKind;
  status: "active" | "submitted"; questionIds: string[]; optionOrders: Record<string, number[]>;
  answers: Record<string, number[]>; checkedQuestionIds: string[]; startedAtMillis: number; expiresAtMillis: number | null;
  integrityViolations: number; submittedAttemptId?: string | null;
};

const FINAL_PASS_PERCENT = 70;
const FINAL_DEFAULT_DRAW_COUNT = 50;
const FINAL_DEFAULT_COOLDOWN_HOURS = 24;
const AUTO_SUBMIT_GRACE_MS = 120_000;

export type IssuedCertificate = {
  id: string; certificateId: string; verificationCode: string;
  studentId: string; studentName: string; studentCode: string;
  courseId: string; courseTitle: string; batchId: string; batchName: string;
  courseDescription: string;
  quizId: string; quizTitle: string; score: number; totalMarks: number; percentage: number;
  attemptNumber: number; issuedAt: string | null; templateKey: "classic" | "modern";
};

function randomCode(length: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function epochMillis(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    const millis = Number(value.toMillis());
    return Number.isFinite(millis) ? millis : null;
  }
  const parsed = typeof value === "number" || typeof value === "string" ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function dateString(value: unknown): string | null {
  const millis = epochMillis(value);
  return millis === null ? null : new Date(millis).toISOString();
}

function normalizeSelection(answer: SubmittedQuizAnswer | undefined) {
  if (!answer) return [];
  const source = Array.isArray(answer.selectedIndices) ? answer.selectedIndices : [answer.selectedAnswerIndex];
  return [...new Set(source.filter(Number.isInteger))].sort((left, right) => left - right);
}

function normalizeKey(question: TrustedQuizQuestion) {
  const source = question.correctAnswerIndices?.length ? question.correctAnswerIndices : [question.correctAnswerIndex];
  return [...new Set(source.filter(Number.isInteger))].sort((left, right) => left - right);
}

function sameSelection(first: number[], second: number[]) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function calculateScore(questions: TrustedQuizQuestion[], answers: SubmittedQuizAnswer[]) {
  const answerMap = new Map(answers.map(answer => [answer.questionId, answer]));
  const gradedQuestions = questions.map(question => {
    const correct = sameSelection(normalizeKey(question), normalizeSelection(answerMap.get(question.id)));
    return { questionId: question.id, correct, marksEarned: correct ? question.marks : 0 };
  });
  const score = gradedQuestions.reduce((sum, item) => sum + item.marksEarned, 0);
  const totalMarks = questions.reduce((sum, item) => sum + item.marks, 0);
  return { score, totalMarks, percentage: totalMarks ? Math.round(score / totalMarks * 100) : 0, gradedQuestions };
}

function parseSubmittedAnswers(raw: unknown): SubmittedQuizAnswer[] {
  if (!Array.isArray(raw)) throw new ApiError(400, "An answer list is required.");
  return raw.map(item => {
    if (!item || typeof item !== "object" || typeof (item as SubmittedQuizAnswer).questionId !== "string") throw new ApiError(400, "Every answer needs a question ID.");
    const value = item as Partial<SubmittedQuizAnswer>;
    const selectedIndices = Array.isArray(value.selectedIndices) ? value.selectedIndices.map(Number).filter(Number.isInteger) : [];
    const selectedAnswerIndex = Number.isInteger(Number(value.selectedAnswerIndex)) ? Number(value.selectedAnswerIndex) : -1;
    return { questionId: value.questionId!, selectedAnswerIndex, ...(selectedIndices.length ? { selectedIndices } : {}) };
  });
}

async function loadAssessmentContext(quizId: string) {
  const db = getFirebaseAdmin().db;
  const quiz = await db.doc(`quizzes/${quizId}`).get();
  if (!quiz.exists || quiz.data()?.isPublished !== true) throw new ApiError(404, "This assessment is not available.");
  const data = quiz.data() ?? {};
  const courseId = String(data.courseId ?? "");
  const batchId = String(data.batchId ?? "");
  if (!courseId) throw new ApiError(409, "This assessment is missing course information.");
  const [questionSnapshot, answerKeySnapshot] = await Promise.all([
    quiz.ref.collection("questions").orderBy("sortOrder").get(), quiz.ref.collection("answerKeys").get(),
  ]);
  if (questionSnapshot.empty) throw new ApiError(409, "This assessment has no questions yet.");
  const keys = new Map(answerKeySnapshot.docs.map(document => [document.id, document.data()]));
  const questions: TrustedQuizQuestion[] = questionSnapshot.docs.map(document => {
    const question = document.data();
    const key = keys.get(document.id) ?? {};
    return {
      id: document.id, prompt: String(question.prompt ?? ""),
      options: Array.isArray(question.options) ? question.options.map(String) : [],
      explanation: String(key.explanation ?? question.explanation ?? ""),
      ...(question.type ? { type: question.type as TrustedQuizQuestion["type"] } : {}),
      correctAnswerIndex: Math.trunc(Number(key.correctAnswerIndex ?? -1)),
      ...(Array.isArray(key.correctAnswerIndices) ? { correctAnswerIndices: key.correctAnswerIndices.map(Number) } : {}),
      marks: Math.max(1, Math.trunc(Number(question.marks ?? 1))),
    };
  });
  const kind: QuizKind = data.kind === "final_exam" ? "final_exam" : "chapter_quiz";
  return {
    db, quizId, courseId, batchId, questions, kind, title: String(data.title ?? "Assessment"), chapter: String(data.chapter ?? ""),
    passingPercent: kind === "final_exam" ? FINAL_PASS_PERCENT : Math.min(100, Math.max(0, Number(data.passingPercent ?? 50))),
    maxRetakes: Number.isFinite(Number(data.maxRetakes)) ? Math.trunc(Number(data.maxRetakes)) : -1,
    durationSeconds: kind === "final_exam" ? Math.max(0, Math.trunc(Number(data.durationMinutes ?? 0))) * 60 : 0,
    drawQuestionCount: kind === "final_exam" ? Math.max(1, Math.trunc(Number(data.drawQuestionCount ?? FINAL_DEFAULT_DRAW_COUNT))) : questions.length,
    retakeCooldownHours: kind === "final_exam" ? Math.max(0, Number(data.retakeCooldownHours ?? FINAL_DEFAULT_COOLDOWN_HOURS)) : 0,
    opensAt: epochMillis(data.opensAt), closesAt: epochMillis(data.closesAt),
  };
}

export async function assertBatchEnrollment(studentId: string, courseId: string, batchId: string) {
  const enrollment = await getFirebaseAdmin().db.doc(`enrollments/${courseId}_${batchId}_${studentId}`).get();
  if (!enrollment.exists || enrollment.data()?.status !== "active") throw new ApiError(403, "You are not enrolled in this course batch.");
}

/** A quiz with no batchId is shared by all active batches in its course. */
async function resolveQuizBatch(studentId: string, courseId: string, quizBatchId: string) {
  if (quizBatchId) {
    await assertBatchEnrollment(studentId, courseId, quizBatchId);
    return quizBatchId;
  }
  const student = await getFirebaseAdmin().db.doc(`users/${studentId}`).get();
  const activeCourseId = String(student.data()?.activeCourseId ?? "");
  const activeBatchId = String(student.data()?.activeBatchId ?? "");
  if (activeCourseId !== courseId || !activeBatchId) throw new ApiError(403, "You are not enrolled in this course.");
  await assertBatchEnrollment(studentId, courseId, activeBatchId);
  return activeBatchId;
}

async function loadPublishedQuizzes(courseId: string, batchId: string) {
  const snapshot = await getFirebaseAdmin().db.collection("quizzes").where("courseId", "==", courseId).where("isPublished", "==", true).get();
  return snapshot.docs.filter(item => {
    const quizBatchId = String(item.data().batchId ?? "");
    return !quizBatchId || quizBatchId === batchId;
  });
}

async function chapterCompletion(studentId: string, courseId: string, batchId: string) {
  const db = getFirebaseAdmin().db;
  const quizzes = await loadPublishedQuizzes(courseId, batchId);
  const chapterIds = quizzes.filter(item => item.data().kind !== "final_exam").map(item => item.id);
  const summaries = chapterIds.length ? await db.getAll(...chapterIds.map(id => db.doc(`quizSummaries/${id}_${studentId}`))) : [];
  const completed = summaries.filter(item => item.exists && Number(item.data()?.attemptCount ?? 0) > 0).length;
  return { completed, total: chapterIds.length, eligible: completed === chapterIds.length };
}

function remainingAttempts(maxRetakes: number, previousAttempts: number) {
  return maxRetakes < 0 ? null : Math.max(0, maxRetakes + 1 - previousAttempts);
}

function assertWindow(context: Awaited<ReturnType<typeof loadAssessmentContext>>, now: number) {
  if (context.opensAt !== null && now < context.opensAt) throw new ApiError(409, "This assessment is not open yet.");
  if (context.closesAt !== null && now >= context.closesAt) throw new ApiError(409, "This assessment is closed.");
}

function publicSession(context: Awaited<ReturnType<typeof loadAssessmentContext>>, session: StoredSession) {
  const byId = new Map(context.questions.map(question => [question.id, question]));
  return {
    sessionId: `${context.quizId}_${session.studentId}`, kind: session.kind, title: context.title, chapter: context.chapter,
    passingPercent: context.passingPercent, startedAtMillis: session.startedAtMillis, expiresAtMillis: session.expiresAtMillis,
    integrityViolations: session.integrityViolations, checkedQuestionIds: session.checkedQuestionIds,
    questions: session.questionIds.map(id => {
      const question = byId.get(id)!;
      const order = session.optionOrders[id] ?? question.options.map((_, index) => index);
      return { id, prompt: question.prompt, options: order.map(index => question.options[index]), marks: question.marks, ...(question.type ? { type: question.type } : {}) };
    }),
  };
}

export async function startAssessment(studentId: string, quizId: string) {
  const context = await loadAssessmentContext(quizId);
  const enrolledBatchId = await resolveQuizBatch(studentId, context.courseId, context.batchId);
  const now = Date.now();
  assertWindow(context, now);
  const sessionReference = context.db.doc(`assessmentSessions/${quizId}_${studentId}`);
  const [existingSnapshot, summarySnapshot] = await Promise.all([sessionReference.get(), context.db.doc(`quizSummaries/${quizId}_${studentId}`).get()]);
  const summary = summarySnapshot.exists ? summarySnapshot.data() as StoredQuizSummary : undefined;
  if (context.kind === "final_exam" && summary?.passed) throw new ApiError(409, "You already passed this final exam.");
  if (remainingAttempts(context.maxRetakes, summary?.attemptCount ?? 0) === 0) throw new ApiError(409, "No attempts remain for this quiz.");
  if (context.kind === "final_exam") {
    const chapters = await chapterCompletion(studentId, context.courseId, enrolledBatchId);
    if (!chapters.eligible) throw new ApiError(409, `Complete all chapter quizzes first (${chapters.completed}/${chapters.total}).`);
    if (summary?.nextEligibleAtMillis && now < summary.nextEligibleAtMillis) throw new ApiError(409, `Your retake unlocks at ${new Date(summary.nextEligibleAtMillis).toISOString()}.`);
  }
  if (existingSnapshot.exists) {
    const existing = existingSnapshot.data() as StoredSession;
    if (existing.status === "active" && (existing.expiresAtMillis === null || now <= existing.expiresAtMillis + AUTO_SUBMIT_GRACE_MS)) return publicSession(context, existing);
  }
  const questionIds = context.kind === "final_exam" ? shuffle(context.questions.map(item => item.id)).slice(0, context.drawQuestionCount) : context.questions.map(item => item.id);
  const byId = new Map(context.questions.map(item => [item.id, item]));
  const optionOrders = Object.fromEntries(questionIds.map(id => {
    const indices = byId.get(id)!.options.map((_, index) => index);
    return [id, context.kind === "final_exam" ? shuffle(indices) : indices];
  }));
  const session: StoredSession = { quizId, studentId, courseId: context.courseId, batchId: enrolledBatchId, kind: context.kind, status: "active", questionIds, optionOrders, answers: {}, checkedQuestionIds: [], startedAtMillis: now, expiresAtMillis: context.durationSeconds > 0 ? now + context.durationSeconds * 1000 : null, integrityViolations: 0, submittedAttemptId: null };
  await sessionReference.set({ ...session, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return publicSession(context, session);
}

function displayedToOriginal(session: StoredSession, questionId: string, displayed: number[]) {
  const order = session.optionOrders[questionId] ?? [];
  return displayed.map(index => order[index]).filter(Number.isInteger).sort((a, b) => a - b);
}

export async function checkChapterAnswer(studentId: string, quizId: string, rawQuestionId: unknown, rawSelectedIndices: unknown) {
  const context = await loadAssessmentContext(quizId);
  if (context.kind !== "chapter_quiz") throw new ApiError(404, "Answer checking is available only for chapter quizzes.");
  await resolveQuizBatch(studentId, context.courseId, context.batchId);
  const questionId = String(rawQuestionId ?? "");
  const displayed = Array.isArray(rawSelectedIndices) ? rawSelectedIndices.map(Number).filter(Number.isInteger) : [];
  if (!displayed.length) throw new ApiError(400, "Choose an answer before continuing.");
  const reference = context.db.doc(`assessmentSessions/${quizId}_${studentId}`);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new ApiError(409, "Start this quiz before answering.");
  const session = snapshot.data() as StoredSession;
  if (session.status !== "active") throw new ApiError(409, "This quiz session has already been submitted.");
  const questionIndex = session.questionIds.indexOf(questionId);
  if (questionIndex < 0) throw new ApiError(400, "This question is not in your quiz session.");
  if (!session.checkedQuestionIds.includes(questionId) && questionIndex !== session.checkedQuestionIds.length) throw new ApiError(409, "Answer the current question before moving on.");
  const question = context.questions.find(item => item.id === questionId)!;
  const original = session.answers[questionId] ?? displayedToOriginal(session, questionId, displayed);
  const correct = sameSelection(normalizeKey(question), [...original].sort((a, b) => a - b));
  if (!session.checkedQuestionIds.includes(questionId)) await reference.set({ answers: { ...session.answers, [questionId]: original }, checkedQuestionIds: [...session.checkedQuestionIds, questionId], updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  const order = session.optionOrders[questionId];
  return { questionId, correct, marksEarned: correct ? question.marks : 0, explanation: question.explanation, correctIndices: normalizeKey(question).map(index => order.indexOf(index)), correctAnswers: normalizeKey(question).map(index => question.options[index]) };
}

function buildFullReview(questions: TrustedQuizQuestion[], answers: SubmittedQuizAnswer[], graded: ReturnType<typeof calculateScore>["gradedQuestions"]) {
  const answerMap = new Map(answers.map(item => [item.questionId, normalizeSelection(item)]));
  const gradeMap = new Map(graded.map(item => [item.questionId, item]));
  return questions.map(question => {
    const selected = answerMap.get(question.id) ?? [];
    const correct = normalizeKey(question);
    return { questionId: question.id, prompt: question.prompt, options: question.options, explanation: question.explanation, selectedIndices: selected, selectedAnswers: selected.map(index => question.options[index]).filter(Boolean), correctAnswerIndices: correct, correctAnswers: correct.map(index => question.options[index]).filter(Boolean), correct: gradeMap.get(question.id)?.correct === true, marksEarned: gradeMap.get(question.id)?.marksEarned ?? 0 };
  });
}

function emptySummary(quizId: string, studentId: string, kind: QuizKind): StoredQuizSummary {
  return { quizId, studentId, kind, attemptCount: 0, bestScore: 0, bestTotalMarks: 0, bestPercentage: 0, bestAttemptId: null, latestAttemptId: null, latestScore: 0, latestTotalMarks: 0, latestPercentage: 0, latestPassed: false, latestSubmittedAtMillis: null, latestTimeSpentSeconds: 0, passed: false, nextEligibleAtMillis: null, latestIntegrityViolations: 0 };
}

function mergeSummary(previous: StoredQuizSummary | undefined, outcome: { attemptId: string; score: number; totalMarks: number; percentage: number; passed: boolean; timeSpentSeconds: number; submittedAtMillis: number }, context: Awaited<ReturnType<typeof loadAssessmentContext>>, studentId: string, violations: number) {
  const base = previous ?? emptySummary(context.quizId, studentId, context.kind);
  const beatsBest = outcome.percentage > base.bestPercentage || (outcome.percentage === base.bestPercentage && outcome.score > base.bestScore);
  return { ...base, attemptCount: base.attemptCount + 1, bestScore: beatsBest ? outcome.score : base.bestScore, bestTotalMarks: beatsBest ? outcome.totalMarks : base.bestTotalMarks, bestPercentage: beatsBest ? outcome.percentage : base.bestPercentage, bestAttemptId: beatsBest ? outcome.attemptId : base.bestAttemptId ?? outcome.attemptId, latestAttemptId: outcome.attemptId, latestScore: outcome.score, latestTotalMarks: outcome.totalMarks, latestPercentage: outcome.percentage, latestPassed: outcome.passed, latestSubmittedAtMillis: outcome.submittedAtMillis, latestTimeSpentSeconds: outcome.timeSpentSeconds, passed: base.passed || outcome.passed, nextEligibleAtMillis: context.kind === "final_exam" && !outcome.passed ? outcome.submittedAtMillis + context.retakeCooldownHours * 3_600_000 : null, latestIntegrityViolations: violations } satisfies StoredQuizSummary;
}

async function certificateSnapshot(studentId: string, context: Awaited<ReturnType<typeof loadAssessmentContext>>, batchId: string) {
  const [student, course, batch] = await Promise.all([context.db.doc(`users/${studentId}`).get(), context.db.doc(`courses/${context.courseId}`).get(), context.db.doc(`batches/${batchId}`).get()]);
  return { studentName: String(student.data()?.name ?? "Student"), studentCode: String(student.data()?.studentId ?? "Pending"), courseTitle: String(course.data()?.title ?? "Course"), batchName: String(batch.data()?.name ?? "Batch"), quizTitle: context.title };
}

export async function submitAssessment(studentId: string, quizId: string, rawSessionId: unknown, rawAnswers: unknown) {
  const context = await loadAssessmentContext(quizId);
  await resolveQuizBatch(studentId, context.courseId, context.batchId);
  const sessionId = `${quizId}_${studentId}`;
  if (String(rawSessionId ?? "") !== sessionId) throw new ApiError(409, "Your assessment session is invalid. Start again.");
  const sessionReference = context.db.doc(`assessmentSessions/${sessionId}`);
  const sessionSnapshot = await sessionReference.get();
  if (!sessionSnapshot.exists) throw new ApiError(409, "Start this assessment before submitting.");
  const session = sessionSnapshot.data() as StoredSession;
  if (session.status === "submitted" && session.submittedAttemptId) {
    const existing = await context.db.doc(`quizAttempts/${session.submittedAttemptId}`).get();
    if (existing.exists) return responseFromAttempt(context, existing.data()!, session, false);
  }
  const now = Date.now();
  if (session.expiresAtMillis !== null && now > session.expiresAtMillis + AUTO_SUBMIT_GRACE_MS) throw new ApiError(409, "Time is up for this assessment.");
  let answers: SubmittedQuizAnswer[];
  if (context.kind === "chapter_quiz") {
    if (session.checkedQuestionIds.length !== session.questionIds.length) throw new ApiError(409, "Answer every chapter question before submitting.");
    answers = session.questionIds.map(questionId => ({ questionId, selectedAnswerIndex: session.answers[questionId]?.[0] ?? -1, selectedIndices: session.answers[questionId] ?? [] }));
  } else {
    const displayedAnswers = parseSubmittedAnswers(rawAnswers);
    const answerMap = new Map(displayedAnswers.map(item => [item.questionId, normalizeSelection(item)]));
    if (session.questionIds.some(id => !answerMap.get(id)?.length)) throw new ApiError(400, "Answer every final-exam question before submitting.");
    answers = session.questionIds.map(questionId => { const original = displayedToOriginal(session, questionId, answerMap.get(questionId) ?? []); return { questionId, selectedAnswerIndex: original[0] ?? -1, selectedIndices: original }; });
  }
  const questionMap = new Map(context.questions.map(item => [item.id, item]));
  const sessionQuestions = session.questionIds.map(id => questionMap.get(id)!).filter(Boolean);
  const grading = calculateScore(sessionQuestions, answers);
  const passed = grading.percentage >= context.passingPercent;
  const summaryReference = context.db.doc(`quizSummaries/${quizId}_${studentId}`);
  const counterReference = context.db.doc(`quizAttemptCounters/${quizId}_${studentId}`);
  const certificateReference = context.db.doc(`certificates/cert_${quizId}_${studentId}`);
  const certificateData = context.kind === "final_exam" && passed ? await certificateSnapshot(studentId, context, session.batchId) : null;
  const review = context.kind === "chapter_quiz" ? buildFullReview(sessionQuestions, answers, grading.gradedQuestions) : undefined;
  const committed = await context.db.runTransaction(async transaction => {
    const [freshSession, summarySnapshot, counterSnapshot, certificateDocument] = await Promise.all([transaction.get(sessionReference), transaction.get(summaryReference), transaction.get(counterReference), transaction.get(certificateReference)]);
    const fresh = freshSession.data() as StoredSession;
    if (fresh.status === "submitted" && fresh.submittedAttemptId) return { attemptId: fresh.submittedAttemptId, certificateIssued: false };
    const previous = summarySnapshot.exists ? summarySnapshot.data() as StoredQuizSummary : undefined;
    const previousAttempts = counterSnapshot.exists ? Number(counterSnapshot.data()?.count ?? 0) : previous?.attemptCount ?? 0;
    if (context.kind === "final_exam" && previous?.passed) throw new ApiError(409, "You already passed this final exam.");
    if (remainingAttempts(context.maxRetakes, previousAttempts) === 0) throw new ApiError(409, "No attempts remain for this quiz.");
    const attemptReference = context.db.collection("quizAttempts").doc();
    const outcome = { attemptId: attemptReference.id, score: grading.score, totalMarks: grading.totalMarks, percentage: grading.percentage, passed, timeSpentSeconds: Math.max(0, Math.round((now - session.startedAtMillis) / 1000)), submittedAtMillis: now };
    transaction.set(attemptReference, { quizId, kind: context.kind, sessionId, studentId, courseId: context.courseId, batchId: session.batchId, attemptNumber: previousAttempts + 1, answers, ...outcome, integrityViolations: session.integrityViolations, submittedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() });
    transaction.set(counterReference, { quizId, studentId, count: previousAttempts + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(summaryReference, mergeSummary(previous, outcome, context, studentId, session.integrityViolations), { merge: true });
    if (review) transaction.set(context.db.doc(`quizAttemptReviews/${attemptReference.id}`), { quizId, studentId, review, createdAt: FieldValue.serverTimestamp() });
    transaction.set(sessionReference, { status: "submitted", submittedAttemptId: attemptReference.id, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    let certificateIssued = false;
    if (certificateData && !certificateDocument.exists) {
      transaction.set(certificateReference, { certificateId: `CT-${new Date(now).getFullYear()}-${randomCode(6)}`, verificationCode: randomCode(10), studentId, ...certificateData, courseId: context.courseId, batchId: session.batchId, quizId, score: grading.score, totalMarks: grading.totalMarks, percentage: grading.percentage, attemptNumber: previousAttempts + 1, issuedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp(), templateKey: "classic" });
      certificateIssued = true;
    }
    return { attemptId: attemptReference.id, certificateIssued };
  });
  const attempt = await context.db.doc(`quizAttempts/${committed.attemptId}`).get();
  const result = responseFromAttempt(context, attempt.data()!, session, committed.certificateIssued);
  return { ...result, ...(review ? { review, bestPercentage: Math.max(Number((await summaryReference.get()).data()?.bestPercentage ?? 0), grading.percentage) } : {}) };
}

function responseFromAttempt(context: Awaited<ReturnType<typeof loadAssessmentContext>>, attempt: DocumentData, session: StoredSession, certificateIssued: boolean) {
  const attemptCount = Number(attempt.attemptNumber ?? 1);
  const submittedAtMillis = Number(attempt.submittedAtMillis ?? Date.now());
  const nextEligibleAtMillis = context.kind === "final_exam" && attempt.passed !== true ? submittedAtMillis + context.retakeCooldownHours * 3_600_000 : null;
  return { id: String(attempt.attemptId ?? session.submittedAttemptId ?? ""), kind: context.kind, score: Number(attempt.score ?? 0), totalMarks: Number(attempt.totalMarks ?? 0), percentage: Number(attempt.percentage ?? 0), passed: attempt.passed === true, attemptNumber: attemptCount, attemptCount, remainingAttempts: remainingAttempts(context.maxRetakes, attemptCount), timeSpentSeconds: Number(attempt.timeSpentSeconds ?? 0), integrityViolations: Number(attempt.integrityViolations ?? session.integrityViolations ?? 0), certificateIssued, nextEligibleAt: nextEligibleAtMillis ? new Date(nextEligibleAtMillis).toISOString() : null };
}

export async function recordIntegrityViolation(studentId: string, quizId: string, reason: unknown) {
  const context = await loadAssessmentContext(quizId);
  if (context.kind !== "final_exam") throw new ApiError(400, "Integrity tracking applies only to final exams.");
  await resolveQuizBatch(studentId, context.courseId, context.batchId);
  const reference = context.db.doc(`assessmentSessions/${quizId}_${studentId}`);
  const count = await context.db.runTransaction(async transaction => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists || snapshot.data()?.status !== "active") throw new ApiError(409, "No active final-exam session was found.");
    const next = Number(snapshot.data()?.integrityViolations ?? 0) + 1;
    transaction.set(reference, { integrityViolations: next, violationLog: FieldValue.arrayUnion({ reason: String(reason ?? "unknown").slice(0, 80), atMillis: Date.now() }), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });
  return { violationCount: count, shouldSubmit: count >= 3 };
}

export async function loadAssessmentResults(studentId: string, quizId: string) {
  const context = await loadAssessmentContext(quizId);
  await resolveQuizBatch(studentId, context.courseId, context.batchId);
  const summarySnapshot = await context.db.doc(`quizSummaries/${quizId}_${studentId}`).get();
  const summary = summarySnapshot.exists ? summarySnapshot.data() as StoredQuizSummary : undefined;
  let review: unknown[] | undefined;
  if (context.kind === "chapter_quiz" && summary?.latestAttemptId) {
    const snapshot = await context.db.doc(`quizAttemptReviews/${summary.latestAttemptId}`).get();
    review = snapshot.exists && Array.isArray(snapshot.data()?.review) ? snapshot.data()!.review : undefined;
  }
  return { quizId, kind: context.kind, title: context.title, chapter: context.chapter, passingPercent: context.passingPercent, attemptCount: summary?.attemptCount ?? 0, remainingAttempts: remainingAttempts(context.maxRetakes, summary?.attemptCount ?? 0), bestPercentage: summary?.bestPercentage ?? 0, passed: summary?.passed ?? false, nextEligibleAt: summary?.nextEligibleAtMillis ? new Date(summary.nextEligibleAtMillis).toISOString() : null, latest: summary ? { score: summary.latestScore, totalMarks: summary.latestTotalMarks, percentage: summary.latestPercentage, passed: summary.latestPassed, timeSpentSeconds: summary.latestTimeSpentSeconds, submittedAtMillis: summary.latestSubmittedAtMillis, integrityViolations: summary.latestIntegrityViolations ?? 0 } : null, ...(review ? { review } : {}) };
}

export async function listAssessmentCatalog(studentId: string, courseId: string, batchId: string) {
  await assertBatchEnrollment(studentId, courseId, batchId);
  const db = getFirebaseAdmin().db;
  const quizzes = await loadPublishedQuizzes(courseId, batchId);
  const chapterIds = quizzes.filter(item => item.data().kind !== "final_exam").map(item => item.id);
  const summaries = quizzes.length ? await db.getAll(...quizzes.map(item => db.doc(`quizSummaries/${item.id}_${studentId}`))) : [];
  const summaryByQuiz = new Map(summaries.filter(item => item.exists).map(item => [String(item.data()?.quizId ?? ""), item.data() as StoredQuizSummary]));
  const completedChapters = chapterIds.filter(id => Number(summaryByQuiz.get(id)?.attemptCount ?? 0) > 0).length;
  return quizzes.map(document => {
    const data = document.data();
    return catalogEntry(document.id, data, summaryByQuiz.get(document.id), completedChapters, chapterIds.length);
  });
}

function catalogEntry(id: string, data: DocumentData, summary: StoredQuizSummary | undefined, completedChapters: number, totalChapters: number) {
  const kind: QuizKind = data.kind === "final_exam" ? "final_exam" : "chapter_quiz";
  const nextEligibleAt = summary?.nextEligibleAtMillis ? new Date(summary.nextEligibleAtMillis).toISOString() : null;
  const finalUnlocked = completedChapters === totalChapters;
  const cooldown = Boolean(nextEligibleAt && Date.now() < new Date(nextEligibleAt).getTime());
  const attemptsLeft = remainingAttempts(Number(data.maxRetakes ?? -1), summary?.attemptCount ?? 0);
  const eligible = attemptsLeft !== 0 && (kind === "chapter_quiz" || (finalUnlocked && !summary?.passed && !cooldown));
  return { ...quizCatalogRecord(id, data), remainingAttempts: attemptsLeft, eligible, lockReason: eligible ? null : attemptsLeft === 0 ? "No attempts remain" : summary?.passed ? "Final exam already passed" : cooldown ? "Retake cooldown active" : !finalUnlocked ? `Complete all chapter quizzes (${completedChapters}/${totalChapters})` : "Assessment unavailable", completedChapterCount: completedChapters, totalChapterCount: totalChapters, nextEligibleAt, bestPercentage: summary?.bestPercentage ?? 0, attemptCount: summary?.attemptCount ?? 0, passed: summary?.passed ?? false };
}

export async function listAssessmentCatalogPage(studentId: string, input: QuizCatalogRequest): Promise<QuizCatalogPage> {
  const db = getFirebaseAdmin().db;
  const scopes = [...new Map(input.enrollments.map(scope => [JSON.stringify(scope), scope])).values()];
  await Promise.all(scopes.map(scope => assertBatchEnrollment(studentId, scope.courseId, scope.batchId)));
  const batchesByCourse = new Map<string, Set<string>>();
  for (const scope of scopes) {
    const batches = batchesByCourse.get(scope.courseId) ?? new Set<string>();
    batches.add(scope.batchId);
    batchesByCourse.set(scope.courseId, batches);
  }
// Firestore cannot express substring search. Scan projected metadata in
  // bounded chunks, then fetch only the summaries the student actually has.
  const metadata = new Map<string, DocumentData>();
  for (const [courseId, batches] of batchesByCourse) {
    const base = db.collection("quizzes").where("courseId", "==", courseId).where("isPublished", "==", true)
      .orderBy(FieldPath.documentId()).select("courseId", "batchId", "title", "description", "chapter", "kind", "opensAt", "passingPercent", "durationMinutes", "totalMarks", "maxRetakes", "drawQuestionCount", "retakeCooldownHours", "closesAt").limit(200);
    let cursor: QueryDocumentSnapshot | undefined;
    while (true) {
      const snapshot = await (cursor ? base.startAfter(cursor) : base).get();
      for (const document of snapshot.docs) {
        const data = document.data();
        if (!data.batchId || batches.has(String(data.batchId))) metadata.set(document.id, data);
      }
      if (snapshot.size < 200) break;
      cursor = snapshot.docs[snapshot.docs.length - 1];
    }
  }
  const ids = [...metadata.keys()];
  const idSet = new Set(ids);
  const summaries = new Map<string, StoredQuizSummary>();
  const summaryQuery = db.collection("quizSummaries").where("studentId", "==", studentId)
    .orderBy(FieldPath.documentId()).limit(200);
  let summaryCursor: QueryDocumentSnapshot | undefined;
  while (true) {
    const snapshot = await (summaryCursor ? summaryQuery.startAfter(summaryCursor) : summaryQuery).get();
    for (const document of snapshot.docs) {
      const quizId = document.id.slice(0, -(studentId.length + 1));
      const data = document.data() as StoredQuizSummary;
      if (idSet.has(quizId) && data?.quizId) summaries.set(quizId, data);
    }
    if (snapshot.size < 200) break;
    summaryCursor = snapshot.docs[snapshot.docs.length - 1];
  }
  const now = Date.now();
  const records = ids.map(id => {
    const data = metadata.get(id)!;
    const summary = summaries.get(id);
    const completed = Number(summary?.attemptCount ?? 0) > 0;
    const status = completed ? "completed" : (epochMillis(data.opensAt) ?? 0) > now ? "upcoming" : "available";
    return { id, data, status, percentage: summary?.bestPercentage ?? 0 };
  }).sort((a, b) => String(a.data.title ?? "Quiz").localeCompare(String(b.data.title ?? "Quiz"), "en") || a.id.localeCompare(b.id, "en"));
  const completed = records.filter(record => record.status === "completed");
  const scores = completed.map(record => ({ id: record.id, title: String(record.data.title ?? "Quiz"), percentage: record.percentage,
    passed: record.percentage >= (record.data.kind === "final_exam" ? FINAL_PASS_PERCENT : Number(record.data.passingPercent ?? 50)) }));
  const search = input.query.trim().toLowerCase();
  const matching = records.filter(({ data, status }) => (input.filter === "all" || input.filter === status)
    && `${data.title ?? "Quiz"} ${data.description ?? ""} ${data.chapter ?? ""}`.toLowerCase().includes(search));
  const pageSize = 10;
  const page = Math.min(input.page, Math.max(0, Math.ceil(matching.length / pageSize) - 1));
  const selected = matching.slice(page * pageSize, (page + 1) * pageSize);
  const quizzes = selected.map(record => {
    const data = metadata.get(record.id)!;
    const chapters = records.filter(recordItem => recordItem.data.courseId === data.courseId && recordItem.data.kind !== "final_exam"
      && (!recordItem.data.batchId || recordItem.data.batchId === data.batchId || (!data.batchId && recordItem.data.batchId === scopes.find(scope => scope.courseId === data.courseId)?.batchId)));
    return catalogEntry(record.id, data, summaries.get(record.id), chapters.filter(recordItem => recordItem.status === "completed").length, chapters.length);
  });
  return { quizzes, page, pageSize, total: matching.length,
    summary: { total: records.length, completed: completed.length, available: records.filter(record => record.status === "available").length,
      averageScore: completed.length ? Math.round(completed.reduce((sum, record) => sum + record.percentage, 0) / completed.length) : 0,
      bestScore: completed.reduce((best, record) => Math.max(best, record.percentage), 0), passed: scores.filter(score => score.passed).length },
    scores: scores.sort((a, b) => b.percentage - a.percentage || a.id.localeCompare(b.id, "en")).slice(0, 6) };
}

function quizCatalogRecord(id: string, data: DocumentData) {
  const kind: QuizKind = data.kind === "final_exam" ? "final_exam" : "chapter_quiz";
  return { id, title: String(data.title ?? "Quiz"), description: String(data.description ?? ""), durationMinutes: Number(data.durationMinutes ?? 0), totalMarks: Number(data.totalMarks ?? 0), kind, chapter: String(data.chapter ?? ""), passingPercent: kind === "final_exam" ? FINAL_PASS_PERCENT : Number(data.passingPercent ?? 50), maxRetakes: Number(data.maxRetakes ?? -1), drawQuestionCount: Number(data.drawQuestionCount ?? FINAL_DEFAULT_DRAW_COUNT), retakeCooldownHours: Number(data.retakeCooldownHours ?? FINAL_DEFAULT_COOLDOWN_HOURS), opensAt: dateString(data.opensAt), closesAt: dateString(data.closesAt) };
}

export async function listStudentCertificates(studentId: string): Promise<IssuedCertificate[]> {
  const snapshot = await getFirebaseAdmin().db.collection("certificates").where("studentId", "==", studentId).get();
  return snapshot.docs.map(document => {
    const data = document.data();
    return { id: document.id, certificateId: String(data.certificateId ?? document.id), verificationCode: String(data.verificationCode ?? ""), studentId: String(data.studentId ?? studentId), studentName: String(data.studentName ?? "Student"), studentCode: String(data.studentCode ?? ""), courseId: String(data.courseId ?? ""), courseTitle: String(data.courseTitle ?? "Course"), batchId: String(data.batchId ?? ""), batchName: String(data.batchName ?? "Batch"), courseDescription: String(data.courseDescription ?? data.includedTopics ?? ""), quizId: String(data.quizId ?? ""), quizTitle: String(data.quizTitle ?? "Final exam"), score: Number(data.score ?? 0), totalMarks: Number(data.totalMarks ?? 0), percentage: Number(data.percentage ?? 0), attemptNumber: Number(data.attemptNumber ?? 1), issuedAt: dateString(data.issuedAt), templateKey: data.templateKey === "modern" ? "modern" : "classic" } satisfies IssuedCertificate;
  }).sort((left, right) => (right.issuedAt ?? "").localeCompare(left.issuedAt ?? ""));
}
