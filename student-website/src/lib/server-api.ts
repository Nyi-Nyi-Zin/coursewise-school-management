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
    return await getFirebaseAdmin().auth.verifyIdToken(match[1], true);
  } catch {
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
