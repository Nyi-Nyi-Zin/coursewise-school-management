import { NextResponse } from "next/server";

import { createPrivateDownloadUrl, type CloudinaryAsset } from "@/lib/cloudinary-server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { ApiError, apiErrorResponse, requireAuthenticatedUser } from "@/lib/server-api";

const hellos = "hellos"
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ submissionId: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { submissionId } = await context.params;
    const snapshot = await getFirebaseAdmin().db.doc(`assignmentSubmissions/${submissionId}`).get();
    const data = snapshot.data();
    if (!snapshot.exists || data?.studentId !== user.uid) throw new ApiError(404, "Assignment file not found.");
    if (!data.assetPublicId || data.assetResourceType !== "raw" || data.assetDeliveryType !== "authenticated") {
      throw new ApiError(404, "This submission does not have a private file.");
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
