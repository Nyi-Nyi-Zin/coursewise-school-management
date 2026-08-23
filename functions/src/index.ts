import { randomBytes } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { calculateTrustedQuizScore } from './scoring.js';

initializeApp();

type SubmittedAnswer = { questionId: string; selectedAnswerIndex: number };

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

export const submitQuizAttempt = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before submitting a quiz.');

  const quizId = request.data?.quizId;
  const answers = request.data?.answers as SubmittedAnswer[] | undefined;
  if (typeof quizId !== 'string' || !Array.isArray(answers)) {
    throw new HttpsError('invalid-argument', 'A quiz ID and answer list are required.');
  }

  const db = getFirestore();
  const quiz = await db.collection('quizzes').doc(quizId).get();
  if (!quiz.exists || quiz.data()?.isPublished !== true) {
    throw new HttpsError('not-found', 'This quiz is not available.');
  }
  const now = Date.now();
  const opensAt = quiz.data()?.opensAt ? new Date(String(quiz.data()?.opensAt)).getTime() : null;
  const closesAt = quiz.data()?.closesAt ? new Date(String(quiz.data()?.closesAt)).getTime() : null;
  if ((opensAt !== null && now < opensAt) || (closesAt !== null && now >= closesAt)) {
    throw new HttpsError('failed-precondition', 'This quiz is not open at this time.');
  }

  const courseId = String(quiz.data()?.courseId ?? '');
  const batchId = String(quiz.data()?.batchId ?? '');
  if (!courseId || !batchId) throw new HttpsError('failed-precondition', 'This quiz is missing course or batch information.');
  await assertBatchEnrollment(request.auth.uid, courseId, batchId);

  const questionSnapshot = await quiz.ref.collection('questions').orderBy('sortOrder').get();
  const answerKeySnapshot = await quiz.ref.collection('answerKeys').get();
  const answerKeys = new Map(answerKeySnapshot.docs.map(key => [key.id, Number(key.data().correctAnswerIndex)]));
  const result = calculateTrustedQuizScore(
    questionSnapshot.docs.map(question => ({ id: question.id, correctAnswerIndex: answerKeys.get(question.id) ?? -1, marks: Number(question.data().marks ?? 1) })),
    answers,
  );
  const attempt = await db.collection('quizAttempts').add({
    quizId,
    studentId: request.auth.uid,
    courseId,
    batchId,
    answers: answers.map(answer => ({ questionId: answer.questionId, selectedAnswerIndex: answer.selectedAnswerIndex })),
    ...result,
    submittedAt: FieldValue.serverTimestamp(),
  });

  return { id: attempt.id, ...result };
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
