import { arrayRemove, arrayUnion, collection, deleteDoc, doc, DocumentSnapshot, getDocs, limit, orderBy, query, QueryConstraint, runTransaction, serverTimestamp, setDoc, startAfter } from "firebase/firestore";
import { getFirebaseClient } from "./firebase";

export type CourseRecord = { id: string; title: string; isActive: boolean; enrolledStudentIds: string[] };
export type BatchRecord = { id: string; courseIds: string[]; name: string; isActive: boolean; enrolledStudentIds: string[] };
export type StudentProfile = { id: string; name: string; email: string; studentId: string };
export type EnrollmentRecord = { id: string; courseId: string; batchId: string; studentId: string; status: string };
export type CursorPage<T> = { items: T[]; nextCursor: DocumentSnapshot | null };

const toCourse = (item: DocumentSnapshot): CourseRecord => ({ id: item.id, title: String(item.data()?.title ?? "Untitled course"), isActive: item.data()?.isActive !== false, enrolledStudentIds: Array.isArray(item.data()?.enrolledStudentIds) ? item.data()!.enrolledStudentIds.map(String) : [] });
const toBatch = (item: DocumentSnapshot): BatchRecord => {
  const data = item.data() ?? {};
  // Older batch documents stored one `courseId`; newer ones use `courseIds`.
  // Read both so existing data is never silently hidden from the dashboard.
  const courseIds = Array.isArray(data.courseIds)
    ? data.courseIds.map(String)
    : data.courseId ? [String(data.courseId)] : [];
  return { id: item.id, courseIds, name: String(data.name ?? "Untitled batch"), isActive: data.isActive !== false, enrolledStudentIds: Array.isArray(data.enrolledStudentIds) ? data.enrolledStudentIds.map(String) : [] };
};

export async function loadCoursesPage(pageSize: number, cursor?: DocumentSnapshot | null): Promise<CursorPage<CourseRecord>> {
  const { db } = getFirebaseClient();
  const constraints: QueryConstraint[] = [orderBy("title"), limit(pageSize + 1)];
  if (cursor) constraints.splice(1, 0, startAfter(cursor));
  const snapshot = await getDocs(query(collection(db, "courses"), ...constraints));
  const docs = snapshot.docs.slice(0, pageSize);
  return { items: docs.map(toCourse), nextCursor: snapshot.docs.length > pageSize ? docs.at(-1) ?? null : null };
}

export async function loadBatchesPage(courseId: string, pageSize: number, cursor?: DocumentSnapshot | null): Promise<CursorPage<BatchRecord>> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "batches"));
  const matched = snapshot.docs
    .filter(item => toBatch(item).courseIds.includes(courseId))
    .sort((a, b) => toBatch(a).name.localeCompare(toBatch(b).name));
  const cursorIndex = cursor ? matched.findIndex(item => item.id === cursor.id) : -1;
  const startIndex = cursorIndex + 1;
  const docs = matched.slice(startIndex, startIndex + pageSize);
  return { items: docs.map(toBatch), nextCursor: startIndex + pageSize < matched.length ? docs.at(-1) ?? null : null };
}

export async function loadCourses(): Promise<CourseRecord[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "courses"));
  return snapshot.docs.map(item => ({ id: item.id, title: String(item.data().title ?? "Untitled course"), isActive: item.data().isActive !== false, enrolledStudentIds: Array.isArray(item.data().enrolledStudentIds) ? item.data().enrolledStudentIds.map(String) : [] })).sort((a, b) => a.title.localeCompare(b.title));
}

export async function loadBatches(courseId: string): Promise<BatchRecord[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "batches"));
  return snapshot.docs.map(toBatch).filter(batch => batch.courseIds.includes(courseId)).sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadAllBatches(): Promise<BatchRecord[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "batches"));
  return snapshot.docs.map(toBatch).sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadStudentProfiles(): Promise<StudentProfile[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs
    .filter(item => item.data().role === "student")
    .map(item => ({ id: item.id, name: String(item.data().name ?? "Student"), email: String(item.data().email ?? ""), studentId: String(item.data().studentId ?? "") }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadEnrollmentsPage(courseId: string, pageSize: number, cursor?: DocumentSnapshot | null): Promise<CursorPage<EnrollmentRecord>> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "enrollments"));
  const matched = snapshot.docs
    .filter(item => String(item.data().courseId ?? "") === courseId)
    .sort((a, b) => a.id.localeCompare(b.id));
  const cursorIndex = cursor ? matched.findIndex(item => item.id === cursor.id) : -1;
  const startIndex = cursorIndex + 1;
  const docs = matched.slice(startIndex, startIndex + pageSize);
  return {
    items: docs.map(item => {
      const data = item.data();
      return { id: item.id, courseId: String(data.courseId ?? ""), batchId: String(data.batchId ?? ""), studentId: String(data.studentId ?? ""), status: String(data.status ?? "active") };
    }),
    nextCursor: startIndex + pageSize < matched.length ? docs.at(-1) ?? null : null,
  };
}

export async function saveCourse(course: CourseRecord) {
  const { db } = getFirebaseClient();
  await setDoc(doc(db, "courses", course.id), { title: course.title, isActive: course.isActive, enrolledStudentIds: course.enrolledStudentIds, updatedAt: serverTimestamp() }, { merge: true });
}

export async function saveBatch(batch: BatchRecord) {
  const { db } = getFirebaseClient();
  await setDoc(doc(db, "batches", batch.id), { name: batch.name, courseIds: batch.courseIds, courseId: batch.courseIds[0] ?? null, isActive: batch.isActive, enrolledStudentIds: batch.enrolledStudentIds, updatedAt: serverTimestamp() }, { merge: true });
}

export async function saveEnrollmentStatus(enrollmentId: string, status: "active" | "inactive") {
  const { db } = getFirebaseClient();
  await setDoc(doc(db, "enrollments", enrollmentId), { status, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteCourse(courseId: string) {
  const { db } = getFirebaseClient();
  await deleteDoc(doc(db, "courses", courseId));
}

export async function deleteBatch(batchId: string) {
  const { db } = getFirebaseClient();
  await deleteDoc(doc(db, "batches", batchId));
}

export async function deleteEnrollment(enrollmentId: string) {
  const { db } = getFirebaseClient();
  await deleteDoc(doc(db, "enrollments", enrollmentId));
}

export async function linkBatchToCourse(batchId: string, courseId: string) {
  const { db } = getFirebaseClient();
  await setDoc(doc(db, "batches", batchId), { courseIds: arrayUnion(courseId), updatedAt: serverTimestamp() }, { merge: true });
}

export async function enrollStudent(courseId: string, batchId: string, studentId: string) {
  const { db } = getFirebaseClient();
  const courseRef = doc(db, "courses", courseId);
  const batchRef = doc(db, "batches", batchId);
  const enrollmentRef = doc(db, "enrollments", `${courseId}_${batchId}_${studentId}`);
  const studentRef = doc(db, "users", studentId);
  await runTransaction(db, async transaction => {
    transaction.set(enrollmentRef, { studentId, courseId, batchId, status: "active", enrolledAt: serverTimestamp() }, { merge: true });
    transaction.update(courseRef, { enrolledStudentIds: arrayUnion(studentId), updatedAt: serverTimestamp() });
    transaction.update(batchRef, { enrolledStudentIds: arrayUnion(studentId), updatedAt: serverTimestamp() });
    transaction.set(studentRef, { activeCourseId: courseId, activeBatchId: batchId, enrollments: arrayUnion({ courseId, batchId }), updatedAt: serverTimestamp() }, { merge: true });
  });
}

export async function updateEnrollmentBatch(enrollment: EnrollmentRecord, batchId: string) {
  if (enrollment.batchId === batchId) return;

  const { db } = getFirebaseClient();
  const previousBatchRef = doc(db, "batches", enrollment.batchId);
  const nextBatchRef = doc(db, "batches", batchId);
  const previousEnrollmentRef = doc(db, "enrollments", enrollment.id);
  const nextEnrollmentRef = doc(db, "enrollments", `${enrollment.courseId}_${batchId}_${enrollment.studentId}`);
  const studentRef = doc(db, "users", enrollment.studentId);
  const previousEnrollment = { courseId: enrollment.courseId, batchId: enrollment.batchId };
  const nextEnrollment = { courseId: enrollment.courseId, batchId };

  await runTransaction(db, async transaction => {
    const studentSnapshot = await transaction.get(studentRef);
    const currentEnrollments = Array.isArray(studentSnapshot.data()?.enrollments)
      ? studentSnapshot.data()!.enrollments
      : [];
    const nextEnrollments = [
      ...currentEnrollments.filter((item: unknown) => {
        if (!item || typeof item !== "object") return true;
        const value = item as { courseId?: unknown; batchId?: unknown };
        return !(
          value.courseId === previousEnrollment.courseId &&
          (value.batchId === previousEnrollment.batchId || value.batchId === nextEnrollment.batchId)
        );
      }),
      nextEnrollment,
    ];
    transaction.delete(previousEnrollmentRef);
    transaction.set(nextEnrollmentRef, {
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      batchId,
      status: enrollment.status,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    transaction.update(previousBatchRef, { enrolledStudentIds: arrayRemove(enrollment.studentId), updatedAt: serverTimestamp() });
    transaction.update(nextBatchRef, { enrolledStudentIds: arrayUnion(enrollment.studentId), updatedAt: serverTimestamp() });
    transaction.set(studentRef, {
      activeCourseId: enrollment.courseId,
      activeBatchId: batchId,
      enrollments: nextEnrollments,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}
