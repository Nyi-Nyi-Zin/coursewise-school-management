import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { ApiError, apiErrorResponse, requireAdministrator } from "@/lib/server-api";

export const runtime = "nodejs";

function millis(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") return Number(value.toMillis());
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET(request: Request) {
  try {
    await requireAdministrator(request);
    const studentId = new URL(request.url).searchParams.get("studentId")?.trim() ?? "";
    if (!studentId) throw new ApiError(400, "A student ID is required.");
    const { db } = getFirebaseAdmin();
    const profileSnapshot = await db.doc(`users/${studentId}`).get();
    if (!profileSnapshot.exists || profileSnapshot.data()?.role !== "student") throw new ApiError(404, "Student not found.");
    const profile = profileSnapshot.data()!;
    let courseId = String(profile.activeCourseId ?? "");
    let batchId = String(profile.activeBatchId ?? "");
    if (!courseId || !batchId) {
      const active = await db.collection("enrollments").where("studentId", "==", studentId).where("status", "==", "active").limit(1).get();
      courseId = String(active.docs[0]?.data().courseId ?? "");
      batchId = String(active.docs[0]?.data().batchId ?? "");
    }
    const [course, batch, lessons, lessonProgress, quizzes, summaries, certificates] = await Promise.all([
      courseId ? db.doc(`courses/${courseId}`).get() : null, batchId ? db.doc(`batches/${batchId}`).get() : null,
      courseId ? db.collection("lessons").where("courseId", "==", courseId).where("isPublished", "==", true).get() : null,
      courseId ? db.collection("lessonProgress").where("studentId", "==", studentId).where("courseId", "==", courseId).get() : null,
      courseId && batchId ? db.collection("quizzes").where("courseId", "==", courseId).where("batchId", "==", batchId).where("isPublished", "==", true).get() : null,
      db.collection("quizSummaries").where("studentId", "==", studentId).get(), db.collection("certificates").where("studentId", "==", studentId).get(),
    ]);
    const completedLessonIds = new Set(lessonProgress?.docs.filter(item => item.data().status === "complete").map(item => String(item.data().lessonId ?? "")) ?? []);
    const summaryByQuiz = new Map(summaries.docs.map(item => [String(item.data().quizId ?? ""), item.data()]));
    const results = (quizzes?.docs ?? []).map(document => {
      const quiz = document.data(); const summary = summaryByQuiz.get(document.id);
      return { quizId: document.id, quizTitle: String(quiz.title ?? "Assessment"), chapter: String(quiz.chapter ?? ""), kind: quiz.kind === "final_exam" ? "final_exam" : "chapter_quiz", attemptCount: Number(summary?.attemptCount ?? 0), bestScore: Number(summary?.bestScore ?? 0), bestTotalMarks: Number(summary?.bestTotalMarks ?? 0), bestPercentage: Number(summary?.bestPercentage ?? 0), latestPercentage: Number(summary?.latestPercentage ?? 0), latestPassed: summary?.latestPassed === true, passed: summary?.passed === true, submittedAtMillis: millis(summary?.latestSubmittedAtMillis), timeSpentSeconds: Number(summary?.latestTimeSpentSeconds ?? 0), integrityViolations: Number(summary?.latestIntegrityViolations ?? 0), nextEligibleAtMillis: millis(summary?.nextEligibleAtMillis) };
    });
    const completedLessons = lessons?.docs.filter(item => completedLessonIds.has(item.id)).length ?? 0;
    const chapterRows = results.filter(item => item.kind === "chapter_quiz"); const finalRows = results.filter(item => item.kind === "final_exam");
    const completedChapters = chapterRows.filter(item => item.attemptCount > 0).length; const passedFinals = finalRows.filter(item => item.passed).length;
    const totalItems = (lessons?.size ?? 0) + chapterRows.length + finalRows.length; const completedItems = completedLessons + completedChapters + passedFinals;
    return NextResponse.json({ profile: { id: studentId, name: String(profile.name ?? "Student"), email: String(profile.email ?? ""), studentCode: String(profile.studentId ?? ""), photoUrl: String(profile.photoUrl ?? ""), isActive: profile.isActive !== false }, enrollment: courseId && batchId ? { courseId, batchId, courseTitle: String(course?.data()?.title ?? "Course"), batchName: String(batch?.data()?.name ?? "Batch") } : null, progress: { overallPercentage: totalItems ? Math.round(completedItems / totalItems * 100) : 0, completedItems, totalItems, completedLessons, totalLessons: lessons?.size ?? 0, completedChapters, totalChapters: chapterRows.length, passedFinals, totalFinals: finalRows.length }, results, certificate: { status: certificates.empty ? passedFinals ? "eligible_pending" : "not_eligible" : "issued", count: certificates.size } });
  } catch (error) {
    return apiErrorResponse(error, "Student progress could not be loaded.");
  }
}

async function createNumberedStudentProfile(userId: string, input: { name: string; email: string; photoUrl: string; isActive: boolean }) {
  const { db } = getFirebaseAdmin();
  return db.runTransaction(async transaction => {
    const counterReference = db.doc("system/studentCounter");
    const counter = await transaction.get(counterReference);
    let lastIssued = Number(counter.data()?.lastIssued ?? 0);
    if (!counter.exists) {
      const existingStudents = await transaction.get(db.collection("users").where("role", "==", "student"));
      lastIssued = existingStudents.docs.reduce((highest, student) => {
        const value = Number(student.data().studentId);
        return Number.isSafeInteger(value) && value >= 0 ? Math.max(highest, value) : highest;
      }, 0);
    }
    const nextNumber = Number.isSafeInteger(lastIssued) && lastIssued >= 0 ? lastIssued + 1 : 1;
    const studentId = String(nextNumber);
    transaction.set(counterReference, { lastIssued: nextNumber, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(db.doc(`users/${userId}`), { name: input.name, email: input.email, role: "student", studentId, isActive: input.isActive, ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return studentId;
  });
}

export async function POST(request: Request) {
  try {
    await requireAdministrator(request);
    const body = await request.json().catch(() => { throw new ApiError(400, "A valid student account request is required."); });
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const photoUrl = typeof body?.photoUrl === "string" ? body.photoUrl.trim() : "";
    const isActive = body?.isActive !== false;
    if (!name || !email.includes("@")) throw new ApiError(400, "A student name and email address are required.");

    const { auth } = getFirebaseAdmin();
    let userId: string | undefined;
    try {
      const user = await auth.createUser({ email, password: randomBytes(18).toString("base64url"), displayName: name, disabled: !isActive });
      userId = user.uid;
      const resetLink = await auth.generatePasswordResetLink(email);
      const studentId = await createNumberedStudentProfile(user.uid, { name, email, photoUrl, isActive });
      return NextResponse.json({ uid: user.uid, studentId, resetLink }, { status: 201 });
    } catch (error) {
      if (userId) await auth.deleteUser(userId).catch(() => undefined);
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code.includes("email-already-exists")) throw new ApiError(409, "An account with this email already exists.");
      if (code.includes("invalid-email")) throw new ApiError(400, "The email address is not valid.");
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error, "Could not create the student account.");
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdministrator(request);
    const body = await request.json().catch(() => { throw new ApiError(400, "A valid enrollment request is required."); });
    const studentId = String(body?.studentId ?? "").trim();
    const courseId = String(body?.courseId ?? "").trim();
    const batchId = String(body?.batchId ?? "").trim();
    if (!studentId || !courseId || !batchId) throw new ApiError(400, "Student, course, and batch are required.");
    const { db } = getFirebaseAdmin();
    const studentReference = db.doc(`users/${studentId}`);
    const batchReference = db.doc(`batches/${batchId}`);
    const enrollmentReference = db.doc(`enrollments/${courseId}_${batchId}_${studentId}`);
    await db.runTransaction(async transaction => {
      const [student, batch, enrollment] = await Promise.all([
        transaction.get(studentReference),
        transaction.get(batchReference),
        transaction.get(enrollmentReference),
      ]);
      if (!student.exists || student.data()?.role !== "student") throw new ApiError(404, "Student not found.");
      if (!batch.exists || batch.data()?.courseId !== courseId) throw new ApiError(409, "The selected batch does not belong to this course.");
      if (enrollment.exists && enrollment.data()?.status === "active") throw new ApiError(409, "This student is already enrolled in the selected batch.");
      transaction.set(enrollmentReference, { studentId, courseId, batchId, status: "active", enrolledAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      // These fields identify the course shown first in the student portal;
      // they are not a uniqueness lock. Other active enrolments remain valid.
      transaction.set(db.doc(`enrollmentLocks/${studentId}`), { studentId, courseId, batchId, active: true, updatedAt: FieldValue.serverTimestamp() });
      transaction.set(studentReference, { activeCourseId: courseId, activeBatchId: batchId, enrollments: FieldValue.arrayUnion({ courseId, batchId }), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(db.doc(`courses/${courseId}`), { enrolledStudentIds: FieldValue.arrayUnion(studentId), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(batchReference, { enrolledStudentIds: FieldValue.arrayUnion(studentId), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Student could not be enrolled.");
  }
}
