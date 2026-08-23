import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { clampScore, gradeCategories, type GradeCategory, type GradeRecord, type PortalNotificationKind } from "../../../shared/phase-a-contracts";
import { getFirebaseClient } from "./firebase";

export type GradeDraft = Omit<GradeRecord, "id" | "updatedAt">;
export type NotificationDraft = {
  recipientIds: string[];
  courseId: string;
  batchId: string;
  title: string;
  body: string;
  kind: PortalNotificationKind;
};

export { gradeCategories };

export async function loadGradeRecords(courseId: string, batchId: string): Promise<GradeRecord[]> {
  if (!courseId || !batchId) return [];
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(query(collection(db, "gradeRecords"), where("courseId", "==", courseId), where("batchId", "==", batchId), orderBy("updatedAt", "desc")));
  return snapshot.docs.map(item => gradeRecord(item.id, item.data() as Record<string, unknown>));
}

export async function saveGradeRecord(draft: GradeDraft, recordId?: string) {
  if (!draft.studentId || !draft.courseId || !draft.batchId || !draft.title.trim()) throw new Error("Choose an enrolled student and provide a grade title.");
  if (!gradeCategories.includes(draft.category)) throw new Error("Choose a valid grade category.");
  if (!Number.isFinite(draft.maxScore) || draft.maxScore <= 0) throw new Error("Maximum score must be greater than zero.");
  const { db } = getFirebaseClient();
  const payload = {
    ...draft,
    title: draft.title.trim(),
    score: clampScore(draft.score, draft.maxScore),
    feedback: draft.feedback?.trim() || null,
    updatedAt: serverTimestamp(),
  };
  if (recordId) {
    await setDoc(doc(db, "gradeRecords", recordId), payload, { merge: true });
    return recordId;
  }
  const created = await addDoc(collection(db, "gradeRecords"), { ...payload, createdAt: serverTimestamp() });
  return created.id;
}

export async function sendInAppNotifications(draft: NotificationDraft) {
  if (!draft.courseId || !draft.batchId || !draft.recipientIds.length || !draft.title.trim() || !draft.body.trim()) {
    throw new Error("Choose recipients and provide a title and message.");
  }
  const { db } = getFirebaseClient();
  await Promise.all(draft.recipientIds.map(recipientId => addDoc(collection(db, "notifications"), {
    recipientId,
    courseId: draft.courseId,
    batchId: draft.batchId,
    title: draft.title.trim(),
    body: draft.body.trim(),
    kind: draft.kind,
    isRead: false,
    createdAt: serverTimestamp(),
  })));
}

function gradeRecord(id: string, data: Record<string, unknown>): GradeRecord {
  return {
    id,
    studentId: String(data.studentId ?? ""),
    courseId: String(data.courseId ?? ""),
    batchId: String(data.batchId ?? ""),
    title: String(data.title ?? "Grade item"),
    category: gradeCategories.includes(data.category as GradeCategory) ? data.category as GradeCategory : "Assessment",
    score: Number(data.score ?? 0),
    maxScore: Number(data.maxScore ?? 0),
    feedback: typeof data.feedback === "string" ? data.feedback : undefined,
    updatedAt: asDate(data.updatedAt),
  };
}

function asDate(value: unknown) {
  return value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function"
    ? value.toDate().toISOString()
    : typeof value === "string" ? value : undefined;
}
