import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createSignedUpload, destroyPrivateAsset } from "@/lib/cloudinary-server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { ApiError, apiErrorResponse, requireAuthenticatedUser } from "@/lib/server-api";

export const runtime = "nodejs";

const folders = {
  avatar: { folder: "coursewise/avatars", resourceType: "image", maxBytes: 5 * 1024 * 1024 },
  assignment: { folder: "coursewise/assignments", resourceType: "raw", maxBytes: 10 * 1024 * 1024 },
} as const;

const assignmentTypes = new Set([
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain",
]);

function assertImageUpload(body: Record<string, unknown>, maxBytes: number) {
  const contentType = String(body?.contentType ?? "");
  if (!contentType.startsWith("image/")) throw new ApiError(400, "Only image uploads are allowed here.");
  const size = Number(body?.size);
  if (!Number.isFinite(size) || size < 0 || size > maxBytes) {
    throw new ApiError(400, "The uploaded image exceeds the allowed size.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const kind = body.kind as keyof typeof folders;
    const selected = folders[kind];
    if (!selected) throw new ApiError(400, "An upload type is required.");
    const contentType = String(body.contentType ?? "");
    const size = Number(body.size);
    if (!Number.isFinite(size) || size <= 0 || size > selected.maxBytes) throw new ApiError(400, `File must be smaller than ${selected.maxBytes / 1024 / 1024} MB.`);
    const { db } = getFirebaseAdmin();
    if (kind === "avatar") {
      assertImageUpload(body, selected.maxBytes);
      const profile = await db.doc(`users/${user.uid}`).get();
      if (String(profile.data()?.photoUrl ?? "")) throw new ApiError(409, "You have already uploaded a profile photo. Ask an administrator to reset it first.");
    } else {
      if (!assignmentTypes.has(contentType) && !contentType.startsWith("image/")) throw new ApiError(400, "This assignment file type is not supported.");
      const assignmentId = String(body.assignmentId ?? "");
      const courseId = String(body.courseId ?? "");
      const batchId = String(body.batchId ?? "");
      if (!assignmentId || !courseId || !batchId) throw new ApiError(400, "Assignment scope is required.");
      const [assignment, enrollment] = await Promise.all([
        db.doc(`assignments/${assignmentId}`).get(),
        db.doc(`enrollments/${courseId}_${batchId}_${user.uid}`).get(),
      ]);
      const assignmentData = assignment.data();
      if (!assignment.exists || assignmentData?.isPublished !== true || assignmentData?.courseId !== courseId || assignmentData?.batchId !== batchId || enrollment.data()?.status !== "active") {
        throw new ApiError(403, "This assignment is not available for your active enrollment.");
      }
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = kind === "assignment" ? `${selected.folder}/${user.uid}/${String(body.assignmentId)}` : selected.folder;
    const parameters: Record<string, string | number> = kind === "assignment"
      ? { folder, public_id: randomUUID(), timestamp, type: "authenticated", upload_preset: "coursewise_assignment_private" }
      : { folder, timestamp, upload_preset: "coursewise_images" };
    return NextResponse.json({ ...createSignedUpload(parameters), resourceType: selected.resourceType });
  } catch (error) {
    return apiErrorResponse(error, "A secure upload could not be prepared.");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const publicId = String(body.publicId ?? "");
    if (!publicId.startsWith(`coursewise/assignments/${user.uid}/`)) throw new ApiError(403, "This uploaded asset cannot be removed by your account.");
    await destroyPrivateAsset(publicId);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiErrorResponse(error, "The unused upload could not be removed.");
  }
}
