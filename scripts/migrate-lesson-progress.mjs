import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../student-website/package.json", import.meta.url));
const { cert, initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const apply = process.argv.includes("--apply");
const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || readFileSync(".firebase-service-account.json", "utf8"));
initializeApp({ credential: cert(credentials) });
const db = getFirestore();
const [lessons, progress] = await Promise.all([
  db.collection("lessons").get(),
  db.collection("lessonProgress").get(),
]);
const lessonScopes = new Map(lessons.docs.map(document => [
  document.id,
  { courseId: String(document.data().courseId ?? ""), batchId: String(document.data().batchId ?? "") },
]));
const legacy = progress.docs.filter(document => !String(document.data().batchId ?? ""));
const migratable = legacy.flatMap(document => {
  const lessonId = String(document.data().lessonId ?? "");
  const scope = lessonScopes.get(lessonId);
  return lessonId && scope?.courseId && scope.batchId ? [{ document, lessonId, scope }] : [];
});
const skipped = legacy.length - migratable.length;

console.log(`${apply ? "Applying" : "Dry run:"} ${migratable.length} lesson-progress migrations; ${skipped} skipped until their lessons have a course and batch.`);
if (apply && migratable.length) {
  const writer = db.bulkWriter();
  for (const { document, lessonId, scope } of migratable) {
    const data = document.data();
    const target = db.doc(`lessonProgress/${scope.courseId}_${scope.batchId}_${lessonId}_${data.studentId}`);
    writer.set(target, { ...data, lessonId, courseId: scope.courseId, batchId: scope.batchId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    writer.delete(document.ref);
  }
  await writer.close();
}
