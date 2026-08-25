import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { ApiError, apiErrorResponse, requireAdministrator } from "@/lib/server-api";

export const runtime = "nodejs";

async function createNumberedStudentProfile(userId: string, input: { name: string; email: string; photoUrl: string; isActive: boolean }) {
  const { db } = getFirebaseAdmin();
  return db.runTransaction(async transaction => {
    const counterReference = db.doc("system/studentCounter");
    const counter = await transaction.get(counterReference);
    let lastIssued = Number(counter.data()?.lastIssued ?? 0);
    if (!counter.exists) {
      const existingStudents = await transaction.get(db.collection("users").where("role", "==", "student"));
      lastIssued = existingStudents.docs.reduce((highest, student) => {
        const value = Number(student.data().studentId);
        return Number.isSafeInteger(value) && value >= 0 ? Math.max(highest, value) : highest;
      }, 0);
    }
    const nextNumber = Number.isSafeInteger(lastIssued) && lastIssued >= 0 ? lastIssued + 1 : 1;
    const studentId = String(nextNumber);
    transaction.set(counterReference, { lastIssued: nextNumber, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(db.doc(`users/${userId}`), { name: input.name, email: input.email, role: "student", studentId, isActive: input.isActive, ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return studentId;
  });
}

export async function POST(request: Request) {
  try {
    await requireAdministrator(request);
    const body = await request.json().catch(() => { throw new ApiError(400, "A valid student account request is required."); });
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const photoUrl = typeof body?.photoUrl === "string" ? body.photoUrl.trim() : "";
    const isActive = body?.isActive !== false;
    if (!name || !email.includes("@")) throw new ApiError(400, "A student name and email address are required.");

    const { auth } = getFirebaseAdmin();
    let userId: string | undefined;
    try {
      const user = await auth.createUser({ email, password: randomBytes(18).toString("base64url"), displayName: name, disabled: !isActive });
      userId = user.uid;
      const resetLink = await auth.generatePasswordResetLink(email);
      const studentId = await createNumberedStudentProfile(user.uid, { name, email, photoUrl, isActive });
      return NextResponse.json({ uid: user.uid, studentId, resetLink }, { status: 201 });
    } catch (error) {
      if (userId) await auth.deleteUser(userId).catch(() => undefined);
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code.includes("email-already-exists")) throw new ApiError(409, "An account with this email already exists.");
      if (code.includes("invalid-email")) throw new ApiError(400, "The email address is not valid.");
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error, "Could not create the student account.");
  }
}
