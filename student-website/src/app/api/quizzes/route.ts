import { NextResponse } from "next/server";

import { listBatchQuizzes } from "@/lib/quiz-backend";
import { ApiError, apiErrorResponse, requireAuthenticatedUser } from "@/lib/server-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    const url = new URL(request.url);
    const courseId = url.searchParams.get("courseId")?.trim() ?? "";
    const batchId = url.searchParams.get("batchId")?.trim() ?? "";
    if (!courseId || !batchId) throw new ApiError(400, "A course and batch are required.");
    return NextResponse.json({ quizzes: await listBatchQuizzes(user.uid, courseId, batchId) });
  } catch (error) {
    return apiErrorResponse(error, "Could not load the quiz catalog.");
  }
}
