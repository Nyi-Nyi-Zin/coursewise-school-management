import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { ApiError } from "@/lib/server-api";

export type CloudinaryAsset = {
  assetPublicId: string;
  assetResourceType: "raw";
  assetDeliveryType: "authenticated";
  assetFormat: string;
  assetVersion: number;
};

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new ApiError(503, "Cloudinary is not configured.");
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return { cloudName, apiKey, apiSecret };
}

export function createSignedUpload(parameters: Record<string, string | number>) {
  const { cloudName, apiKey, apiSecret } = configureCloudinary();
  return {
    cloudName,
    apiKey,
    ...parameters,
    signature: cloudinary.utils.api_sign_request(parameters, apiSecret),
  };
}

export function createPrivateDownloadUrl(asset: CloudinaryAsset, fileName?: string) {
  configureCloudinary();
  return cloudinary.utils.private_download_url(asset.assetPublicId, asset.assetFormat, {
    resource_type: asset.assetResourceType,
    type: asset.assetDeliveryType,
    expires_at: Math.floor(Date.now() / 1000) + 300,
    attachment: true,
    ...(fileName ? { filename: fileName } : {}),
  });
}

export async function destroyPrivateAsset(publicId: string) {
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw", type: "authenticated", invalidate: true });
}
