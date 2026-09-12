import { authenticatedApiFetch } from "@/lib/authenticated-api";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getFirebaseClient } from "@/lib/firebase";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_LESSON_FILE_BYTES = 100 * 1024 * 1024;

type SignedUpload = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; resourceType: "image" };

export async function uploadImageToCloudinary(file: File, options: { folder: string }): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be smaller than 5 MB.");

  const signed = await authenticatedApiFetch("/api/uploads/cloudinary-signature", { method: "POST", body: JSON.stringify({ kind: "image", folder: options.folder }) }) as SignedUpload;
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", signed.apiKey);
  body.append("timestamp", String(signed.timestamp));
  body.append("signature", signed.signature);
  body.append("folder", signed.folder);
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

export async function uploadLessonFile(file: File): Promise<string> {
  if (file.size > MAX_LESSON_FILE_BYTES) throw new Error("File must be smaller than 100 MB.");
  const { app } = getFirebaseClient();
  const storage = getStorage(app);
  const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") ?? "bin";
  const objectReference = ref(storage, `lessons/${crypto.randomUUID()}.${extension}`);
  try {
    const snapshot = await uploadBytes(objectReference, file, { contentType: file.type });
    return await getDownloadURL(snapshot.ref);
  } catch {
    throw new Error("Lesson file could not be uploaded. Check Firebase Storage configuration and try again.");
  }
}