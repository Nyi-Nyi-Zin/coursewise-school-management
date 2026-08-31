import { NextResponse } from "next/server";

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { ApiError, apiErrorResponse, requireAdministrator } from "@/lib/server-api";
import { isStrongPassword, STRONG_PASSWORD_MESSAGE } from "../../../../../shared/auth-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdministrator(request);
    const body = await request.json().catch(() => { throw new ApiError(400, "A valid password change request is required."); });
    const uid = String(body?.uid ?? "").trim();
    const password = String(body?.password ?? "");
    if (!uid) throw new ApiError(400, "A student account id is required.");
    if (!isStrongPassword(password)) throw new ApiError(400, STRONG_PASSWORD_MESSAGE);
    await getFirebaseAdmin().auth.updateUser(uid, { password });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "The student password could not be changed.");
  }
}
