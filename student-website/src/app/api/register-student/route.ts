import { createHmac } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { getFirebaseAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

class RegistrationError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message, message }, { status });
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function rateLimitKey(ip: string) {
  const salt = process.env.SIGNUP_RATE_LIMIT_SALT;
  if (!salt) throw new RegistrationError(500, "Registration is temporarily unavailable.");
  return createHmac("sha256", salt).update(ip).digest("hex");
}

async function enforceRateLimit(request: Request) {
  const { db } = getFirebaseAdmin();
  const reference = db.doc(`system/signupRateLimits_${rateLimitKey(clientIp(request))}`);
  const now = Date.now();
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.data();
    const windowStartedAtMillis = Number(current?.windowStartedAtMillis ?? 0);
    const inCurrentWindow = now - windowStartedAtMillis < RATE_LIMIT_WINDOW_MS;
    const count = inCurrentWindow ? Number(current?.count ?? 0) : 0;
    if (count >= RATE_LIMIT_MAX_ATTEMPTS) throw new RegistrationError(429, "Too many registration attempts. Please try again later.");
    transaction.set(reference, {
      count: count + 1,
      windowStartedAtMillis: inCurrentWindow ? windowStartedAtMillis : now,
      expiresAtMillis: (inCurrentWindow ? windowStartedAtMillis : now) + RATE_LIMIT_WINDOW_MS,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function verifyTurnstile(token: unknown, ip: string) {
  if (typeof token !== "string" || !token) throw new RegistrationError(400, "Complete the security verification.");
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new RegistrationError(500, "Registration is temporarily unavailable.");
  const form = new URLSearchParams({ secret, response: token, remoteip: ip });
  let result: { success?: boolean };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    result = await response.json() as { success?: boolean };
  } catch {
    throw new RegistrationError(503, "Security verification is temporarily unavailable.");
  }
  if (!result.success) throw new RegistrationError(400, "Security verification failed. Please try again.");
}

async function createNumberedStudentProfile(userId: string, input: { name: string; email: string }) {
  const { db } = getFirebaseAdmin();
  return db.runTransaction(async transaction => {
    const counterReference = db.collection("system").doc("studentCounter");
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
    transaction.set(db.collection("users").doc(userId), {
      name: input.name,
      email: input.email,
      role: "student",
      studentId,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return studentId;
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => { throw new RegistrationError(400, "A valid registration request is required."); });
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (!name || !email.includes("@") || password.length < 6) {
      throw new RegistrationError(400, "A name, valid email address, and password of at least 6 characters are required.");
    }

    const ip = clientIp(request);
    await verifyTurnstile(body?.turnstileToken, ip);
    await enforceRateLimit(request);

    const { auth } = getFirebaseAdmin();
    let userId: string | undefined;
    try {
      const user = await auth.createUser({ email, password, displayName: name });
      userId = user.uid;
      const studentId = await createNumberedStudentProfile(user.uid, { name, email });
      return NextResponse.json({ uid: user.uid, studentId }, { status: 201 });
    } catch (error) {
      if (userId) await auth.deleteUser(userId).catch(() => undefined);
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code.includes("email-already-exists")) throw new RegistrationError(409, "This email already has an account.");
      if (code.includes("invalid-email")) throw new RegistrationError(400, "Enter a valid email address and try again.");
      throw error;
    }
  } catch (error) {
    if (error instanceof RegistrationError) return jsonError(error.status, error.message);
    console.error("Student registration failed", error);
    return jsonError(500, "Unable to register your account. Please try again.");
  }
}
