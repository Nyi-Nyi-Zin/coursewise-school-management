import { arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, DocumentSnapshot, getDoc, getDocs, limit, orderBy, query, QueryConstraint, runTransaction, serverTimestamp, setDoc, startAfter, where } from "firebase/firestore";
import { getFirebaseClient } from "./firebase";

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
  const enrollmentRef = doc(db, "enrollments", enrollmentId);
  const enrollmentSnapshot = await getDoc(enrollmentRef);
  if (!enrollmentSnapshot.exists()) throw new Error("Enrollment not found.");
  const current = enrollmentSnapshot.data();
  const courseId = String(current.courseId ?? "");
  const batchId = String(current.batchId ?? "");
  const studentId = String(current.studentId ?? "");
  if (!courseId || !batchId || !studentId) throw new Error("Enrollment is missing course, batch, or student information.");
  const studentRef = doc(db, "users", studentId);
  const courseRef = doc(db, "courses", courseId);
  const batchRef = doc(db, "batches", batchId);
  const activeEnrollments = await getDocs(query(
    collection(db, "enrollments"),
    where("studentId", "==", studentId),
    where("status", "==", "active"),
  ));
  const otherActive = activeEnrollments.docs
    .filter(item => item.id !== enrollmentId)
    .map(item => ({ courseId: String(item.data().courseId ?? ""), batchId: String(item.data().batchId ?? "") }))
    .filter(item => item.courseId && item.batchId);
  await runTransaction(db, async transaction => {
    const studentSnapshot = await transaction.get(studentRef);
    if (!studentSnapshot.exists()) throw new Error("Student not found.");
    const enrollmentPair = { courseId, batchId };
    transaction.set(enrollmentRef, { status, updatedAt: serverTimestamp() }, { merge: true });
    if (status === "active") {
      transaction.set(courseRef, { enrolledStudentIds: arrayUnion(studentId), updatedAt: serverTimestamp() }, { merge: true });
      transaction.set(batchRef, { enrolledStudentIds: arrayUnion(studentId), updatedAt: serverTimestamp() }, { merge: true });
      transaction.set(doc(db, "enrollmentLocks", studentId), { studentId, courseId, batchId, active: true, updatedAt: serverTimestamp() }, { merge: true });
      transaction.set(studentRef, { enrollments: [...otherActive, enrollmentPair], activeCourseId: courseId, activeBatchId: batchId, updatedAt: serverTimestamp() }, { merge: true });
      return;
    }
    transaction.set(batchRef, { enrolledStudentIds: arrayRemove(studentId), updatedAt: serverTimestamp() }, { merge: true });
    if (!otherActive.some(item => item.courseId === courseId)) {
      transaction.set(courseRef, { enrolledStudentIds: arrayRemove(studentId), updatedAt: serverTimestamp() }, { merge: true });
    }
    const studentData = studentSnapshot.data() ?? {};
    const fallback = otherActive[0];
    if (fallback) {
      transaction.set(doc(db, "enrollmentLocks", studentId), { studentId, ...fallback, active: true, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      transaction.delete(doc(db, "enrollmentLocks", studentId));
    }
    transaction.set(studentRef, {
      enrollments: otherActive,
      ...(studentData.activeCourseId === courseId && studentData.activeBatchId === batchId
        ? { activeCourseId: fallback?.courseId ?? deleteField(), activeBatchId: fallback?.batchId ?? deleteField() }
        : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}

export async function deleteCourse(courseId: string) {
  const { db } = getFirebaseClient();
  const courseRef = doc(db, "courses", courseId);
  const [course, batches, enrollments] = await Promise.all([
    getDoc(courseRef),
    getDocs(query(collection(db, "batches"))),
    getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId))),
  ]);
  if (!course.exists()) throw new Error("Course not found.");
  if (batches.docs.some(batch => toBatch(batch).courseId === courseId)) {
    throw new Error("This course still has batches. Reassign or remove its batches before deleting the course.");
  }
  if (!enrollments.empty) throw new Error("This course has enrollment history and cannot be deleted.");
  await deleteDoc(courseRef);
}

export async function deleteBatch(batchId: string) {
  const { db } = getFirebaseClient();
  const batchRef = doc(db, "batches", batchId);
  const [batch, enrollments] = await Promise.all([
    getDoc(batchRef),
    getDocs(query(collection(db, "enrollments"), where("batchId", "==", batchId))),
  ]);
  if (!batch.exists()) throw new Error("Batch not found.");
  if (!enrollments.empty) throw new Error("This batch has enrollment history and cannot be deleted.");
  await deleteDoc(batchRef);
}

export async function deleteEnrollment(enrollment: EnrollmentRecord) {
  const { db } = getFirebaseClient();
  const enrollmentRef = doc(db, "enrollments", enrollment.id);
  const batchRef = doc(db, "batches", enrollment.batchId);
  const courseRef = doc(db, "courses", enrollment.courseId);
  const studentRef = doc(db, "users", enrollment.studentId);
  const activeEnrollments = await getDocs(query(
    collection(db, "enrollments"),
    where("studentId", "==", enrollment.studentId),
    where("status", "==", "active"),
  ));
  const remainingActive = activeEnrollments.docs
    .filter(item => item.id !== enrollment.id)
    .map(item => ({ courseId: String(item.data().courseId ?? ""), batchId: String(item.data().batchId ?? "") }))
    .filter(item => item.courseId && item.batchId);

  await runTransaction(db, async transaction => {
    const studentSnapshot = await transaction.get(studentRef);
    const studentData = studentSnapshot.data() ?? {};
    transaction.delete(enrollmentRef);
    transaction.update(batchRef, { enrolledStudentIds: arrayRemove(enrollment.studentId), updatedAt: serverTimestamp() });
    if (!remainingActive.some(item => item.courseId === enrollment.courseId)) {
      transaction.update(courseRef, { enrolledStudentIds: arrayRemove(enrollment.studentId), updatedAt: serverTimestamp() });
    }
    const studentUpdates: Record<string, unknown> = {
      enrollments: arrayRemove({ courseId: enrollment.courseId, batchId: enrollment.batchId }),
      updatedAt: serverTimestamp(),
    };
    const removedSelectedEnrollment = studentData.activeCourseId === enrollment.courseId && studentData.activeBatchId === enrollment.batchId;
    if (removedSelectedEnrollment) {
      const fallback = remainingActive[0];
      studentUpdates.activeCourseId = fallback?.courseId ?? deleteField();
      studentUpdates.activeBatchId = fallback?.batchId ?? deleteField();
      if (fallback) {
        transaction.set(doc(db, "enrollmentLocks", enrollment.studentId), { studentId: enrollment.studentId, ...fallback, active: true, updatedAt: serverTimestamp() });
      } else {
        transaction.delete(doc(db, "enrollmentLocks", enrollment.studentId));
      }
    }
    transaction.update(studentRef, studentUpdates);
  });
}

export async function linkBatchToCourse(batchId: string, courseId: string) {
  const { db } = getFirebaseClient();
  const batchRef = doc(db, "batches", batchId);
  const [batch, course, enrollments] = await Promise.all([
    getDoc(batchRef),
    getDoc(doc(db, "courses", courseId)),
    getDocs(query(collection(db, "enrollments"), where("batchId", "==", batchId))),
  ]);
  if (!batch.exists()) throw new Error("Batch not found.");
  if (!course.exists()) throw new Error("Course not found.");
  const batchData = batch.data() ?? {};
  const currentCourseId = String(batchData.courseId ?? (Array.isArray(batchData.courseIds) ? batchData.courseIds[0] : ""));
  if (currentCourseId !== courseId && !enrollments.empty) {
    throw new Error("A batch with enrollment history cannot be moved to a different course.");
  }
  // Keep the single-course model canonical once an unassigned batch is linked.
  await setDoc(batchRef, { courseId, courseIds: deleteField(), updatedAt: serverTimestamp() }, { merge: true });
}

export async function enrollStudent(courseId: string, batchId: string, studentId: string) {
  const { db } = getFirebaseClient();
  const studentRef = doc(db, "users", studentId);
  const batchRef = doc(db, "batches", batchId);
  const enrollmentRef = doc(db, "enrollments", `${courseId}_${batchId}_${studentId}`);

  await runTransaction(db, async transaction => {
    const [student, batch, enrollment] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(batchRef),
      transaction.get(enrollmentRef),
    ]);
    if (!student.exists() || student.data()?.role !== "student") throw new Error("Student not found.");
    if (!batch.exists() || batch.data()?.courseId !== courseId) throw new Error("The selected batch does not belong to this course.");
    if (enrollment.exists() && enrollment.data()?.status === "active") throw new Error("This student is already enrolled in the selected batch.");

    transaction.set(enrollmentRef, {
      studentId,
      courseId,
      batchId,
      status: "active",
      enrolledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    transaction.set(studentRef, {
      activeCourseId: courseId,
      activeBatchId: batchId,
      enrollments: arrayUnion({ courseId, batchId }),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    transaction.set(doc(db, "courses", courseId), {
      enrolledStudentIds: arrayUnion(studentId),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    transaction.set(batchRef, {
      enrolledStudentIds: arrayUnion(studentId),
      updatedAt: serverTimestamp(),
    }, { merge: true });
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
  const activeEnrollmentSnapshot = await getDocs(query(
    collection(db, "enrollments"),
    where("studentId", "==", enrollment.studentId),
    where("status", "==", "active"),
  ));

  await runTransaction(db, async transaction => {
    const [studentSnapshot, nextBatchSnapshot, previousEnrollmentSnapshot, nextEnrollmentSnapshot] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(nextBatchRef),
      transaction.get(previousEnrollmentRef),
      transaction.get(nextEnrollmentRef),
    ]);
    if (!studentSnapshot.exists || !previousEnrollmentSnapshot.exists) throw new Error("Enrollment or student not found.");
    if (!nextBatchSnapshot.exists()) throw new Error("The destination batch does not exist.");
    const nextBatchData = nextBatchSnapshot.data() ?? {};
    const destinationCourseId = String(nextBatchData.courseId ?? (Array.isArray(nextBatchData.courseIds) ? nextBatchData.courseIds[0] : ""));
    if (destinationCourseId !== enrollment.courseId) throw new Error("The destination batch does not belong to this course.");
    if (nextEnrollmentSnapshot.exists() && nextEnrollmentSnapshot.data()?.status === "active") {
      throw new Error("This student is already enrolled in the destination batch.");
    }

    const currentStatus = previousEnrollmentSnapshot.data()?.status === "active" ? "active" : "inactive";
    const activePairs: Array<{ courseId: string; batchId: string }> = activeEnrollmentSnapshot.docs
      .filter(item => item.id !== previousEnrollmentRef.id)
      .map(item => ({ courseId: String(item.data().courseId ?? ""), batchId: String(item.data().batchId ?? "") }))
      .filter(item => item.courseId && item.batchId);
    const nextPair: { courseId: string; batchId: string } = { courseId: enrollment.courseId, batchId };
    const nextEnrollments: Array<{ courseId: string; batchId: string }> = currentStatus === "active"
      ? [...activePairs, nextPair]
      : activePairs;
    const uniqueEnrollments: Array<{ courseId: string; batchId: string }> = [...new Map(nextEnrollments.map(item => [`${item.courseId}_${item.batchId}`, item])).values()];
    const profileData = studentSnapshot.data() ?? {};
    const selectedCourseId = String(profileData.activeCourseId ?? "");
    const selectedBatchId = String(profileData.activeBatchId ?? "");
    const selected = uniqueEnrollments.find(item => item.courseId === selectedCourseId && item.batchId === selectedBatchId) ?? uniqueEnrollments[0];

    transaction.delete(previousEnrollmentRef);
    transaction.set(nextEnrollmentRef, {
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      batchId,
      status: currentStatus,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    transaction.set(previousBatchRef, { enrolledStudentIds: arrayRemove(enrollment.studentId), updatedAt: serverTimestamp() }, { merge: true });
    transaction.set(nextBatchRef, { enrolledStudentIds: currentStatus === "active" ? arrayUnion(enrollment.studentId) : arrayRemove(enrollment.studentId), updatedAt: serverTimestamp() }, { merge: true });
    transaction.set(doc(db, "courses", enrollment.courseId), { enrolledStudentIds: uniqueEnrollments.some(item => item.courseId === enrollment.courseId) ? arrayUnion(enrollment.studentId) : arrayRemove(enrollment.studentId), updatedAt: serverTimestamp() }, { merge: true });
    transaction.set(studentRef, {
      ...(selected ? { activeCourseId: selected.courseId, activeBatchId: selected.batchId } : { activeCourseId: deleteField(), activeBatchId: deleteField() }),
      enrollments: uniqueEnrollments,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    if (selected) transaction.set(doc(db, "enrollmentLocks", enrollment.studentId), { studentId: enrollment.studentId, courseId: selected.courseId, batchId: selected.batchId, active: true, updatedAt: serverTimestamp() }, { merge: true });
    else transaction.delete(doc(db, "enrollmentLocks", enrollment.studentId));
  });
}
