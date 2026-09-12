const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function cloudinaryConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured. Add the public cloud name and unsigned upload preset.");
  }
  return { cloudName, uploadPreset };
}

export async function uploadToCloudinary(file: File, options: { kind: "image" | "file"; folder: string }): Promise<string> {
  const isImage = file.type.startsWith("image/");
  if (options.kind === "image" && !isImage) throw new Error("Please choose an image file.");
  if (file.size > (isImage ? MAX_IMAGE_BYTES : MAX_FILE_BYTES)) {
    throw new Error(isImage ? "Image must be smaller than 5 MB." : "File must be smaller than 10 MB.");
  }

  const { cloudName, uploadPreset } = cloudinaryConfig();
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);
  body.append("folder", options.folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body });
  const payload = await response.json().catch(() => null) as { secure_url?: string; error?: { message?: string } } | null;
  if (!response.ok || !payload?.secure_url) throw new Error("Cloudinary could not upload this file.");
  return payload.secure_url;
}

export function uploadBannerImage(file: File) {
  return uploadToCloudinary(file, { kind: "image", folder: "coursewise/banners" });
}

export function uploadStudentProfilePhoto(file: File) {
  return uploadToCloudinary(file, { kind: "image", folder: "coursewise/student-profiles" });
}

export function uploadLessonFile(file: File) {
  return uploadToCloudinary(file, { kind: "file", folder: "coursewise/lessons" });
}
