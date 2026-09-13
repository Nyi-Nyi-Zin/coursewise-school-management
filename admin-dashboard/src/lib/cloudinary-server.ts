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

export type CloudinaryMediaAsset = {
  assetId: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  deliveryType: "upload" | "private" | "authenticated" | "fetch";
  format: string;
  originalFilename: string;
  bytes: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  pages: number | null;
  createdAt: string;
  folder: string;
  secureUrl: string;
};

type CloudinarySearchResource = Record<string, unknown>;

const resourceTypes = new Set(["image", "video", "raw"]);
const deliveryTypes = new Set(["upload", "private", "authenticated", "fetch"]);

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toMediaAsset(resource: CloudinarySearchResource): CloudinaryMediaAsset | null {
  const publicId = stringValue(resource.public_id);
  const resourceType = stringValue(resource.resource_type);
  const deliveryType = stringValue(resource.type) || "upload";
  if (!publicId || !resourceTypes.has(resourceType) || !deliveryTypes.has(deliveryType)) return null;
  return {
    assetId: stringValue(resource.asset_id),
    publicId,
    resourceType: resourceType as CloudinaryMediaAsset["resourceType"],
    deliveryType: deliveryType as CloudinaryMediaAsset["deliveryType"],
    format: stringValue(resource.format),
    originalFilename: stringValue(resource.original_filename),
    bytes: numberValue(resource.bytes) ?? 0,
    width: numberValue(resource.width),
    height: numberValue(resource.height),
    duration: numberValue(resource.duration),
    pages: numberValue(resource.pages),
    createdAt: stringValue(resource.created_at),
    folder: stringValue(resource.folder),
    secureUrl: stringValue(resource.secure_url),
  };
}

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
  return { cloudName, apiKey, ...parameters, signature: cloudinary.utils.api_sign_request(parameters, apiSecret) };
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

/** Lists every Cloudinary asset type through the Search API, newest first. */
export async function listCloudinaryMedia(nextCursor?: string) {
  configureCloudinary();
  const search = cloudinary.search
    .expression("resource_type:image OR resource_type:video OR resource_type:raw")
    .sort_by("created_at", "desc")
    .max_results(30);
  if (nextCursor) search.next_cursor(nextCursor);
  const result = await search.execute() as { resources?: CloudinarySearchResource[]; next_cursor?: string; total_count?: number };
  return {
    assets: (result.resources ?? []).map(toMediaAsset).filter((asset): asset is CloudinaryMediaAsset => asset !== null),
    nextCursor: typeof result.next_cursor === "string" ? result.next_cursor : null,
    totalCount: typeof result.total_count === "number" ? result.total_count : null,
  };
}

export async function getCloudinaryUsage() {
  configureCloudinary();
  const usage = await cloudinary.api.usage() as {
    plan?: string;
    storage?: { usage?: number; limit?: number; credits_usage?: number };
    credits?: { usage?: number; limit?: number };
    last_updated?: string;
  };
  const usedBytes = numberValue(usage.storage?.usage);
  const limitBytes = numberValue(usage.storage?.limit);
  const usedCredits = numberValue(usage.credits?.usage);
  const creditLimit = numberValue(usage.credits?.limit);
  const remainingCredits = usedCredits !== null && creditLimit !== null ? Math.max(0, creditLimit - usedCredits) : null;
  // Free and self-service Cloudinary plans have a shared credit allowance
  // rather than a separate storage limit. One credit equals one GB of storage.
  const storageEquivalentRemainingBytes = remainingCredits === null ? null : remainingCredits * 1024 ** 3;
  return {
    plan: stringValue(usage.plan),
    usedBytes,
    limitBytes,
    remainingBytes: usedBytes !== null && limitBytes !== null ? Math.max(0, limitBytes - usedBytes) : null,
    usedCredits,
    creditLimit,
    remainingCredits,
    storageEquivalentRemainingBytes,
    lastUpdated: stringValue(usage.last_updated),
  };
}

export async function permanentlyDeleteCloudinaryMedia(input: Pick<CloudinaryMediaAsset, "publicId" | "resourceType" | "deliveryType">) {
  if (!resourceTypes.has(input.resourceType) || !deliveryTypes.has(input.deliveryType) || !input.publicId.trim()) {
    throw new ApiError(400, "The Cloudinary asset details are invalid.");
  }
  configureCloudinary();
  const result = await cloudinary.uploader.destroy(input.publicId, {
    resource_type: input.resourceType,
    type: input.deliveryType,
    // Remove cached copies too, so an old URL stops serving the deleted asset.
    invalidate: true,
  }) as { result?: string };
  if (result.result !== "ok") {
    throw new ApiError(result.result === "not found" ? 404 : 502, result.result === "not found" ? "This Cloudinary asset no longer exists." : "Cloudinary did not confirm deletion of this asset.");
  }
}
