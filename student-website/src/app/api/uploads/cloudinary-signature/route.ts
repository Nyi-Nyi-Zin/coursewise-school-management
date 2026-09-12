import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, requireAuthenticatedUser } from "@/lib/server-api";

export const runtime = "nodejs";

const folders = {
  avatar: { folder: "coursewise/avatars", resourceType: "image" },
} as const;

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const body = await request.json().catch(() => ({}));
    const kind = body?.kind as keyof typeof folders;
    const selected = folders[kind];
    if (!selected) throw new ApiError(400, "An upload type is required.");
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) throw new ApiError(503, "Cloudinary signed uploads are not configured.");
    const timestamp = Math.floor(Date.now() / 1000);
    const parameters = `folder=${selected.folder}&timestamp=${timestamp}`;
    const signature = createHash("sha1").update(`${parameters}${apiSecret}`).digest("hex");
    return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder: selected.folder, resourceType: selected.resourceType });
  } catch (error) {
    return apiErrorResponse(error, "A secure upload could not be prepared.");
  }
}
