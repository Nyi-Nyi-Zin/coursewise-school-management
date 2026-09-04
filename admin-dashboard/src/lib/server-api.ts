import "server-only";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export async function requireAdministrator(request: Request) {
  const match = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, "Sign in before using administrator tools.");
  // Create the Admin SDK client before handling token verification errors. A
  // missing or malformed server credential must not be reported as an expired
  // administrator session.
  let auth: ReturnType<typeof getFirebaseAdmin>["auth"];
  let db: ReturnType<typeof getFirebaseAdmin>["db"];
  try { ({ auth, db } = getFirebaseAdmin()); }
  catch { throw new ApiError(503, "Firebase server credentials are not configured correctly."); }
  let token;
  try { token = await auth.verifyIdToken(match[1], true); }
  catch { throw new ApiError(401, "Your session is invalid or has expired. Please sign in again."); }
  const profile = await db.doc(`users/${token.uid}`).get();
  if (!profile.exists || profile.data()?.role !== "admin") throw new ApiError(403, "Administrator access is required.");
  return token;
}

export function apiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message, message: error.message }, { status: error.status });
  console.error(fallback, error);
  return NextResponse.json({ error: fallback, message: fallback }, { status: 500 });
}
