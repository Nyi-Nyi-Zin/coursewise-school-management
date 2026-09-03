"use client";

import { authenticatedApiFetch } from "@/lib/authenticated-api";

export type AdminCertificate = {
  id: string;
  certificateId: string;
  verificationCode: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  courseId: string;
  courseTitle: string;
  batchId: string;
  batchName: string;
  courseDescription: string;
  completionDate: string;
  issuedAt: string | null;
  templateKey: "classic" | "modern";
};

export type IssueCertificateInput = Omit<
  AdminCertificate,
  "id" | "verificationCode" | "issuedAt"
>;

export async function listCertificates(): Promise<AdminCertificate[]> {
  const result = (await authenticatedApiFetch("/api/certificates")) as {
    certificates?: AdminCertificate[];
  };
  return result.certificates ?? [];
}

export async function issueCertificate(input: IssueCertificateInput) {
  const result = (await authenticatedApiFetch("/api/certificates", {
    method: "POST",
    body: JSON.stringify(input),
  })) as { certificate: AdminCertificate };
  return result.certificate;
}
