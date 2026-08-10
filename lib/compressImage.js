import imageCompression from "browser-image-compression";

// Compresse une image côté client avant l'upload — gain majeur sur data mobile.
// Renvoie le fichier tel quel si ce n'est pas une image (ex. PDF) ou en cas d'échec.
export async function compressImage(file, opts = {}) {
  if (!file || !file.type || !file.type.startsWith("image/")) return file;
  try {
    const out = await imageCompression(file, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      ...opts,
    });
    return new File([out], file.name, { type: out.type || file.type });
  } catch {
    return file;
  }
}
