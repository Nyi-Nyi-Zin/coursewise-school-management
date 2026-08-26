import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { ApiError, apiErrorResponse, requireAdministrator } from "@/lib/server-api";

export const runtime = "nodejs";

type CertificateBody = {
  certificateId?: unknown;
  studentId?: unknown;
  studentName?: unknown;
  studentCode?: unknown;
  courseId?: unknown;
  courseTitle?: unknown;
  batchId?: unknown;
  batchName?: unknown;
  completionDate?: unknown;
  templateKey?: unknown;
};

function text(value: unknown, label: string) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new ApiError(400, `${label} is required.`);
  return result;
}

function randomCode(length: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function dateString(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : null;
}

function certificateRecord(id: string, data: Record<string, unknown>) {
  const issuedAt = dateString(data.issuedAt);
  return {
    id,
    certificateId: String(data.certificateId ?? id),
    verificationCode: String(data.verificationCode ?? ""),
    studentId: String(data.studentId ?? ""),
    studentName: String(data.studentName ?? "Student"),
    studentCode: String(data.studentCode ?? ""),
    courseId: String(data.courseId ?? ""),
    courseTitle: String(data.courseTitle ?? "Course"),
    batchId: String(data.batchId ?? ""),
    batchName: String(data.batchName ?? "Batch"),
    completionDate: String(data.completionDate ?? issuedAt?.slice(0, 10) ?? ""),
    issuedAt,
    templateKey: data.templateKey === "modern" ? "modern" : "classic",
  };
}

export async function GET(request: Request) {
  try {
    await requireAdministrator(request);
    const snapshot = await getFirebaseAdmin().db.collection("certificates").get();
    const certificates = snapshot.docs
      .map(document => certificateRecord(document.id, document.data()))
      .sort((left, right) => (right.issuedAt ?? "").localeCompare(left.issuedAt ?? ""));
    return NextResponse.json({ certificates });
  } catch (error) {
    return apiErrorResponse(error, "Could not load certificates.");
  }
}

export async function POST(request: Request) {
  try {
    await requireAdministrator(request);
    const body = (await request.json()) as CertificateBody;
    const certificateId = text(body.certificateId, "Certificate serial ID");
    const completionDate = text(body.completionDate, "Completion date");
    const parsedDate = new Date(`${completionDate}T12:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime())) throw new ApiError(400, "Completion date is invalid.");

    const db = getFirebaseAdmin().db;
    const duplicate = await db.collection("certificates").where("certificateId", "==", certificateId).limit(1).get();
    if (!duplicate.empty) throw new ApiError(409, "That certificate serial ID is already in use.");

    const reference = db.collection("certificates").doc();
    const data = {
      certificateId,
      verificationCode: randomCode(10),
      studentId: text(body.studentId, "Student"),
      studentName: text(body.studentName, "Student name"),
      studentCode: text(body.studentCode, "Student ID"),
      courseId: text(body.courseId, "Course"),
      courseTitle: text(body.courseTitle, "Course name"),
      batchId: text(body.batchId, "Batch"),
      batchName: text(body.batchName, "Batch number"),
      completionDate,
      quizId: "manual-admin-issue",
      quizTitle: "Course completion",
      score: 0,
      totalMarks: 0,
      percentage: 0,
      attemptNumber: 0,
      issuedAt: Timestamp.fromDate(parsedDate),
      createdAt: FieldValue.serverTimestamp(),
      issuedBy: "admin",
      templateKey: body.templateKey === "modern" ? "modern" : "classic",
    };
    await reference.set(data);
    return NextResponse.json(
      { certificate: certificateRecord(reference.id, data) },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, "Could not issue the certificate.");
  }
}
