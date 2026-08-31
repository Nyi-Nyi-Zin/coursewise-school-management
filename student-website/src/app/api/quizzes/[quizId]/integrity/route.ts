import { NextResponse } from "next/server";
import { recordIntegrityViolation } from "@/lib/assessment-backend";
import { ApiError, apiErrorResponse, requireAuthenticatedUser } from "@/lib/server-api";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { quizId } = await params;
    if (!quizId) throw new ApiError(400, "A quiz ID is required.");
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await recordIntegrityViolation(user.uid, quizId, body?.reason));
  } catch (error) {
    return apiErrorResponse(error, "The integrity event could not be recorded.");
  }
}
