import { arrayUnion, collection, doc, getDocs, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseClient } from "./firebase";

export type CourseRecord = { id: string; title: string; code: string; isActive: boolean; enrolledStudentIds: string[] };
export type BatchRecord = { id: string; courseId: string; name: string; isActive: boolean; enrolledStudentIds: string[] };

export async function loadCourses(): Promise<CourseRecord[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "courses"));
  return snapshot.docs.map(item => ({ id: item.id, title: String(item.data().title ?? "Untitled course"), code: String(item.data().code ?? ""), isActive: item.data().isActive !== false, enrolledStudentIds: Array.isArray(item.data().enrolledStudentIds) ? item.data().enrolledStudentIds.map(String) : [] })).sort((a, b) => a.title.localeCompare(b.title));
}

export async function loadBatches(courseId: string): Promise<BatchRecord[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "courses", courseId, "batches"));
  return snapshot.docs.map(item => ({ id: item.id, courseId, name: String(item.data().name ?? "Untitled batch"), isActive: item.data().isActive !== false, enrolledStudentIds: Array.isArray(item.data().enrolledStudentIds) ? item.data().enrolledStudentIds.map(String) : [] })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveCourse(course: CourseRecord) {
  const { db } = getFirebaseClient();
  await setDoc(doc(db, "courses", course.id), { title: course.title, code: course.code, isActive: course.isActive, enrolledStudentIds: course.enrolledStudentIds, updatedAt: serverTimestamp() }, { merge: true });
}

export async function saveBatch(batch: BatchRecord) {
  const { db } = getFirebaseClient();
  await setDoc(doc(db, "courses", batch.courseId, "batches", batch.id), { name: batch.name, courseId: batch.courseId, isActive: batch.isActive, enrolledStudentIds: batch.enrolledStudentIds, updatedAt: serverTimestamp() }, { merge: true });
}

export async function enrollStudent(courseId: string, batchId: string, studentId: string) {
  const { db } = getFirebaseClient();
  const courseRef = doc(db, "courses", courseId);
  const batchRef = doc(db, "courses", courseId, "batches", batchId);
  const enrollmentRef = doc(db, "courses", courseId, "batches", batchId, "enrollments", studentId);
  const studentRef = doc(db, "users", studentId);
  await runTransaction(db, async transaction => {
    transaction.set(enrollmentRef, { studentId, courseId, batchId, status: "active", enrolledAt: serverTimestamp() }, { merge: true });
    transaction.update(courseRef, { enrolledStudentIds: arrayUnion(studentId), updatedAt: serverTimestamp() });
    transaction.update(batchRef, { enrolledStudentIds: arrayUnion(studentId), updatedAt: serverTimestamp() });
    transaction.set(studentRef, { activeCourseId: courseId, activeBatchId: batchId, enrollments: arrayUnion({ courseId, batchId }), updatedAt: serverTimestamp() }, { merge: true });
  });
}
