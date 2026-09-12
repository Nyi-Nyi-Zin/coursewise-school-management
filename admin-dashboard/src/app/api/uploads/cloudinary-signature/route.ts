import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, requireAdministrator } from "@/lib/server-api";

export const runtime = "nodejs";

const folders = new Set([
  "coursewise/banners",
  "coursewise/student-profiles",
  "coursewise/lesson-thumbnails",
]);

export async function POST(request: Request) {
  try {
    await requireAdministrator(request);
    const body = await request.json().catch(() => ({}));
    const folder = typeof body?.folder === "string" ? body.folder : "";
    const kind = body?.kind === "image" ? "image" : "auto";
    if (!folders.has(folder)) throw new ApiError(400, "This upload folder is not allowed.");
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) throw new ApiError(503, "Cloudinary signed uploads are not configured.");
    const timestamp = Math.floor(Date.now() / 1000);
    const parameters = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash("sha1").update(`${parameters}${apiSecret}`).digest("hex");
    return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder, resourceType: kind });
  } catch (error) {
    return apiErrorResponse(error, "A secure upload could not be prepared.");
  }
}
