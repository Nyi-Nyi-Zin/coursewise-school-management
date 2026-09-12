import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

import { firebaseApp } from "@/lib/firebase";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_ASSIGNMENT_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_ASSIGNMENT_TYPES = new Set([
  "application/pdf", "application/zip", "application/x-zip-compressed",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

type SignedUpload = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; resourceType: "image" };

async function requestSignedUpload(contentType: string, size: number): Promise<SignedUpload> {
  const { authenticatedApiFetch } = await import("@/lib/authenticated-api");
  return await authenticatedApiFetch("/api/uploads/cloudinary-signature", {
    method: "POST",
    body: JSON.stringify({ kind: "avatar", contentType, size }),
  }) as SignedUpload;
}

async function uploadSigned(file: Blob, fileName: string, signed: SignedUpload) {
  const body = new FormData();
  body.append("file", file, fileName);
  body.append("api_key", signed.apiKey);
  body.append("timestamp", String(signed.timestamp));
  body.append("signature", signed.signature);
  body.append("folder", signed.folder);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`, { method: "POST", body });
  const payload = await response.json().catch(() => null) as { secure_url?: string; error?: { message?: string } } | null;
  if (!response.ok || !payload?.secure_url) throw new Error(`Cloudinary could not upload this file.${payload?.error?.message ? ` ${payload.error.message}` : ""}`);
  return payload.secure_url;
}

export async function uploadStudentProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Image must be smaller than 5 MB.");
  const compressed = await compressProfilePhoto(file);
  return uploadSigned(compressed, "profile.jpg", await requestSignedUpload((compressed.type || "image/jpeg"), compressed.size));
}

export async function uploadAssignmentFileToStorage(studentId: string, file: File): Promise<string> {
  if (file.size > MAX_ASSIGNMENT_FILE_BYTES) throw new Error("File must be smaller than 20 MB.");
  if (!ALLOWED_ASSIGNMENT_TYPES.has(file.type) && !file.type.startsWith("image/")) throw new Error("This file type is not supported.");
  if (!firebaseApp) throw new Error("File uploads are only available in Firebase mode.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  try {
    const snapshot = await uploadBytes(
      ref(getStorage(firebaseApp), `assignments/${studentId}/${Date.now()}-${safeName}`),
      file,
      { contentType: file.type },
    );
    return await getDownloadURL(snapshot.ref);
  } catch {
    throw new Error("Your file could not be uploaded. Please try again.");
  }
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