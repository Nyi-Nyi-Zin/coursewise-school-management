import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { formatCertificateNumber, makeVerificationCode, normalizeCertificatePercent, type CertificateRecord } from "../../../shared/phase-b-contracts";
import { getFirebaseClient } from "./firebase";

export type CertificateDraft = Omit<CertificateRecord, "id" | "issuedAt" | "status" | "certificateNumber" | "verificationCode">;

export async function loadCertificates(courseId: string, batchId: string): Promise<CertificateRecord[]> {
  if (!courseId || !batchId) return [];
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(query(collection(db, "certificates"), where("courseId", "==", courseId), where("batchId", "==", batchId), orderBy("issuedAt", "desc")));
  return snapshot.docs.map(item => certificateFromData(item.id, item.data() as Record<string, unknown>));
}

export async function issueCertificate(draft: CertificateDraft) {
  if (!draft.studentId || !draft.courseId || !draft.batchId || !draft.studentName.trim() || !draft.courseTitle.trim()) throw new Error("Choose an enrolled student and provide the course details.");
  const { db } = getFirebaseClient();
  const created = await addDoc(collection(db, "certificates"), {
    ...draft,
    studentName: draft.studentName.trim(),
    courseTitle: draft.courseTitle.trim(),
    completionPercent: normalizeCertificatePercent(draft.completionPercent),
    certificateNumber: formatCertificateNumber(),
    verificationCode: makeVerificationCode(),
    status: "issued",
    issuedAt: serverTimestamp(),
  });
  return created.id;
}

export async function revokeCertificate(certificateId: string, reason: string) {
  const { db } = getFirebaseClient();
  await setDoc(doc(db, "certificates", certificateId), { status: "revoked", revokeReason: reason.trim() || "Revoked by administrator", revokedAt: serverTimestamp() }, { merge: true });
}

export function certificateFromData(id: string, data: Record<string, unknown>): CertificateRecord {
  return { id, studentId: String(data.studentId ?? ""), courseId: String(data.courseId ?? ""), batchId: String(data.batchId ?? ""), studentName: String(data.studentName ?? "Student"), courseTitle: String(data.courseTitle ?? "Course"), certificateNumber: String(data.certificateNumber ?? "Pending"), verificationCode: String(data.verificationCode ?? ""), completionPercent: normalizeCertificatePercent(Number(data.completionPercent ?? 0)), status: data.status === "revoked" ? "revoked" : "issued", issuedAt: asDate(data.issuedAt), revokedAt: asDate(data.revokedAt), revokeReason: typeof data.revokeReason === "string" ? data.revokeReason : undefined };
}

function asDate(value: unknown) { return value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function" ? value.toDate().toISOString() : typeof value === "string" ? value : undefined; }
