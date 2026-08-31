import { NextResponse } from "next/server";

import { loadAssessmentResults } from "@/lib/assessment-backend";
import { ApiError, apiErrorResponse, requireAuthenticatedUser } from "@/lib/server-api";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { quizId } = await params;
    if (!quizId) throw new ApiError(400, "A quiz ID is required.");
    return NextResponse.json(await loadAssessmentResults(user.uid, quizId));
  } catch (error) {
    return apiErrorResponse(error, "Could not load your assessment results.");
  }
}
