import "server-only";

import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { ApiError } from "@/lib/server-api";

type QuizKind = "chapter_quiz" | "final_exam";
type SubmittedQuizAnswer = { questionId: string; selectedAnswerIndex: number; selectedIndices?: number[] };
type TrustedQuizQuestion = { id: string; correctAnswerIndex: number; correctAnswerIndices?: number[]; marks: number };
type AttemptOutcome = { attemptId: string; attemptNumber: number; score: number; totalMarks: number; percentage: number; passed: boolean; timeSpentSeconds: number; submittedAtMillis: number };
type StoredQuizSummary = {
  quizId: string; studentId: string; kind: QuizKind; attemptCount: number;
  bestScore: number; bestTotalMarks: number; bestPercentage: number; bestAttemptId: string | null;
  latestAttemptId: string | null; latestScore: number; latestTotalMarks: number; latestPercentage: number;
  latestPassed: boolean; latestSubmittedAtMillis: number | null; latestTimeSpentSeconds: number; passed: boolean;
};
type AnswerKeyRecord = { correctAnswerIndex: number; correctAnswerIndices?: number[] };

// A final exam score at or above this percentage automatically issues a course certificate.
const CERTIFICATE_PASS_PERCENT = 70;

export type IssuedCertificate = {
  id: string; certificateId: string; verificationCode: string;
  studentId: string; studentName: string; studentCode: string;
  courseId: string; courseTitle: string; batchId: string; batchName: string;
  quizId: string; quizTitle: string;
  score: number; totalMarks: number; percentage: number;
  attemptNumber: number; issuedAt: string | null;
  templateKey: "classic" | "modern";
};

function randomCode(length: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < length; index += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

async function loadCertificateSnapshot(studentId: string, courseId: string, batchId: string, quizTitle: string) {
  const db = getFirebaseAdmin().db;
  const [student, course, batch] = await Promise.all([
    db.doc(`users/${studentId}`).get(),
    db.doc(`courses/${courseId}`).get(),
    db.doc(`batches/${batchId}`).get(),
  ]);
  return {
    studentName: String(student.data()?.name ?? "Student"),
    studentCode: String(student.data()?.studentId ?? "Pending"),
    courseTitle: String(course.data()?.title ?? "Course"),
    batchName: String(batch.data()?.name ?? "Batch"),
    quizTitle,
  };
}

export async function listStudentCertificates(studentId: string): Promise<IssuedCertificate[]> {
  const snapshot = await getFirebaseAdmin().db.collection("certificates").where("studentId", "==", studentId).get();
  const records = snapshot.docs.map(document => {
    const data = document.data();
    return {
      id: document.id,
      certificateId: String(data.certificateId ?? document.id),
      verificationCode: String(data.verificationCode ?? ""),
      studentId: String(data.studentId ?? studentId),
      studentName: String(data.studentName ?? "Student"),
      studentCode: String(data.studentCode ?? ""),
      courseId: String(data.courseId ?? ""),
      courseTitle: String(data.courseTitle ?? "Course"),
      batchId: String(data.batchId ?? ""),
      batchName: String(data.batchName ?? "Batch"),
      quizId: String(data.quizId ?? ""),
      quizTitle: String(data.quizTitle ?? "Final exam"),
      score: Number(data.score ?? 0),
      totalMarks: Number(data.totalMarks ?? 0),
      percentage: Number(data.percentage ?? 0),
      attemptNumber: Number(data.attemptNumber ?? 1),
      issuedAt: dateString(data.issuedAt),
      templateKey: data.templateKey === "modern" ? "modern" : "classic",
    } satisfies IssuedCertificate;
  });
  return records.sort((left, right) => (right.issuedAt ?? "").localeCompare(left.issuedAt ?? ""));
}

export async function assertBatchEnrollment(studentId: string, courseId: string, batchId: string) {
  const enrollment = await getFirebaseAdmin().db.doc(`enrollments/${courseId}_${batchId}_${studentId}`).get();
  if (!enrollment.exists || enrollment.data()?.status !== "active") {
    throw new ApiError(403, "You are not enrolled in this course batch.");
  }
}

export function parseSubmittedAnswers(raw: unknown): SubmittedQuizAnswer[] {
  if (!Array.isArray(raw)) throw new ApiError(400, "An answer list is required.");
  return raw.map(answer => {
    if (typeof answer !== "object" || answer === null || typeof (answer as SubmittedQuizAnswer).questionId !== "string") {
      throw new ApiError(400, "Every answer needs a question ID.");
    }
    const parsed = answer as Partial<SubmittedQuizAnswer>;
    const selectedIndices = Array.isArray(parsed.selectedIndices)
      ? parsed.selectedIndices.map(index => Math.trunc(Number(index))).filter(index => Number.isInteger(index))
      : undefined;
    const selectedAnswerIndex = Number.isFinite(Number(parsed.selectedAnswerIndex)) ? Math.trunc(Number(parsed.selectedAnswerIndex)) : -1;
    return { questionId: parsed.questionId as string, selectedAnswerIndex, ...(selectedIndices?.length ? { selectedIndices } : {}) };
  });
}

function epochMillis(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    const millis = Number(value.toMillis());
    return Number.isFinite(millis) ? millis : null;
  }
  const parsed = typeof value === "string" || typeof value === "number" ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function dateString(value: unknown): string | null {
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().toISOString();
  return null;
}

function normalizeSelection(answer: SubmittedQuizAnswer | undefined) {
  if (!answer) return [];
  const source = Array.isArray(answer.selectedIndices) ? answer.selectedIndices : [answer.selectedAnswerIndex];
  return [...new Set(source.filter(Number.isInteger))].sort((left, right) => left - right);
}

function normalizeKey(indices: number[] | undefined, fallback: number) {
  const source = Array.isArray(indices) && indices.length ? indices : [fallback];
  return [...new Set(source.filter(Number.isInteger))].sort((left, right) => left - right);
}

function calculateScore(questions: TrustedQuizQuestion[], answers: SubmittedQuizAnswer[]) {
  const answersByQuestion = new Map(answers.map(answer => [answer.questionId, answer]));
  const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
  const gradedQuestions = questions.map(question => {
    const expected = normalizeKey(question.correctAnswerIndices, question.correctAnswerIndex);
    const actual = normalizeSelection(answersByQuestion.get(question.id));
    const correct = expected.length === actual.length && expected.every((value, index) => value === actual[index]);
    return { questionId: question.id, marksEarned: correct ? question.marks : 0 };
  });
  const score = gradedQuestions.reduce((total, question) => total + question.marksEarned, 0);
  return { score, totalMarks, percentage: totalMarks ? Math.round((score / totalMarks) * 100) : 0, gradedQuestions };
}

function buildReview(questionIds: string[], answerKeys: Map<string, AnswerKeyRecord>, answers: SubmittedQuizAnswer[], graded: Array<{ questionId: string; marksEarned: number }>) {
  const marksByQuestion = new Map(graded.map(entry => [entry.questionId, entry.marksEarned]));
  const answersByQuestion = new Map(answers.map(answer => [answer.questionId, answer]));
  return questionIds.map(questionId => {
    const key = answerKeys.get(questionId);
    const answer = answersByQuestion.get(questionId);
    return {
      questionId,
      selectedIndex: typeof answer?.selectedAnswerIndex === "number" && answer.selectedAnswerIndex >= 0 ? answer.selectedAnswerIndex : null,
      selectedIndices: answer?.selectedIndices ?? [],
      correctAnswerIndex: key?.correctAnswerIndex ?? -1,
      correctAnswerIndices: key?.correctAnswerIndices ?? [],
      marksEarned: marksByQuestion.get(questionId) ?? 0,
    };
  });
}

async function loadAssessmentContext(quizId: string) {
  const db = getFirebaseAdmin().db;
  const quiz = await db.doc(`quizzes/${quizId}`).get();
  if (!quiz.exists || quiz.data()?.isPublished !== true) throw new ApiError(404, "This assessment is not available.");
  const data = quiz.data() ?? {};
  const courseId = String(data.courseId ?? "");
  const batchId = String(data.batchId ?? "");
  if (!courseId || !batchId) throw new ApiError(409, "This assessment is missing course or batch information.");
  const [questionSnapshot, answerKeySnapshot] = await Promise.all([
    quiz.ref.collection("questions").orderBy("sortOrder").get(),
    quiz.ref.collection("answerKeys").get(),
  ]);
  if (questionSnapshot.empty) throw new ApiError(409, "This assessment has no questions yet.");
  const answerKeys = new Map<string, AnswerKeyRecord>(answerKeySnapshot.docs.map(document => [document.id, {
    correctAnswerIndex: Math.trunc(Number(document.data().correctAnswerIndex ?? -1)),
    ...(Array.isArray(document.data().correctAnswerIndices) ? { correctAnswerIndices: document.data().correctAnswerIndices as number[] } : {}),
  }]));
  const questions = questionSnapshot.docs.map(document => ({
    id: document.id,
    correctAnswerIndex: answerKeys.get(document.id)?.correctAnswerIndex ?? -1,
    ...(answerKeys.get(document.id)?.correctAnswerIndices ? { correctAnswerIndices: answerKeys.get(document.id)?.correctAnswerIndices } : {}),
    marks: Math.max(1, Math.trunc(Number(document.data().marks ?? 1))),
  }));
  return {
    db, courseId, batchId, questions, answerKeys, questionIds: questionSnapshot.docs.map(document => document.id),
    kind: (data.kind === "final_exam" ? "final_exam" : "chapter_quiz") as QuizKind,
    passingPercent: Number.isFinite(Number(data.passingPercent)) ? Math.min(100, Math.max(0, Number(data.passingPercent))) : 50,
    maxRetakes: Number.isFinite(Number(data.maxRetakes)) ? Math.trunc(Number(data.maxRetakes)) : -1,
    durationSeconds: Math.max(0, Math.trunc(Number(data.durationMinutes ?? 0))) * 60,
    opensAt: epochMillis(data.opensAt), closesAt: epochMillis(data.closesAt),
    title: String(data.title ?? "Assessment"), chapter: String(data.chapter ?? ""),
  };
}

function remainingAttempts(maxRetakes: number, previousAttempts: number) {
  return !Number.isFinite(maxRetakes) || maxRetakes < 0 ? null : Math.max(0, maxRetakes + 1 - previousAttempts);
}

function elapsedSeconds(kind: QuizKind, durationSeconds: number, startedAt: number | null, now: number) {
  if (startedAt === null) return 0;
  if (kind === "final_exam" && durationSeconds > 0) {
    if (now - startedAt > (durationSeconds + 120) * 1000) throw new ApiError(409, "Time is up for this assessment.");
    return Math.min(durationSeconds, Math.round(Math.max(0, now - startedAt) / 1000));
  }
  // Chapter quizzes are untimed: report real elapsed time without enforcing a limit.
  return Math.round(Math.max(0, now - startedAt) / 1000);
}

function emptySummary(quizId: string, studentId: string, kind: QuizKind): StoredQuizSummary {
  return { quizId, studentId, kind, attemptCount: 0, bestScore: 0, bestTotalMarks: 0, bestPercentage: 0, bestAttemptId: null, latestAttemptId: null, latestScore: 0, latestTotalMarks: 0, latestPercentage: 0, latestPassed: false, latestSubmittedAtMillis: null, latestTimeSpentSeconds: 0, passed: false };
}

function mergeSummary(previous: StoredQuizSummary | undefined, outcome: AttemptOutcome, kind: QuizKind, quizId: string, studentId: string) {
  const base = previous ?? emptySummary(quizId, studentId, kind);
  const beatsBest = outcome.percentage > base.bestPercentage || (outcome.percentage === base.bestPercentage && outcome.score > base.bestScore);
  return { ...base, kind, attemptCount: base.attemptCount + 1, bestScore: beatsBest ? outcome.score : base.bestScore, bestTotalMarks: beatsBest ? outcome.totalMarks : base.bestTotalMarks, bestPercentage: beatsBest ? outcome.percentage : base.bestPercentage, bestAttemptId: beatsBest ? outcome.attemptId : base.bestAttemptId ?? outcome.attemptId, latestAttemptId: outcome.attemptId, latestScore: outcome.score, latestTotalMarks: outcome.totalMarks, latestPercentage: outcome.percentage, latestPassed: outcome.passed, latestSubmittedAtMillis: outcome.submittedAtMillis, latestTimeSpentSeconds: outcome.timeSpentSeconds, passed: base.passed || outcome.passed } satisfies StoredQuizSummary;
}

export async function submitQuiz(studentId: string, quizId: string, rawAnswers: unknown, rawStartedAt: unknown) {
  const answers = parseSubmittedAnswers(rawAnswers);
  const parsedStartedAt = Number(rawStartedAt);
  const startedAt = Number.isFinite(parsedStartedAt) && parsedStartedAt > 0 ? parsedStartedAt : null;
  const context = await loadAssessmentContext(quizId);
  await assertBatchEnrollment(studentId, context.courseId, context.batchId);
  const grading = calculateScore(context.questions, answers);
  const now = Date.now();
  const summaryReference = context.db.doc(`quizSummaries/${quizId}_${studentId}`);
  const counterReference = context.db.doc(`quizAttemptCounters/${quizId}_${studentId}`);
  const certificateReference = context.db.doc(`certificates/cert_${quizId}_${studentId}`);
  const certificateSnapshotData = context.kind === "final_exam" && grading.percentage >= CERTIFICATE_PASS_PERCENT
    ? await loadCertificateSnapshot(studentId, context.courseId, context.batchId, context.title)
    : null;

  const outcome = await context.db.runTransaction(async transaction => {
    const summarySnapshot = await transaction.get(summaryReference);
    const counterSnapshot = await transaction.get(counterReference);
    // Firestore requires every transaction read to happen before its first
    // write. A qualifying final-exam submission also needs to check whether a
    // certificate already exists, so perform that optional read up front.
    const certificateSnapshot = certificateSnapshotData
      ? await transaction.get(certificateReference)
      : null;
    const previous = summarySnapshot.exists ? summarySnapshot.data() as StoredQuizSummary : undefined;
    const previousAttempts = counterSnapshot.exists ? Math.trunc(Number(counterSnapshot.data()?.count ?? 0)) : previous?.attemptCount ?? 0;
    if (context.opensAt !== null && now < context.opensAt) throw new ApiError(409, "This assessment is not open yet.");
    if (context.closesAt !== null && now >= context.closesAt) throw new ApiError(409, "This assessment is closed.");
    if (context.kind === "final_exam" && previous?.passed) throw new ApiError(409, "You already passed this final exam.");
    if (remainingAttempts(context.maxRetakes, previousAttempts) === 0) throw new ApiError(409, "No attempts remain for this quiz.");
    const attemptReference = context.db.collection("quizAttempts").doc();
    const attempt: AttemptOutcome = { attemptId: attemptReference.id, attemptNumber: previousAttempts + 1, score: grading.score, totalMarks: grading.totalMarks, percentage: grading.percentage, passed: grading.percentage >= context.passingPercent, timeSpentSeconds: elapsedSeconds(context.kind, context.durationSeconds, startedAt, now), submittedAtMillis: now };
    transaction.set(attemptReference, { quizId, kind: context.kind, studentId, courseId: context.courseId, batchId: context.batchId, attemptNumber: attempt.attemptNumber, answers, score: attempt.score, totalMarks: attempt.totalMarks, percentage: attempt.percentage, passed: attempt.passed, timeSpentSeconds: attempt.timeSpentSeconds, submittedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() });
    transaction.set(counterReference, { quizId, studentId, count: attempt.attemptNumber, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(summaryReference, mergeSummary(previous, attempt, context.kind, quizId, studentId), { merge: true });
    let certificateIssued = false;
    if (certificateSnapshotData && !previous?.passed && attempt.percentage >= CERTIFICATE_PASS_PERCENT) {
      // Deterministic document ID keeps issuance idempotent: a re-graded or
      // repeated qualifying attempt can never mint a second certificate, and
      // the original issue date is preserved.
      if (!certificateSnapshot?.exists) {
        transaction.set(certificateReference, {
          certificateId: `CT-${new Date(now).getFullYear()}-${randomCode(6)}`,
          verificationCode: randomCode(10),
          studentId,
          ...certificateSnapshotData,
          courseId: context.courseId,
          batchId: context.batchId,
          quizId,
          score: attempt.score,
          totalMarks: attempt.totalMarks,
          percentage: attempt.percentage,
          attemptNumber: attempt.attemptNumber,
          issuedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          templateKey: "classic",
        });
        certificateIssued = true;
      }
    }
    return { attempt, certificateIssued };
  });

  return { id: outcome.attempt.attemptId, kind: context.kind, score: outcome.attempt.score, totalMarks: outcome.attempt.totalMarks, percentage: outcome.attempt.percentage, passed: outcome.attempt.passed, attemptNumber: outcome.attempt.attemptNumber, attemptCount: outcome.attempt.attemptNumber, remainingAttempts: remainingAttempts(context.maxRetakes, outcome.attempt.attemptNumber), timeSpentSeconds: outcome.attempt.timeSpentSeconds, certificateIssued: outcome.certificateIssued, ...(context.kind === "chapter_quiz" ? { review: buildReview(context.questionIds, context.answerKeys, answers, grading.gradedQuestions) } : {}) };
}

export async function loadQuizResults(studentId: string, quizId: string) {
  const context = await loadAssessmentContext(quizId);
  await assertBatchEnrollment(studentId, context.courseId, context.batchId);
  const summarySnapshot = await context.db.doc(`quizSummaries/${quizId}_${studentId}`).get();
  const summary = summarySnapshot.exists ? summarySnapshot.data() as StoredQuizSummary : undefined;
  let review: ReturnType<typeof buildReview> | undefined;
  if (context.kind === "chapter_quiz" && summary?.latestAttemptId) {
    const latest = await context.db.doc(`quizAttempts/${summary.latestAttemptId}`).get();
    if (latest.exists) {
      const answers = Array.isArray(latest.data()?.answers) ? latest.data()!.answers as SubmittedQuizAnswer[] : [];
      review = buildReview(context.questionIds, context.answerKeys, answers, calculateScore(context.questions, answers).gradedQuestions);
    }
  }
  return { quizId, kind: context.kind, title: context.title, chapter: context.chapter, passingPercent: context.passingPercent, attemptCount: summary?.attemptCount ?? 0, remainingAttempts: remainingAttempts(context.maxRetakes, summary?.attemptCount ?? 0), bestPercentage: summary?.bestPercentage ?? 0, passed: summary?.passed ?? false, latest: summary ? { score: summary.latestScore, totalMarks: summary.latestTotalMarks, percentage: summary.latestPercentage, passed: summary.latestPassed, timeSpentSeconds: summary.latestTimeSpentSeconds, submittedAtMillis: summary.latestSubmittedAtMillis } : null, ...(review ? { review } : {}) };
}

export async function listBatchQuizzes(studentId: string, courseId: string, batchId: string) {
  await assertBatchEnrollment(studentId, courseId, batchId);
  const snapshot = await getFirebaseAdmin().db.collection("quizzes").where("courseId", "==", courseId).where("batchId", "==", batchId).where("isPublished", "==", true).get();
  return snapshot.docs.map(document => quizCatalogRecord(document.id, document.data()));
}

function quizCatalogRecord(id: string, data: DocumentData) {
  return { id, title: String(data.title ?? "Quiz"), description: String(data.description ?? ""), durationMinutes: Number(data.durationMinutes ?? 0), totalMarks: Number(data.totalMarks ?? 0), kind: data.kind === "final_exam" ? "final_exam" : "chapter_quiz", chapter: String(data.chapter ?? ""), passingPercent: Number(data.passingPercent ?? 50), maxRetakes: Number(data.maxRetakes ?? -1), opensAt: dateString(data.opensAt), closesAt: dateString(data.closesAt) };
}
