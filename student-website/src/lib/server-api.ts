import "server-only";

import { NextResponse } from "next/server";

import { getFirebaseAdmin } from "@/lib/firebase-admin";

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, "Sign in to continue.");

  try {
    const { auth, db } = getFirebaseAdmin();
    const token = await auth.verifyIdToken(match[1], true);
    const profile = await db.doc(`users/${token.uid}`).get();
    const profileData = profile.data();
    if (!profile.exists || profileData?.role !== "student" || profileData?.isActive === false) {
      throw new ApiError(401, "Your student account is inactive or no longer available. Please sign in with an active account.");
    }
    if (token.email_verified !== true) {
      throw new ApiError(403, "Verify your email before using the student portal.");
    }
    return token;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Your session is invalid or has expired. Please sign in again.");
  }
}

export function apiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, message: error.message }, { status: error.status });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback, message: fallback }, { status: 500 });
}
