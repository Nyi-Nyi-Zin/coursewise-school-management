import { authenticatedApiFetch } from "@/lib/authenticated-api";

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

export type CloudinaryUsage = {
  plan: string;
  usedBytes: number | null;
  limitBytes: number | null;
  remainingBytes: number | null;
  usedCredits: number | null;
  creditLimit: number | null;
  remainingCredits: number | null;
  storageEquivalentRemainingBytes: number | null;
  lastUpdated: string;
};

export type CloudinaryMediaPage = {
  assets: CloudinaryMediaAsset[];
  nextCursor: string | null;
  totalCount: number | null;
  usage: CloudinaryUsage;
};

export function getCloudinaryMedia(cursor?: string) {
  return authenticatedApiFetch(`/api/cloudinary/media${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`) as Promise<CloudinaryMediaPage>;
}

export function deleteCloudinaryMedia(asset: Pick<CloudinaryMediaAsset, "publicId" | "resourceType" | "deliveryType">) {
  return authenticatedApiFetch("/api/cloudinary/media", { method: "DELETE", body: JSON.stringify(asset) }) as Promise<{ ok: true }>;
}
