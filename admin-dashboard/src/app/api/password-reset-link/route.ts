import { NextResponse } from "next/server";

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { ApiError, apiErrorResponse, requireAdministrator } from "@/lib/server-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdministrator(request);
    const body = await request.json().catch(() => { throw new ApiError(400, "A valid password reset request is required."); });
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) throw new ApiError(400, "A student email address is required.");
    return NextResponse.json({ link: await getFirebaseAdmin().auth.generatePasswordResetLink(email) });
  } catch (error) {
    return apiErrorResponse(error, "The reset link could not be created.");
  }
}
