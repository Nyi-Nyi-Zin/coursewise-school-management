const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_ASSIGNMENT_FILE_BYTES = 20 * 1024 * 1024;

export async function uploadStudentPhotoToCloudinary(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Image must be smaller than 5 MB.");

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured. Add the public cloud name and unsigned upload preset.");
  }

  const body = new FormData();
  body.append("file", await compressProfilePhoto(file), "profile.jpg");
  body.append("upload_preset", uploadPreset);
  body.append("folder", "coursewise/avatars");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
  const payload = await response.json().catch(() => null) as { secure_url?: string; error?: { message?: string } } | null;
  if (!response.ok || !payload?.secure_url) throw new Error("Cloudinary could not upload this image.");
  return payload.secure_url;
}

export async function uploadAssignmentFileToCloudinary(file: File): Promise<string> {
  if (file.size > MAX_ASSIGNMENT_FILE_BYTES) throw new Error("File must be smaller than 20 MB.");

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured. Add the public cloud name and unsigned upload preset.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);
  body.append("folder", "coursewise/assignments");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body });
  const payload = await response.json().catch(() => null) as { secure_url?: string; error?: { message?: string } } | null;
  if (!response.ok || !payload?.secure_url) throw new Error("The file could not be uploaded.");
  return payload.secure_url;
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
