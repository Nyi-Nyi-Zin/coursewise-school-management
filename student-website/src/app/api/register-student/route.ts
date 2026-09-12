import { createHmac } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { isEnglishName, isStrongPassword, isValidEmail, normalizeEmail, STRONG_PASSWORD_MESSAGE } from "../../../../../shared/auth-validation";

export const runtime = "nodejs";

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_SWEEP_LIMIT = 25;

class RegistrationError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function cleanupExpiredRateLimits(now: number) {
  const { db } = getFirebaseAdmin();
  try {
    const expired = await db.collection("system")
      .where("expiresAtMillis", "<", now)
      .orderBy("expiresAtMillis")
      .limit(RATE_LIMIT_SWEEP_LIMIT)
      .get();
    await Promise.allSettled(expired.docs.map(document => document.ref.delete()));
  } catch (error) {
    console.error("Rate-limit expiry sweep failed", error);
  }
}

const AUTH_ACTIONS = new Set(["student_login", "student_reset_request", "student_reset_confirm"]);

async function verifyRecaptcha(token: string, action: string, request: Request) {
  const secret = process.env.RECAPTCHA_V3_SECRET_KEY;
  if (!secret) throw new RegistrationError(503, "Security verification is not configured.");
  const parameters = new URLSearchParams({ secret, response: token });
  const ip = clientIp(request); if (ip !== "unknown") parameters.set("remoteip", ip);
  const result = await fetch("https://www.google.com/recaptcha/api/siteverify", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: parameters, cache: "no-store" }).then(response => response.json()) as { success?: boolean; score?: number; action?: string; "error-codes"?: string[] };
  if (!result.success || result.action !== action || Number(result.score ?? 0) < 0.5) {
    const diagnostic = process.env.NODE_ENV === "development"
      ? ` (Google: ${result["error-codes"]?.join(", ") || `action=${result.action ?? "none"}, score=${result.score ?? 0}`})`
      : "";
    throw new RegistrationError(403, `Security verification failed. Please try again.${diagnostic}`);
  }
}

async function enforceAuthRateLimit(request: Request, action: string, email: string) {
  const salt = process.env.SIGNUP_RATE_LIMIT_SALT; if (!salt) throw new RegistrationError(503, "Security verification is not configured.");
  const settings: Record<string, { max: number; window: number }> = { student_login: { max: 5, window: 900_000 }, student_reset_request: { max: 3, window: 3_600_000 }, student_reset_confirm: { max: 5, window: 3_600_000 } };
  const setting = settings[action]; const key = createHmac("sha256", salt).update(`${action}:${clientIp(request)}:${email}`).digest("hex"); const reference = getFirebaseAdmin().db.doc(`system/authRateLimits_${key}`); const now = Date.now();
  let startedFreshWindow = false;
  await getFirebaseAdmin().db.runTransaction(async transaction => { const snapshot = await transaction.get(reference); const started = Number(snapshot.data()?.windowStartedAtMillis ?? 0); const active = now - started < setting.window; const count = active ? Number(snapshot.data()?.count ?? 0) : 0; if (count >= setting.max) throw new RegistrationError(429, "Too many attempts. Please wait and try again."); startedFreshWindow = count === 0; transaction.set(reference, { action, count: count + 1, windowStartedAtMillis: active ? started : now, expiresAtMillis: (active ? started : now) + setting.window, updatedAt: FieldValue.serverTimestamp() }); });
  if (startedFreshWindow) await cleanupExpiredRateLimits(now);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => { throw new RegistrationError(400, "Security verification failed."); });
    const action = String(body?.action ?? ""); const email = normalizeEmail(String(body?.email ?? "")); const token = String(body?.token ?? "");
    if (!AUTH_ACTIONS.has(action) || !isValidEmail(email) || !token) throw new RegistrationError(400, "Security verification failed.");
    await verifyRecaptcha(token, action, request);
    await enforceAuthRateLimit(request, action, email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RegistrationError) return jsonError(error.status, error.message);
    return jsonError(500, "Security verification failed.");
  }
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
  let startedFreshWindow = false;
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.data();
    const windowStartedAtMillis = Number(current?.windowStartedAtMillis ?? 0);
    const inCurrentWindow = now - windowStartedAtMillis < RATE_LIMIT_WINDOW_MS;
    const count = inCurrentWindow ? Number(current?.count ?? 0) : 0;
    startedFreshWindow = count === 0;
    if (count >= RATE_LIMIT_MAX_ATTEMPTS) throw new RegistrationError(429, "Too many registration attempts. Please try again later.");
    transaction.set(reference, {
      count: count + 1,
      windowStartedAtMillis: inCurrentWindow ? windowStartedAtMillis : now,
      expiresAtMillis: (inCurrentWindow ? windowStartedAtMillis : now) + RATE_LIMIT_WINDOW_MS,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  if (startedFreshWindow) await cleanupExpiredRateLimits(now);
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
      requiresEmailVerification: true,
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
    const email = normalizeEmail(String(body?.email ?? ""));
    const password = String(body?.password ?? "");
    const recaptchaToken = String(body?.recaptchaToken ?? "");
    if (!isEnglishName(name)) throw new RegistrationError(400, "Enter your full name using English letters only.");
    if (!isValidEmail(email)) throw new RegistrationError(400, "Enter a valid email address.");
    if (!isStrongPassword(password)) throw new RegistrationError(400, STRONG_PASSWORD_MESSAGE);
    if (!recaptchaToken) throw new RegistrationError(400, "Security verification failed.");

    await verifyRecaptcha(recaptchaToken, "student_signup", request);
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
