import { NextResponse } from "next/server";
import { checkChapterAnswer } from "@/lib/assessment-backend";
import { ApiError, apiErrorResponse, requireAuthenticatedUser } from "@/lib/server-api";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { quizId } = await params;
    if (!quizId) throw new ApiError(400, "A quiz ID is required.");
    const body = await request.json().catch(() => { throw new ApiError(400, "A valid answer is required."); });
    return NextResponse.json(await checkChapterAnswer(user.uid, quizId, body?.questionId, body?.selectedIndices));
  } catch (error) {
    return apiErrorResponse(error, "This answer could not be checked.");
  }
}
