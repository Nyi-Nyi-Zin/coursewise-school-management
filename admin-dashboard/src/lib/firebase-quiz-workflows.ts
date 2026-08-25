import { collection, deleteField, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';

import { getFirebaseClient } from './firebase';

export type QuizKind = 'chapter_quiz' | 'final_exam';

export type QuizQuestionDraft = {
  id: string;
  prompt: string;
  /** Older questions without a type are treated as multiple choice. */
  type?: 'multiple_choice' | 'multiple_select' | 'true_false';
  options: string[];
  correctAnswerIndex: number;
  /** Used by multiple-select questions. */
  correctAnswerIndices?: number[];
  marks: number;
  sortOrder: number;
};

export type QuizAttemptSummary = {
  id: string;
  studentId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  submittedAt: unknown;
};

/** Correct answers are stored only in the admin-only answerKeys subcollection
 * so student clients can never read them, even for final exams. */
function publicQuestionData(question: QuizQuestionDraft) {
  return {
    prompt: question.prompt,
    ...(question.type ? { type: question.type } : {}),
    options: question.options,
    marks: question.marks,
    sortOrder: question.sortOrder,
    updatedAt: serverTimestamp(),
  };
}

export async function saveQuizQuestion(quizId: string, question: QuizQuestionDraft) {
  const { db } = getFirebaseClient();
  const batch = writeBatch(db);
  batch.set(doc(db, 'quizzes', quizId, 'questions', question.id), publicQuestionData(question), { merge: true });
  batch.set(
    doc(db, 'quizzes', quizId, 'answerKeys', question.id),
    { correctAnswerIndex: question.correctAnswerIndex, ...(question.correctAnswerIndices ? { correctAnswerIndices: question.correctAnswerIndices } : {}), updatedAt: serverTimestamp() },
    { merge: true },
  );
  await batch.commit();
}

export async function deleteQuizQuestion(quizId: string, questionId: string) {
  const { db } = getFirebaseClient();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'quizzes', quizId, 'questions', questionId));
  batch.delete(doc(db, 'quizzes', quizId, 'answerKeys', questionId));
  await batch.commit();
}

export async function loadQuizQuestions(quizId: string): Promise<QuizQuestionDraft[]> {
  const { db } = getFirebaseClient();
  const [questionSnapshot, answerKeySnapshot] = await Promise.all([
    getDocs(query(collection(db, 'quizzes', quizId, 'questions'), orderBy('sortOrder'))),
    getDocs(collection(db, 'quizzes', quizId, 'answerKeys')),
  ]);
  const answerKeys = new Map(answerKeySnapshot.docs.map(key => [key.id, key.data() as { correctAnswerIndex?: number; correctAnswerIndices?: number[] }]));
  return questionSnapshot.docs.map(record => {
    const data = record.data() as Partial<QuizQuestionDraft>;
    const key = answerKeys.get(record.id);
    return {
      id: record.id,
      prompt: String(data.prompt ?? ''),
      options: Array.isArray(data.options) ? data.options : [],
      marks: Number(data.marks ?? 1),
      sortOrder: Number(data.sortOrder ?? 0),
      ...(data.type ? { type: data.type } : {}),
      correctAnswerIndex: Number(key?.correctAnswerIndex ?? -1),
      ...(Array.isArray(key?.correctAnswerIndices) ? { correctAnswerIndices: key!.correctAnswerIndices } : {}),
    };
  });
}

/** Publishing also strips any legacy answer fields that were stored directly on
 * question documents before they moved to answerKeys. */
export async function publishQuiz(quizId: string, questions: QuizQuestionDraft[]) {
  const { db } = getFirebaseClient();
  const quizReference = doc(db, 'quizzes', quizId);
  await updateDoc(quizReference, {
    isPublished: true,
    totalMarks: questions.reduce((total, question) => total + question.marks, 0),
    updatedAt: serverTimestamp(),
  });
  const questionSnapshot = await getDocs(collection(db, 'quizzes', quizId, 'questions'));
  const leaked = questionSnapshot.docs.filter(record => 'correctAnswerIndex' in record.data() || 'correctAnswerIndices' in record.data());
  if (leaked.length) {
    const batch = writeBatch(db);
    leaked.forEach(record => batch.update(record.ref, { correctAnswerIndex: deleteField(), correctAnswerIndices: deleteField() }));
    await batch.commit();
  }
}

export async function loadQuizAttempts(quizId: string): Promise<QuizAttemptSummary[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(query(collection(db, 'quizAttempts'), where('quizId', '==', quizId)));
  return snapshot.docs
    .map(record => ({ id: record.id, ...(record.data() as Omit<QuizAttemptSummary, 'id'>) }))
    .sort((first, second) => submittedAtMillis(second) - submittedAtMillis(first));
}

function submittedAtMillis(attempt: QuizAttemptSummary): number {
  const value = attempt.submittedAt;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }
  const parsed = new Date(String(value)).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}
