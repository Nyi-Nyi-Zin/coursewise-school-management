const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_ASSIGNMENT_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ASSIGNMENT_TYPES = new Set([
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

export type UploadedPrivateAsset = {
  assetPublicId: string;
  assetResourceType: "raw";
  assetDeliveryType: "authenticated";
  assetFormat: string;
  assetVersion: number;
};

type SignedUpload = {
  cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string;
  resourceType: "image" | "raw"; public_id?: string; type?: "authenticated";
  upload_preset?: string;
};

async function requestSignedUpload(body: Record<string, unknown>): Promise<SignedUpload> {
  const { authenticatedApiFetch } = await import("@/lib/authenticated-api");
  return await authenticatedApiFetch("/api/uploads/cloudinary-signature", {
    method: "POST",
    body: JSON.stringify(body),
  }) as SignedUpload;
}

async function uploadSigned(file: Blob, fileName: string, signed: SignedUpload) {
  const body = new FormData();
  body.append("file", file, fileName);
  body.append("api_key", signed.apiKey);
  body.append("timestamp", String(signed.timestamp));
  body.append("signature", signed.signature);
  body.append("folder", signed.folder);
  if (signed.public_id) body.append("public_id", signed.public_id);
  if (signed.type) body.append("type", signed.type);
  if (signed.upload_preset) body.append("upload_preset", signed.upload_preset);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`, { method: "POST", body });
  const payload = await response.json().catch(() => null) as { secure_url?: string; public_id?: string; resource_type?: string; type?: string; format?: string; version?: number; error?: { message?: string } } | null;
  if (!response.ok || !payload?.secure_url) throw new Error(`Cloudinary could not upload this file.${payload?.error?.message ? ` ${payload.error.message}` : ""}`);
  return payload.secure_url;
}

export async function uploadStudentProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Image must be smaller than 5 MB.");
  const compressed = await compressProfilePhoto(file);
  return uploadSigned(compressed, "profile.jpg", await requestSignedUpload({ kind: "avatar", contentType: compressed.type || "image/jpeg", size: compressed.size }));
}

export async function uploadAssignmentFileToCloudinary(
  file: File,
  scope: { assignmentId: string; courseId: string; batchId: string },
): Promise<UploadedPrivateAsset> {
  if (file.size > MAX_ASSIGNMENT_FILE_BYTES) throw new Error("File must be smaller than 10 MB on the Cloudinary free plan.");
  if (!ALLOWED_ASSIGNMENT_TYPES.has(file.type) && !file.type.startsWith("image/")) throw new Error("This file type is not supported.");
  const signed = await requestSignedUpload({ kind: "assignment", contentType: file.type, size: file.size, ...scope });
  const body = new FormData();
  body.append("file", file, file.name.replace(/[^a-zA-Z0-9._-]/g, "_"));
  body.append("api_key", signed.apiKey);
  body.append("timestamp", String(signed.timestamp));
  body.append("signature", signed.signature);
  body.append("folder", signed.folder);
  body.append("public_id", signed.public_id!);
  body.append("type", "authenticated");
  if (signed.upload_preset) body.append("upload_preset", signed.upload_preset);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/raw/upload`, { method: "POST", body });
  const payload = await response.json().catch(() => null) as { public_id?: string; resource_type?: string; type?: string; format?: string; version?: number; error?: { message?: string } } | null;
  if (!response.ok || !payload?.public_id) {
    const detail = payload?.error?.message ?? "Check your connection and Cloudinary quota.";
    throw new Error(`Assignment file could not be uploaded. ${detail}`);
  }
  return {
    assetPublicId: payload.public_id,
    assetResourceType: "raw",
    assetDeliveryType: "authenticated",
    assetFormat: payload.format ?? file.name.split(".").pop()?.toLowerCase() ?? "",
    assetVersion: Number(payload.version ?? 0),
  };
}

export async function compressProfilePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 500;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this photo.");
    const side = Math.min(bitmap.width, bitmap.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 500, 500);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 500, 500);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not compress this photo.")), "image/jpeg", 0.8));
  } finally {
    bitmap.close();
  }
}
