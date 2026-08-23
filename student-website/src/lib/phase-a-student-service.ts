import { collection, getDocs, orderBy, query, serverTimestamp, updateDoc, where, doc } from "firebase/firestore";
import { buildStudentProgress, gradeCategories, type GradeCategory, type GradeRecord, type PortalNotification } from "../../../shared/phase-a-contracts";
import { firestore } from "./firebase";

export type StudentGradeRecord = GradeRecord;
export { buildStudentProgress };

export async function getStudentGradeRecords(studentId: string, courseId?: string, batchId?: string): Promise<StudentGradeRecord[]> {
  if (!firestore || !courseId || !batchId) return [];
  const snapshot = await getDocs(query(collection(firestore, "gradeRecords"), where("studentId", "==", studentId), where("courseId", "==", courseId), where("batchId", "==", batchId), orderBy("updatedAt", "desc")));
  return snapshot.docs.map(item => {
    const data = item.data();
    return {
      id: item.id,
      studentId,
      courseId,
      batchId,
      title: String(data.title ?? "Grade item"),
      category: gradeCategories.includes(data.category as GradeCategory) ? data.category as GradeCategory : "Assessment",
      score: Number(data.score ?? 0),
      maxScore: Number(data.maxScore ?? 0),
      feedback: typeof data.feedback === "string" ? data.feedback : undefined,
      updatedAt: asDate(data.updatedAt),
    };
  });
}

export async function getStudentNotifications(studentId: string, courseId?: string, batchId?: string): Promise<PortalNotification[]> {
  if (!firestore || !courseId || !batchId) return [];
  const snapshot = await getDocs(query(collection(firestore, "notifications"), where("recipientId", "==", studentId), where("courseId", "==", courseId), where("batchId", "==", batchId), orderBy("createdAt", "desc")));
  return snapshot.docs.map(item => {
    const data = item.data();
    return { id: item.id, recipientId: studentId, courseId, batchId, title: String(data.title ?? "Notification"), body: String(data.body ?? ""), kind: (data.kind as PortalNotification["kind"]) ?? "general", isRead: data.isRead === true, createdAt: asDate(data.createdAt) };
  });
}

export async function markStudentNotificationRead(notificationId: string) {
  if (!firestore) return;
  await updateDoc(doc(firestore, "notifications", notificationId), { isRead: true, readAt: serverTimestamp() });
}

function asDate(value: unknown) {
  return value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function"
    ? value.toDate().toISOString()
    : typeof value === "string" ? value : undefined;
}
