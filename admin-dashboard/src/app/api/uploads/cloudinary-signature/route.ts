import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, requireAdministrator } from "@/lib/server-api";

export const runtime = "nodejs";

const folders = new Map([
  ["coursewise/banners", 5 * 1024 * 1024],
  ["coursewise/student-profiles", 5 * 1024 * 1024],
  ["coursewise/lesson-thumbnails", 5 * 1024 * 1024],
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
    await requireAdministrator(request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const folder = typeof body?.folder === "string" ? body.folder : "";
    const maxBytes = folders.get(folder);
    if (!maxBytes) throw new ApiError(400, "This upload folder is not allowed.");
    if (body?.kind !== "image") throw new ApiError(400, "Only image uploads are allowed here.");
    assertImageUpload(body, maxBytes);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) throw new ApiError(503, "Cloudinary signed uploads are not configured.");
    const timestamp = Math.floor(Date.now() / 1000);
    const parameters = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash("sha1").update(`${parameters}${apiSecret}`).digest("hex");
    return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder, resourceType: "image" });
  } catch (error) {
    return apiErrorResponse(error, "A secure upload could not be prepared.");
  }
}
