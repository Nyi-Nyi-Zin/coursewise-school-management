import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { calculateTrustedQuizScore } from './scoring.js';

initializeApp();

type SubmittedAnswer = { questionId: string; selectedAnswerIndex: number };

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

  const questionSnapshot = await quiz.ref.collection('questions').orderBy('sortOrder').get();
  const result = calculateTrustedQuizScore(
    questionSnapshot.docs.map(question => ({ id: question.id, correctAnswerIndex: Number(question.data().correctAnswerIndex), marks: Number(question.data().marks ?? 1) })),
    answers,
  );
  const attempt = await db.collection('quizAttempts').add({
    quizId,
    studentId: request.auth.uid,
    answers: answers.map(answer => ({ questionId: answer.questionId, selectedAnswerIndex: answer.selectedAnswerIndex })),
    ...result,
    submittedAt: FieldValue.serverTimestamp(),
  });

  return { id: attempt.id, ...result };
});
