import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import { getFirebaseClient } from './firebase';

export type QuizQuestionDraft = {
  id: string;
  prompt: string;
  options: string[];
  correctAnswerIndex: number;
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

export async function loadQuizQuestions(quizId: string): Promise<QuizQuestionDraft[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(query(collection(db, 'quizzes', quizId, 'questions'), orderBy('sortOrder')));
  return snapshot.docs.map(record => ({ id: record.id, ...(record.data() as Omit<QuizQuestionDraft, 'id'>) }));
}

export async function saveQuizQuestion(quizId: string, question: QuizQuestionDraft) {
  const { db } = getFirebaseClient();
  await setDoc(doc(db, 'quizzes', quizId, 'questions', question.id), { ...question, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteQuizQuestion(quizId: string, questionId: string) {
  const { db } = getFirebaseClient();
  await deleteDoc(doc(db, 'quizzes', quizId, 'questions', questionId));
}

export async function loadQuizAttempts(quizId: string): Promise<QuizAttemptSummary[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(query(collection(db, 'quizAttempts'), where('quizId', '==', quizId), orderBy('submittedAt', 'desc')));
  return snapshot.docs.map(record => ({ id: record.id, ...(record.data() as Omit<QuizAttemptSummary, 'id'>) }));
}
