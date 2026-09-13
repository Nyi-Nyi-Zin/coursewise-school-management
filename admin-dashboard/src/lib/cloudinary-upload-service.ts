import { authenticatedApiFetch } from "@/lib/authenticated-api";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type SignedUpload = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; resourceType: "image"; upload_preset?: string };

export async function uploadImageToCloudinary(file: File, options: { folder: string }): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be smaller than 5 MB.");

  const signed = await authenticatedApiFetch("/api/uploads/cloudinary-signature", { method: "POST", body: JSON.stringify({ kind: "image", folder: options.folder, contentType: file.type, size: file.size }) }) as SignedUpload;
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", signed.apiKey);
  body.append("timestamp", String(signed.timestamp));
  body.append("signature", signed.signature);
  body.append("folder", signed.folder);
  if (signed.upload_preset) body.append("upload_preset", signed.upload_preset);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: "POST", body });
  const payload = await response.json().catch(() => null) as { secure_url?: string; error?: { message?: string } } | null;
  if (!response.ok || !payload?.secure_url) throw new Error(`Cloudinary could not upload this image.${payload?.error?.message ? ` ${payload.error.message}` : ""}`);
  return payload.secure_url;
}

export function uploadBannerImage(file: File) {
  return uploadImageToCloudinary(file, { folder: "coursewise/banners" });
}

export function uploadLessonThumbnail(file: File) {
  return uploadImageToCloudinary(file, { folder: "coursewise/lesson-thumbnails" });
}

export function uploadStudentProfilePhoto(file: File) {
  return uploadImageToCloudinary(file, { folder: "coursewise/student-profiles" });
}
