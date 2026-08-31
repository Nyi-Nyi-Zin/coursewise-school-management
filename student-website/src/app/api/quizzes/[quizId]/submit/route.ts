import { NextResponse } from "next/server";

import { submitAssessment } from "@/lib/assessment-backend";
import { ApiError, apiErrorResponse, requireAuthenticatedUser } from "@/lib/server-api";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { quizId } = await params;
    if (!quizId) throw new ApiError(400, "A quiz ID is required.");
    const body = await request.json().catch(() => { throw new ApiError(400, "A valid submission is required."); });
    return NextResponse.json(await submitAssessment(user.uid, quizId, body?.sessionId, body?.answers));
  } catch (error) {
    return apiErrorResponse(error, "Your answers could not be saved. Please try again.");
  }
}
