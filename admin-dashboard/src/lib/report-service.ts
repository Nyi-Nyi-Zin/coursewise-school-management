import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { getFirebaseClient } from "./firebase";

export type AttendanceReportRecord = { studentId: string; date: string; status: string; note: string };

export async function loadAttendanceReport(courseId: string, batchId: string): Promise<AttendanceReportRecord[]> {
  if (!courseId || !batchId) return [];
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(query(collection(db, "attendance"), where("courseId", "==", courseId), where("batchId", "==", batchId), orderBy("date", "desc")));
  return snapshot.docs.map(item => {
    const data = item.data() as Record<string, unknown>;
    const fields = data.fields && typeof data.fields === "object" ? data.fields as Record<string, unknown> : {};
    return { studentId: String(data.studentId ?? ""), date: String(data.date ?? ""), status: String(data.status ?? ""), note: String(data.note ?? fields.note ?? "") };
  });
}
