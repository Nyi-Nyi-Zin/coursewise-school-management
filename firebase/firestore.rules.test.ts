import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

const describeWithEmulator = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;
let testEnv: RulesTestEnvironment;

async function seedBatchIsolationFixture() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "users", "admin-1"), { role: "admin" }),
      setDoc(doc(db, "users", "student-a"), { role: "student" }),
      setDoc(doc(db, "users", "student-b"), { role: "student" }),
      setDoc(doc(db, "courses", "course-1"), { title: "Web Engineering", enrolledStudentIds: ["student-a", "student-b"] }),
      setDoc(doc(db, "batches", "batch-a"), { name: "Batch A", courseIds: ["course-1"], enrolledStudentIds: ["student-a"] }),
      setDoc(doc(db, "batches", "batch-b"), { name: "Batch B", courseIds: ["course-1"], enrolledStudentIds: ["student-b"] }),
      setDoc(doc(db, "enrollments", "course-1_batch-a_student-a"), { studentId: "student-a", courseId: "course-1", batchId: "batch-a", status: "active" }),
      setDoc(doc(db, "enrollments", "course-1_batch-b_student-b"), { studentId: "student-b", courseId: "course-1", batchId: "batch-b", status: "active" }),
      setDoc(doc(db, "lessons", "lesson-a"), { title: "Batch A lesson", courseId: "course-1", batchId: "batch-a", isPublished: true }),
      setDoc(doc(db, "lessons", "lesson-b"), { title: "Batch B lesson", courseId: "course-1", batchId: "batch-b", isPublished: true }),
      setDoc(doc(db, "quizAttempts", "attempt-a"), { studentId: "student-a", courseId: "course-1", batchId: "batch-a", score: 92 }),
      setDoc(doc(db, "quizAttempts", "attempt-b"), { studentId: "student-b", courseId: "course-1", batchId: "batch-b", score: 88 }),
      setDoc(doc(db, "attendance", "attendance-a"), { studentId: "student-a", courseId: "course-1", batchId: "batch-a", status: "Present" }),
      setDoc(doc(db, "attendance", "attendance-b"), { studentId: "student-b", courseId: "course-1", batchId: "batch-b", status: "Absent" }),
      setDoc(doc(db, "gradeRecords", "grade-a"), { studentId: "student-a", courseId: "course-1", batchId: "batch-a", title: "Project", category: "Project", score: 18, maxScore: 20 }),
      setDoc(doc(db, "gradeRecords", "grade-b"), { studentId: "student-b", courseId: "course-1", batchId: "batch-b", title: "Project", category: "Project", score: 17, maxScore: 20 }),
      setDoc(doc(db, "notifications", "notification-a"), { recipientId: "student-a", courseId: "course-1", batchId: "batch-a", title: "Grade updated", body: "Your project feedback is ready.", kind: "grade", isRead: false }),
      setDoc(doc(db, "notifications", "notification-b"), { recipientId: "student-b", courseId: "course-1", batchId: "batch-b", title: "Batch update", body: "Reminder.", kind: "general", isRead: false }),
      setDoc(doc(db, "certificates", "certificate-a"), { studentId: "student-a", courseId: "course-1", batchId: "batch-a", certificateNumber: "TTL-2026-0001", status: "issued", completionPercent: 100 }),
      setDoc(doc(db, "certificates", "certificate-b"), { studentId: "student-b", courseId: "course-1", batchId: "batch-b", certificateNumber: "TTL-2026-0002", status: "issued", completionPercent: 100 }),
      setDoc(doc(db, "quizzes", "quiz-a"), { title: "Batch A Quiz", courseId: "course-1", batchId: "batch-a", isPublished: true }),
      setDoc(doc(db, "quizzes/quiz-a/questions/question-a"), { prompt: "Question", options: ["A", "B"], marks: 1, sortOrder: 1 }),
      setDoc(doc(db, "quizzes/quiz-a/answerKeys/question-a"), { correctAnswerIndex: 1 }),
    ]);
  });
}

describeWithEmulator("Firestore course and batch isolation", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({ projectId: "teza-tech-lab-rules", firestore: { rules: readFileSync(resolve(process.cwd(), "firebase/firestore.rules"), "utf8") } });
  });
  afterEach(async () => { await testEnv.clearFirestore(); });
  afterAll(async () => { await testEnv.cleanup(); });

  it("allows a student only into their enrolled course and batch content, never answer keys", async () => {
    await seedBatchIsolationFixture();
    const studentA = testEnv.authenticatedContext("student-a").firestore();
    await assertSucceeds(getDoc(doc(studentA, "courses", "course-1")));
    await assertSucceeds(getDoc(doc(studentA, "lessons", "lesson-a")));
    await assertFails(getDoc(doc(studentA, "lessons", "lesson-b")));
    await assertFails(getDoc(doc(studentA, "enrollments", "course-1_batch-b_student-b")));
    await assertSucceeds(getDoc(doc(studentA, "quizzes/quiz-a/questions/question-a")));
    await assertFails(getDoc(doc(studentA, "quizzes/quiz-a/answerKeys/question-a")));
  });

  it("does not permit a student to read another student's quiz score or attendance", async () => {
    await seedBatchIsolationFixture();
    const studentA = testEnv.authenticatedContext("student-a").firestore();
    await assertSucceeds(getDoc(doc(studentA, "quizAttempts", "attempt-a")));
    await assertSucceeds(getDoc(doc(studentA, "attendance", "attendance-a")));
    await assertFails(getDoc(doc(studentA, "quizAttempts", "attempt-b")));
    await assertFails(getDoc(doc(studentA, "attendance", "attendance-b")));
  });

  it("keeps grade records private and lets a student mark only their own notification as read", async () => {
    await seedBatchIsolationFixture();
    const studentA = testEnv.authenticatedContext("student-a").firestore();
    await assertSucceeds(getDoc(doc(studentA, "gradeRecords", "grade-a")));
    await assertFails(getDoc(doc(studentA, "gradeRecords", "grade-b")));
    await assertSucceeds(setDoc(doc(studentA, "notifications", "notification-a"), { isRead: true, readAt: new Date() }, { merge: true }));
    await assertFails(setDoc(doc(studentA, "notifications", "notification-a"), { title: "Tampered" }, { merge: true }));
    await assertFails(getDoc(doc(studentA, "notifications", "notification-b")));
  });

  it("keeps certificates private to the issued student and their active batch", async () => {
    await seedBatchIsolationFixture();
    const studentA = testEnv.authenticatedContext("student-a").firestore();
    await assertSucceeds(getDoc(doc(studentA, "certificates", "certificate-a")));
    await assertFails(getDoc(doc(studentA, "certificates", "certificate-b")));
  });

  it("allows an administrator to manage unlimited course records", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), "users", "admin-1"), { role: "admin" }); });
    const admin = testEnv.authenticatedContext("admin-1").firestore();
    await assertSucceeds(setDoc(doc(admin, "courses", "course-2"), { title: "Data Design", enrolledStudentIds: [] }));
    expect((await getDoc(doc(admin, "courses", "course-2"))).data()?.title).toBe("Data Design");
  });

  it("permits only actor-bound append-only administrator audit events", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), "users", "admin-1"), { role: "admin" }); });
    const admin = testEnv.authenticatedContext("admin-1").firestore();
    const student = testEnv.authenticatedContext("student-a").firestore();
    const event = { actorId: "admin-1", action: "record.saved", targetType: "lessons", targetId: "lesson-a", summary: "lessons: Batch A lesson", source: "admin-web", createdAt: serverTimestamp() };
    const eventRef = doc(admin, "adminAuditEvents", "event-a");
    await assertSucceeds(setDoc(eventRef, event));
    await assertSucceeds(getDoc(eventRef));
    await assertFails(setDoc(doc(student, "adminAuditEvents", "event-b"), { ...event, actorId: "student-a" }));
    await assertFails(setDoc(doc(admin, "adminAuditEvents", "event-c"), { ...event, actorId: "someone-else" }));
    await assertFails(updateDoc(eventRef, { summary: "changed" }));
    await assertFails(deleteDoc(eventRef));
  });

  it("allows a signed-in user to create only their own initial student profile", async () => {
    const student = testEnv.authenticatedContext("student-c").firestore();
    const selfProfile = { name: "Student C", email: "c@example.com", role: "student", studentId: "Pending", createdAt: new Date(), updatedAt: new Date() };
    await assertSucceeds(setDoc(doc(student, "users", "student-c"), selfProfile));
    await assertFails(setDoc(doc(student, "users", "student-d"), selfProfile));
    await assertFails(setDoc(doc(student, "users", "student-c"), { ...selfProfile, role: "admin" }));
  });
});
