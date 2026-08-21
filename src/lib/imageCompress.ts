/**
 * Client-side image compression, applied before any photo is turned into a
 * base64 data URI and sent to the server.
 *
 * Why: every photo in this app is stored as a base64 data: URI embedded
 * directly in JSON (see AGENTS.md) — a single uncompressed phone photo can be
 * 3-8MB, so 40-50 photos in one case can reach 150-400MB raw. That blew past
 * Next.js's proxy body-size cap (see proxyClientMaxBodySize in next.config.ts)
 * and silently truncated the request, corrupting the JSON and losing the
 * entire case. Compressing client-side (resize + JPEG re-encode) is the fix
 * that scales with photo count instead of just raising the cap indefinitely.
 *
 * 2400px longest side / 85% JPEG quality is sized for print, not just screen:
 * comfortably above what a damage-report PDF needs even for a half-page photo
 * at 300 DPI, while cutting typical file size by 70-90%.
 */

const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 0.85;

/** Skip re-compressing files already small enough that it wouldn't help. */
const SKIP_BELOW_BYTES = 300 * 1024; // 300KB

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Compresses an image File to a JPEG data URL, resized to at most
 * MAX_DIMENSION on its longest side. Non-image files (PDFs) and files already
 * under SKIP_BELOW_BYTES pass through unchanged as a data URL.
 */
export async function compressImageToDataUrl(file: File): Promise<string> {
  const isImage = file.type.startsWith("image/");
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  if (!isImage || file.size <= SKIP_BELOW_BYTES) return original;

  try {
    const img = await loadImage(original);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, w, h);

    const compressed = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    // Fall back to the original if compression somehow produced a larger result
    // (can happen for already-efficient PNGs with large flat-color areas).
    return compressed.length < original.length ? compressed : original;
  } catch {
    return original; // never block an upload on a compression failure
  }
}

/** Same as compressImageToDataUrl, but returns the base64 payload split from its mediaType. */
export async function compressImageToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  const dataUrl = await compressImageToDataUrl(file);
  const [header, data] = dataUrl.split(",");
  const mediaType = /^data:(.*?);base64$/.exec(header)?.[1] || file.type || "image/jpeg";
  return { data, mediaType };
}
