import { NextResponse } from "next/server";

import { getCloudinaryUsage, listCloudinaryMedia, permanentlyDeleteCloudinaryMedia } from "@/lib/cloudinary-server";
import { ApiError, apiErrorResponse, requireAdministrator } from "@/lib/server-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrator(request);
    const cursor = new URL(request.url).searchParams.get("cursor")?.trim() || undefined;
    const [media, usage] = await Promise.all([listCloudinaryMedia(cursor), getCloudinaryUsage()]);
    return NextResponse.json({ ...media, usage });
  } catch (error) {
    return apiErrorResponse(error, "Cloudinary media could not be loaded.");
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdministrator(request);
    const body = await request.json().catch(() => { throw new ApiError(400, "Cloudinary asset details are required."); }) as Record<string, unknown>;
    const publicId = typeof body.publicId === "string" ? body.publicId.trim() : "";
    const resourceType = body.resourceType;
    const deliveryType = body.deliveryType;
    if (!publicId || (resourceType !== "image" && resourceType !== "video" && resourceType !== "raw") || (deliveryType !== "upload" && deliveryType !== "private" && deliveryType !== "authenticated" && deliveryType !== "fetch")) {
      throw new ApiError(400, "Valid Cloudinary asset details are required.");
    }
    await permanentlyDeleteCloudinaryMedia({ publicId, resourceType, deliveryType });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "The Cloudinary asset could not be deleted.");
  }
}
