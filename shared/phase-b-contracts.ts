export type CertificateStatus = "issued" | "revoked";

export type CertificateRecord = {
  id: string;
  studentId: string;
  courseId: string;
  batchId: string;
  studentName: string;
  courseTitle: string;
  certificateNumber: string;
  verificationCode: string;
  completionPercent: number;
  issuedAt?: string;
  status: CertificateStatus;
  revokedAt?: string;
  revokeReason?: string;
};

export function normalizeCertificatePercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

export function formatCertificateNumber(date = new Date(), serial = Math.floor(Math.random() * 9000) + 1000) {
  return `TTL-${date.getFullYear()}-${String(serial).padStart(4, "0")}`;
}

export function makeVerificationCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
}
