import { NextResponse } from "next/server";

import { listStudentCertificates } from "@/lib/assessment-backend";
import { apiErrorResponse, requireAuthenticatedUser } from "@/lib/server-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    return NextResponse.json({ certificates: await listStudentCertificates(user.uid) });
  } catch (error) {
    return apiErrorResponse(error, "Could not load your certificates.");
  }
}
