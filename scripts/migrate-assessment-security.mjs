import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const apply = process.argv.includes("--apply");
const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || readFileSync(".firebase-service-account.json", "utf8"));
initializeApp({ credential: cert(credentials) });
const db = getFirestore();
const [quizzes, enrollments] = await Promise.all([db.collection("quizzes").get(), db.collection("enrollments").where("status", "==", "active").get()]);
const activeByStudent = new Map();
for (const document of enrollments.docs) activeByStudent.set(document.data().studentId, [...(activeByStudent.get(document.data().studentId) ?? []), document]);
const duplicates = [...activeByStudent.entries()].filter(([, records]) => records.length > 1);
if (duplicates.length) {
  console.error("Duplicate active enrollments found; resolve these before applying:");
  duplicates.forEach(([studentId, records]) => console.error(studentId, records.map(record => record.id).join(", ")));
  process.exitCode = 2;
} else {
  const batch = db.batch(); let writes = 0;
  for (const quiz of quizzes.docs) if (quiz.data().kind === "final_exam") { batch.set(quiz.ref, { passingPercent: 70, drawQuestionCount: Number(quiz.data().drawQuestionCount ?? 50), questionPoolTarget: Number(quiz.data().questionPoolTarget ?? 100), retakeCooldownHours: Number(quiz.data().retakeCooldownHours ?? 24), updatedAt: FieldValue.serverTimestamp() }, { merge: true }); writes += 1; }
  for (const [studentId, records] of activeByStudent) { const enrollment = records[0].data(); batch.set(db.doc(`enrollmentLocks/${studentId}`), { studentId, courseId: enrollment.courseId, batchId: enrollment.batchId, active: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); writes += 1; }
  console.log(`${apply ? "Applying" : "Dry run:"} ${writes} assessment/enrollment backfill writes.`);
  if (apply && writes) await batch.commit();
}
