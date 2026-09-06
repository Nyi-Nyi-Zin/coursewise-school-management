import { NextResponse } from "next/server";

import { listAssessmentCatalog, listAssessmentCatalogPage } from "@/lib/assessment-backend";
import type { QuizCatalogRequest, QuizFilter } from "@/lib/quiz-catalog";
import { ApiError, apiErrorResponse, requireAuthenticatedUser } from "@/lib/server-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    const url = new URL(request.url);
    if (url.searchParams.has("page")) {
      const input = parseCatalogRequest(url.searchParams);
      return NextResponse.json(await listAssessmentCatalogPage(user.uid, input), { headers: { "Cache-Control": "private, no-store" } });
    }
    const courseId = url.searchParams.get("courseId")?.trim() ?? "";
    const batchId = url.searchParams.get("batchId")?.trim() ?? "";
    if (!courseId || !batchId) throw new ApiError(400, "A course and batch are required.");
    return NextResponse.json({ quizzes: await listAssessmentCatalog(user.uid, courseId, batchId) });
  } catch (error) {
    return apiErrorResponse(error, "Could not load the quiz catalog.");
  }
}

function parseCatalogRequest(params: URLSearchParams): QuizCatalogRequest {
  const rawPage = params.get("page") ?? "";
  const page = Number(rawPage);
  const filter = params.get("filter") ?? "all";
  const query = (params.get("query") ?? "").trim();
  if (!/^\d+$/.test(rawPage) || !Number.isSafeInteger(page) || !["all", "available", "completed", "upcoming"].includes(filter) || query.length > 200) {
    throw new ApiError(400, "Invalid quiz pagination or filter.");
  }
  let scopes: unknown;
  try { scopes = JSON.parse(params.get("enrollments") ?? "[]"); }
  catch { throw new ApiError(400, "Invalid enrollment list."); }
  if (!Array.isArray(scopes) || scopes.length > 50) throw new ApiError(400, "Invalid enrollment list.");
  const enrollments = scopes.map((scope: unknown) => {
    if (!scope || typeof scope !== "object" || !("courseId" in scope) || !("batchId" in scope)
      || typeof scope.courseId !== "string" || typeof scope.batchId !== "string"
      || !scope.courseId.trim() || !scope.batchId.trim() || /[/]/.test(scope.courseId + scope.batchId)
      || scope.courseId.length > 150 || scope.batchId.length > 150) throw new ApiError(400, "Invalid course or batch.");
    return { courseId: scope.courseId.trim(), batchId: scope.batchId.trim() };
  });
  return { enrollments, page, query, filter: filter as QuizFilter };
}
