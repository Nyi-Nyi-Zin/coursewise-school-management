import { NextResponse } from "next/server";

import { createPrivateDownloadUrl, type CloudinaryAsset } from "@/lib/cloudinary-server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { ApiError, apiErrorResponse, requireAdministrator } from "@/lib/server-api";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ submissionId: string }> }) {
  try {
    await requireAdministrator(request);
    const { submissionId } = await context.params;
    const snapshot = await getFirebaseAdmin().db.doc(`assignmentSubmissions/${submissionId}`).get();
    const data = snapshot.data();
    if (!snapshot.exists || !data?.assetPublicId || data.assetResourceType !== "raw" || data.assetDeliveryType !== "authenticated") {
      throw new ApiError(404, "Assignment file not found.");
    }
    const asset: CloudinaryAsset = {
      assetPublicId: String(data.assetPublicId), assetResourceType: "raw", assetDeliveryType: "authenticated",
      assetFormat: String(data.assetFormat ?? ""), assetVersion: Number(data.assetVersion ?? 0),
    };
    return NextResponse.json({ url: createPrivateDownloadUrl(asset, String(data.submissionFileName ?? "assignment-file")) });
  } catch (error) {
    return apiErrorResponse(error, "Assignment file could not be opened.");
  }
}
