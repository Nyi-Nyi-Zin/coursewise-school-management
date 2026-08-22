import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { getFirebaseClient, hasFirebaseConfiguration } from "./firebase";
import type { CourseBatchScope } from "./course-batch-scope";

export type BatchQuizAttempt = { id: string; studentId: string; score: number; totalMarks: number; quizId: string };

export async function loadBatchQuizAttempts(scope: CourseBatchScope): Promise<BatchQuizAttempt[]> {
  if (!hasFirebaseConfiguration || !scope.courseId || !scope.batchId) return [];
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(query(collection(db, "quizAttempts"), where("courseId", "==", scope.courseId), where("batchId", "==", scope.batchId), orderBy("submittedAt", "desc"), limit(40)));
  return snapshot.docs.map(item => ({ id: item.id, studentId: String(item.data().studentId ?? ""), score: Number(item.data().score ?? 0), totalMarks: Number(item.data().totalMarks ?? 0), quizId: String(item.data().quizId ?? "") }));
}
