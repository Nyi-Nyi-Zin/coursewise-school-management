import "server-only";

import { NextResponse } from "next/server";

import { getFirebaseAdmin } from "@/lib/firebase-admin";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, "Sign in to continue.");

  let services: ReturnType<typeof getFirebaseAdmin>;
  try {
    services = getFirebaseAdmin();
  } catch (error) {
    console.error("Firebase Admin initialization failed", error);
    throw new ApiError(
      503,
      "The student service is temporarily unavailable. Please try again."
    );
  }

  let token: Awaited<ReturnType<typeof services.auth.verifyIdToken>>;
  try {
    token = await services.auth.verifyIdToken(match[1], true);
  } catch {
    throw new ApiError(
      401,
      "Your session is invalid or has expired. Please sign in again."
    );
  }

  let profile: Awaited<ReturnType<ReturnType<typeof services.db.doc>["get"]>>;
  try {
    profile = await services.db.doc(`users/${token.uid}`).get();
  } catch (error) {
    console.error("Student profile lookup failed", error);
    throw new ApiError(
      503,
      "The student service is temporarily unavailable. Please try again."
    );
  }
  const profileData = profile.data();
  if (
    !profile.exists ||
    profileData?.role !== "student" ||
    profileData?.isActive === false
  ) {
    throw new ApiError(
      401,
      "Your student account is inactive or no longer available. Please sign in with an active account."
    );
  }
  if (token.email_verified !== true)
    throw new ApiError(
      403,
      "Verify your email before using the student portal."
    );
  return token;
}

export function apiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, message: error.message },
      { status: error.status }
    );
  }
  console.error(fallback, error);
  return NextResponse.json(
    { error: fallback, message: fallback },
    { status: 500 }
  );
}
