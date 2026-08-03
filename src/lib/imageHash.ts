// Lightweight perceptual signature for near-duplicate photo detection.
// Combines a 64-bit average-hash (structure) with a coarse average color, so
// two photos are treated as the same ONLY when both structure AND color match.
// Photos of the same damage from different angles differ in structure → kept.

export type ImgSig = { hash: string; r: number; g: number; b: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function signature(file: File): Promise<ImgSig> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 8;
    const ctx = c.getContext("2d");
    if (!ctx) return { hash: "", r: 0, g: 0, b: 0 };
    ctx.drawImage(img, 0, 0, 8, 8);
    const { data } = ctx.getImageData(0, 0, 8, 8);
    const gray: number[] = [];
    let sr = 0, sg = 0, sb = 0;
    for (let i = 0; i < 64; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      sr += r; sg += g; sb += b;
      gray.push(0.299 * r + 0.587 * g + 0.114 * b);
    }
    const avg = gray.reduce((a, b) => a + b, 0) / 64;
    const hash = gray.map((v) => (v > avg ? "1" : "0")).join("");
    return { hash, r: sr / 64, g: sg / 64, b: sb / 64 };
  } catch {
    return { hash: "", r: 0, g: 0, b: 0 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function hamming(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

// Duplicate only if structure is near-identical AND average color is close.
export const DUP_HASH_THRESHOLD = 5;   // out of 64 bits
export const DUP_COLOR_THRESHOLD = 40; // sum |ΔR|+|ΔG|+|ΔB|

export function isDuplicate(sig: ImgSig, against: ImgSig[]): boolean {
  if (!sig.hash) return false;
  return against.some(
    (o) =>
      hamming(sig.hash, o.hash) <= DUP_HASH_THRESHOLD &&
      Math.abs(sig.r - o.r) + Math.abs(sig.g - o.g) + Math.abs(sig.b - o.b) <= DUP_COLOR_THRESHOLD,
  );
}
