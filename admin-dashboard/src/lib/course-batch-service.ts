import { arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, DocumentSnapshot, getDocs, limit, orderBy, query, QueryConstraint, runTransaction, serverTimestamp, setDoc, startAfter, where } from "firebase/firestore";
import { getFirebaseClient } from "./firebase";
import { authenticatedApiFetch } from "./authenticated-api";

export type CourseRecord = { id: string; title: string; isActive: boolean; enrolledStudentIds: string[] };
export type BatchRecord = { id: string; courseId: string; name: string; isActive: boolean; enrolledStudentIds: string[] };
export type StudentProfile = { id: string; name: string; email: string; studentId: string; activeBatchId?: string };
export type EnrollmentRecord = { id: string; courseId: string; batchId: string; studentId: string; status: string };
export type CursorPage<T> = { items: T[]; nextCursor: DocumentSnapshot | null };

const toCourse = (item: DocumentSnapshot): CourseRecord => ({ id: item.id, title: String(item.data()?.title ?? "Untitled course"), isActive: item.data()?.isActive !== false, enrolledStudentIds: Array.isArray(item.data()?.enrolledStudentIds) ? item.data()!.enrolledStudentIds.map(String) : [] });
const toBatch = (item: DocumentSnapshot): BatchRecord => {
  const data = item.data() ?? {};
  // Read legacy courseIds so existing data remains visible, but retain one owner.
  const courseId = data.courseId ? String(data.courseId) : Array.isArray(data.courseIds) ? String(data.courseIds[0] ?? "") : "";
  return { id: item.id, courseId, name: String(data.name ?? "Untitled batch"), isActive: data.isActive !== false, enrolledStudentIds: Array.isArray(data.enrolledStudentIds) ? data.enrolledStudentIds.map(String) : [] };
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
    .filter(item => toBatch(item).courseId === courseId)
    .sort((a, b) => toBatch(a).name.localeCompare(toBatch(b).name));
  const cursorIndex = cursor ? matched.findIndex(item => item.id === cursor.id) : -1;
  const startIndex = cursorIndex + 1;
  const docs = matched.slice(startIndex, startIndex + pageSize);
  return { items: docs.map(toBatch), nextCursor: startIndex + pageSize < matched.length ? docs.at(-1) ?? null : null };
}

/** Batches are created independently and may be linked to a course later. */
export async function loadAllBatchesPage(pageSize: number, cursor?: DocumentSnapshot | null): Promise<CursorPage<BatchRecord>> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "batches"));
  const matched = snapshot.docs.sort((a, b) => toBatch(a).name.localeCompare(toBatch(b).name));
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
  return snapshot.docs.map(toBatch).filter(batch => batch.courseId === courseId).sort((a, b) => a.name.localeCompare(b.name));
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
    .map(item => ({ id: item.id, name: String(item.data().name ?? "Student"), email: String(item.data().email ?? ""), studentId: String(item.data().studentId ?? ""), activeBatchId: String(item.data().activeBatchId ?? "") }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The enrolment workspace is a school-wide register.  Do not scope this read
 * to the currently selected course: that selection is paginated and otherwise
 * hides valid records belonging to another course.
 */
export async function loadEnrollmentsPage(pageSize: number, cursor?: DocumentSnapshot | null): Promise<CursorPage<EnrollmentRecord>> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "enrollments"));
  const matched = snapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
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
  await setDoc(doc(db, "batches", batch.id), { name: batch.name, courseId: batch.courseId, isActive: batch.isActive, enrolledStudentIds: batch.enrolledStudentIds, updatedAt: serverTimestamp() }, { merge: true });
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

export async function deleteEnrollment(enrollment: EnrollmentRecord) {
  const { db } = getFirebaseClient();
  const enrollmentRef = doc(db, "enrollments", enrollment.id);
  const batchRef = doc(db, "batches", enrollment.batchId);
  const courseRef = doc(db, "courses", enrollment.courseId);
  const studentRef = doc(db, "users", enrollment.studentId);

  await runTransaction(db, async transaction => {
    const studentSnapshot = await transaction.get(studentRef);
    const studentData = studentSnapshot.data() ?? {};
    transaction.delete(enrollmentRef);
    transaction.delete(doc(db, "enrollmentLocks", enrollment.studentId));
    transaction.update(batchRef, { enrolledStudentIds: arrayRemove(enrollment.studentId), updatedAt: serverTimestamp() });
    transaction.update(courseRef, { enrolledStudentIds: arrayRemove(enrollment.studentId), updatedAt: serverTimestamp() });
    const studentUpdates: Record<string, unknown> = {
      enrollments: arrayRemove({ courseId: enrollment.courseId, batchId: enrollment.batchId }),
      updatedAt: serverTimestamp(),
    };
    if (studentData.activeCourseId === enrollment.courseId) studentUpdates.activeCourseId = deleteField();
    if (studentData.activeBatchId === enrollment.batchId) studentUpdates.activeBatchId = deleteField();
    transaction.update(studentRef, studentUpdates);
  });
}

export async function linkBatchToCourse(batchId: string, courseId: string) {
  const { db } = getFirebaseClient();
  await setDoc(doc(db, "batches", batchId), { courseId, updatedAt: serverTimestamp() }, { merge: true });
}

export async function enrollStudent(courseId: string, batchId: string, studentId: string) {
  await authenticatedApiFetch("/api/students", { method: "PUT", body: JSON.stringify({ courseId, batchId, studentId }) });
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
    transaction.set(doc(db, "enrollmentLocks", enrollment.studentId), { studentId: enrollment.studentId, courseId: enrollment.courseId, batchId, active: enrollment.status === "active", updatedAt: serverTimestamp() }, { merge: true });
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
