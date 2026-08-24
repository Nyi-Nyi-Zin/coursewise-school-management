import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import type { CertificateRecord } from "../../../shared/phase-b-contracts";
import { firestore } from "./firebase";

export async function getStudentCertificates(studentId: string, courseId: string, batchId: string): Promise<CertificateRecord[]> {
  if (!studentId || !courseId || !batchId) return [];
  if (!firestore) return [];
  const snapshot = await getDocs(query(collection(firestore, "certificates"), where("studentId", "==", studentId), where("courseId", "==", courseId), where("batchId", "==", batchId), orderBy("issuedAt", "desc")));
  return snapshot.docs.map(item => certificateFromData(item.id, item.data() as Record<string, unknown>));
}

function certificateFromData(id: string, data: Record<string, unknown>): CertificateRecord {
  const asDate = (value: unknown) => value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function" ? value.toDate().toISOString() : typeof value === "string" ? value : undefined;
  return { id, studentId: String(data.studentId ?? ""), courseId: String(data.courseId ?? ""), batchId: String(data.batchId ?? ""), studentName: String(data.studentName ?? "Student"), courseTitle: String(data.courseTitle ?? "Course"), certificateNumber: String(data.certificateNumber ?? "Pending"), verificationCode: String(data.verificationCode ?? ""), completionPercent: Math.min(100, Math.max(0, Math.round(Number(data.completionPercent ?? 0)))), status: data.status === "revoked" ? "revoked" : "issued", issuedAt: asDate(data.issuedAt), revokedAt: asDate(data.revokedAt), revokeReason: typeof data.revokeReason === "string" ? data.revokeReason : undefined };
}
