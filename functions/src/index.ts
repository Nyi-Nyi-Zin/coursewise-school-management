import { randomBytes } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  evaluateAttemptEligibility,
  mergeQuizSummary,
  remainingAttempts,
  type AttemptOutcome,
  type QuizKind,
  type StoredQuizSummary,
} from './grading-core.js';
import { calculateTrustedQuizScore, type SubmittedQuizAnswer, type TrustedQuizQuestion } from './scoring.js';

initializeApp();

async function assertBatchEnrollment(studentId: string, courseId: string, batchId: string) {
  const enrollment = await getFirestore().doc(`enrollments/${courseId}_${batchId}_${studentId}`).get();
  if (!enrollment.exists || enrollment.data()?.status !== 'active') {
    throw new HttpsError('permission-denied', 'You are not enrolled in this course batch.');
  }
}

async function assertAdmin(userId: string) {
  const user = await getFirestore().collection('users').doc(userId).get();
  if (!user.exists || user.data()?.role !== 'admin') throw new HttpsError('permission-denied', 'Administrator access is required.');
}

function parseSubmittedAnswers(raw: unknown): SubmittedQuizAnswer[] {
  if (!Array.isArray(raw)) throw new HttpsError('invalid-argument', 'An answer list is required.');
  return raw.map(answer => {
    if (typeof answer !== 'object' || answer === null || typeof (answer as SubmittedQuizAnswer).questionId !== 'string') {
      throw new HttpsError('invalid-argument', 'Every answer needs a question ID.');
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
  const parsed = typeof value === 'string' || typeof value === 'number' ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

type AnswerKeyRecord = { correctAnswerIndex: number; correctAnswerIndices?: number[] };

function buildReview(
  questionIds: string[],
  answerKeys: Map<string, AnswerKeyRecord>,
  answers: SubmittedQuizAnswer[],
  graded: Array<{ questionId: string; marksEarned: number }>,
) {
  const marksByQuestion = new Map(graded.map(entry => [entry.questionId, entry.marksEarned]));
  const answersByQuestion = new Map(answers.map(answer => [answer.questionId, answer]));
  return questionIds.map(questionId => {
    const key = answerKeys.get(questionId);
    const answer = answersByQuestion.get(questionId);
    return {
      questionId,
      selectedIndex: typeof answer?.selectedAnswerIndex === 'number' && answer.selectedAnswerIndex >= 0 ? answer.selectedAnswerIndex : null,
      selectedIndices: answer?.selectedIndices ?? [],
      correctAnswerIndex: key?.correctAnswerIndex ?? -1,
      correctAnswerIndices: key?.correctAnswerIndices ?? [],
      marksEarned: marksByQuestion.get(questionId) ?? 0,
    };
  });
}

async function loadAssessmentContext(quizId: string) {
  const db = getFirestore();
  const quiz = await db.collection('quizzes').doc(quizId).get();
  if (!quiz.exists || quiz.data()?.isPublished !== true) {
    throw new HttpsError('not-found', 'This assessment is not available.');
  }
  const data = quiz.data() ?? {};
  const courseId = String(data.courseId ?? '');
  const batchId = String(data.batchId ?? '');
  if (!courseId || !batchId) throw new HttpsError('failed-precondition', 'This assessment is missing course or batch information.');
  const questionSnapshot = await quiz.ref.collection('questions').orderBy('sortOrder').get();
  const questionIds = questionSnapshot.docs.map(document => document.id);
  if (!questionIds.length) throw new HttpsError('failed-precondition', 'This assessment has no questions yet.');
  const answerKeySnapshot = await quiz.ref.collection('answerKeys').get();
  const answerKeys = new Map<string, AnswerKeyRecord>(
    answerKeySnapshot.docs.map(keyDocument => [
      keyDocument.id,
      {
        correctAnswerIndex: Math.trunc(Number(keyDocument.data().correctAnswerIndex ?? -1)),
        ...(Array.isArray(keyDocument.data().correctAnswerIndices) ? { correctAnswerIndices: keyDocument.data().correctAnswerIndices as number[] } : {}),
      },
    ]),
  );
  const questions: TrustedQuizQuestion[] = questionSnapshot.docs.map(document => ({
    id: document.id,
    correctAnswerIndex: answerKeys.get(document.id)?.correctAnswerIndex ?? -1,
    ...(answerKeys.get(document.id)?.correctAnswerIndices ? { correctAnswerIndices: answerKeys.get(document.id)?.correctAnswerIndices } : {}),
    marks: Math.max(1, Math.trunc(Number(document.data().marks ?? 1))),
  }));
  const kind: QuizKind = data.kind === 'final_exam' ? 'final_exam' : 'chapter_quiz';
  return {
    db,
    quizRef: quiz.ref,
    courseId,
    batchId,
    questionIds,
    questions,
    answerKeys,
    kind,
    passingPercent: Number.isFinite(Number(data.passingPercent)) ? Math.min(100, Math.max(0, Number(data.passingPercent))) : null,
    maxRetakes: Number.isFinite(Number(data.maxRetakes)) ? Math.trunc(Number(data.maxRetakes)) : -1,
    durationSeconds: Math.max(0, Math.trunc(Number(data.durationMinutes ?? 0))) * 60,
    opensAt: epochMillis(data.opensAt),
    closesAt: epochMillis(data.closesAt),
    title: String(data.title ?? 'Assessment'),
    chapter: String(data.chapter ?? ''),
  };
}

export const submitQuizAttempt = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before submitting an assessment.');
  const studentId = request.auth.uid;
  const quizId = request.data?.quizId;
  if (typeof quizId !== 'string' || !quizId) throw new HttpsError('invalid-argument', 'A quiz ID is required.');
  const answers = parseSubmittedAnswers(request.data?.answers);
  const startedAtRaw = Number(request.data?.startedAt);
  const startedAt = Number.isFinite(startedAtRaw) && startedAtRaw > 0 ? startedAtRaw : null;

  const context = await loadAssessmentContext(quizId);
  await assertBatchEnrollment(studentId, context.courseId, context.batchId);

  const now = Date.now();
  const grading = calculateTrustedQuizScore(context.questions, answers);
  const summaryReference = context.db.doc(`quizSummaries/${quizId}_${studentId}`);
  const counterReference = context.db.doc(`quizAttemptCounters/${quizId}_${studentId}`);

  const committed = await context.db.runTransaction(async transaction => {
    const [summarySnapshot, counterSnapshot] = await Promise.all([transaction.get(summaryReference), transaction.get(counterReference)]);
    const previousSummary = summarySnapshot.exists ? (summarySnapshot.data() as StoredQuizSummary) : undefined;
    const recordedAttempts = counterSnapshot.exists ? Math.trunc(Number(counterSnapshot.data()?.count ?? 0)) : previousSummary?.attemptCount ?? 0;

    const eligibility = evaluateAttemptEligibility({
      kind: context.kind,
      now,
      opensAt: context.opensAt,
      closesAt: context.closesAt,
      durationSeconds: context.durationSeconds,
      startedAt,
      previousAttempts: recordedAttempts,
      alreadyPassed: previousSummary?.passed === true,
      maxRetakes: context.maxRetakes,
    });
    if (!eligibility.ok) throw new HttpsError('failed-precondition', eligibility.message);

    const attemptReference = context.db.collection('quizAttempts').doc();
    const attemptNumber = recordedAttempts + 1;
    const passingThreshold = context.passingPercent ?? 50;
    const passed = grading.percentage >= passingThreshold;
    const outcome: AttemptOutcome = {
      attemptId: attemptReference.id,
      attemptNumber,
      score: grading.score,
      totalMarks: grading.totalMarks,
      percentage: grading.percentage,
      passed,
      timeSpentSeconds: eligibility.elapsedSeconds,
      submittedAtMillis: now,
    };

    transaction.set(attemptReference, {
      quizId,
      kind: context.kind,
      studentId,
      courseId: context.courseId,
      batchId: context.batchId,
      attemptNumber,
      answers,
      score: grading.score,
      totalMarks: grading.totalMarks,
      percentage: grading.percentage,
      passed,
      timeSpentSeconds: eligibility.elapsedSeconds,
      submittedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(counterReference, { quizId, studentId, count: attemptNumber, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(summaryReference, mergeQuizSummary(previousSummary, outcome, context.kind, quizId, studentId), { merge: true });

    return { outcome, attemptNumber };
  });

  return {
    id: committed.outcome.attemptId,
    kind: context.kind,
    score: grading.score,
    totalMarks: grading.totalMarks,
    percentage: grading.percentage,
    passed: committed.outcome.passed,
    attemptNumber: committed.outcome.attemptNumber,
    attemptCount: committed.outcome.attemptNumber,
    remainingAttempts: remainingAttempts(context.maxRetakes, committed.outcome.attemptNumber),
    timeSpentSeconds: committed.outcome.timeSpentSeconds,
    ...(context.kind === 'chapter_quiz'
      ? { review: buildReview(context.questionIds, context.answerKeys, answers, grading.gradedQuestions) }
      : {}),
  };
});

export const getMyQuizResults = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before viewing your results.');
  const studentId = request.auth.uid;
  const quizId = request.data?.quizId;
  if (typeof quizId !== 'string' || !quizId) throw new HttpsError('invalid-argument', 'A quiz ID is required.');

  const context = await loadAssessmentContext(quizId);
  await assertBatchEnrollment(studentId, context.courseId, context.batchId);

  const summarySnapshot = await context.db.doc(`quizSummaries/${quizId}_${studentId}`).get();
  const summary = summarySnapshot.exists ? (summarySnapshot.data() as StoredQuizSummary) : undefined;

  let review: ReturnType<typeof buildReview> | undefined;
  if (context.kind === 'chapter_quiz' && summary?.latestAttemptId) {
    const latestAttempt = await context.db.doc(`quizAttempts/${summary.latestAttemptId}`).get();
    if (latestAttempt.exists) {
      const storedAnswers = Array.isArray(latestAttempt.data()?.answers) ? (latestAttempt.data()!.answers as SubmittedQuizAnswer[]) : [];
      const latestGrading = calculateTrustedQuizScore(context.questions, storedAnswers);
      review = buildReview(context.questionIds, context.answerKeys, storedAnswers, latestGrading.gradedQuestions);
    }
  }

  return {
    quizId,
    kind: context.kind,
    title: context.title,
    chapter: context.chapter,
    passingPercent: context.passingPercent ?? 50,
    attemptCount: summary?.attemptCount ?? 0,
    remainingAttempts: remainingAttempts(context.maxRetakes, summary?.attemptCount ?? 0),
    bestPercentage: summary?.bestPercentage ?? 0,
    passed: summary?.passed ?? false,
    latest: summary ? {
      score: summary.latestScore,
      totalMarks: summary.latestTotalMarks,
      percentage: summary.latestPercentage,
      passed: summary.latestPassed,
      timeSpentSeconds: summary.latestTimeSpentSeconds,
      submittedAtMillis: summary.latestSubmittedAtMillis,
    } : null,
    ...(review ? { review } : {}),
  };
});

export const adminListStudentResults = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before viewing results.');
  await assertAdmin(request.auth.uid);
  const studentId = request.data?.studentId;
  if (typeof studentId !== 'string' || !studentId) throw new HttpsError('invalid-argument', 'A student ID is required.');

  const summarySnapshot = await getFirestore().collection('quizSummaries').where('studentId', '==', studentId).get();
  const results = await Promise.all(summarySnapshot.docs.map(async summaryDocument => {
    const summary = summaryDocument.data() as StoredQuizSummary;
    const quiz = summary.quizId ? await getFirestore().collection('quizzes').doc(summary.quizId).get() : null;
    return {
      quizId: summary.quizId,
      quizTitle: String(quiz?.data()?.title ?? 'Assessment'),
      chapter: String(quiz?.data()?.chapter ?? ''),
      kind: summary.kind,
      attemptCount: summary.attemptCount,
      bestScore: summary.bestScore,
      bestTotalMarks: summary.bestTotalMarks,
      bestPercentage: summary.bestPercentage,
      latestPercentage: summary.latestPercentage,
      latestPassed: summary.latestPassed,
      passed: summary.passed,
      submittedAtMillis: summary.latestSubmittedAtMillis,
      timeSpentSeconds: summary.latestTimeSpentSeconds,
    };
  }));
  return { results };
});

export const adminCreateStudentAccount = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before creating a student account.');
  await assertAdmin(request.auth.uid);

  const name = String(request.data?.name ?? '').trim();
  const email = String(request.data?.email ?? '').trim().toLowerCase();
  const studentId = String(request.data?.studentId ?? '').trim();
  const photoUrl = typeof request.data?.photoUrl === 'string' ? request.data.photoUrl.trim() : '';
  const isActive = request.data?.isActive !== false;
  if (!name || !email.includes('@') || !studentId) {
    throw new HttpsError('invalid-argument', 'A student name, email address, and student ID are required.');
  }

  const auth = getAuth();
  try {
    const user = await auth.createUser({ email, password: randomBytes(18).toString('base64url'), displayName: name });
    await getFirestore().collection('users').doc(user.uid).set({
      name,
      email,
      role: 'student',
      studentId,
      isActive,
      ...(photoUrl ? { photoUrl } : {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const resetLink = await auth.generatePasswordResetLink(email);
    return { uid: user.uid, resetLink };
  } catch (error) {
    if (typeof error === 'object' && error && 'errorInfo' in error) {
      const code = (error as { errorInfo?: { code?: string } }).errorInfo?.code ?? '';
      if (code.includes('email-already-exists')) throw new HttpsError('already-exists', 'An account with this email already exists.');
      if (code.includes('invalid-email')) throw new HttpsError('invalid-argument', 'The email address is not valid.');
    }
    throw new HttpsError('internal', 'Could not create the student account.');
  }
});

export const adminListStudents = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before viewing students.');
  await assertAdmin(request.auth.uid);

  const snapshot = await getFirestore().collection('users').where('role', '==', 'student').get();
  return snapshot.docs.map(student => ({ id: student.id, data: student.data() }));
});

export const adminCreatePasswordResetLink = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before requesting a reset link.');
  await assertAdmin(request.auth.uid);
  const email = request.data?.email;
  if (typeof email !== 'string' || !email.includes('@')) throw new HttpsError('invalid-argument', 'A student email address is required.');
  const link = await getAuth().generatePasswordResetLink(email);
  return { link };
});
