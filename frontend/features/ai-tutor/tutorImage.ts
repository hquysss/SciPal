// A picture for the Professor, made ready in the browser: shrunk and re-encoded as JPEG before it is sent.
// Re-drawing it also drops the EXIF block (where it was taken, which phone), and the original never leaves the device.

type Bilingual = { vi: string; en: string };

export const TUTOR_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
/** Longest side, in pixels: enough to read an exercise, small enough to be cheap to send and to read. */
export const MAX_EDGE = 1280;
/** The server takes up to 1.5 MB; the JPEG is tried at lower qualities until it fits. */
export const MAX_BYTES = 1.5 * 1024 * 1024;
const QUALITIES = [0.8, 0.65, 0.5, 0.35];

/** What goes to the server (`mime`, `data` as base64) and what the screen shows meanwhile (`preview`, an object URL). */
export type TutorImage = { mime: 'image/jpeg'; data: string; preview: string };

export type PrepareResult = { ok: true; image: TutorImage } | { ok: false; error: Bilingual };

const NOT_IMAGE: Bilingual = { vi: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.', en: 'Only PNG, JPG or WEBP pictures.' };
const UNREADABLE: Bilingual = { vi: 'Không đọc được ảnh này. Em thử ảnh khác nhé.', en: 'This picture could not be read. Try another one.' };
const TOO_BIG: Bilingual = { vi: 'Ảnh quá lớn, em thử ảnh nhỏ hơn nhé.', en: 'The picture is too large. Try a smaller one.' };

/** The size that fits `width` × `height` inside `max` on its longer side, keeping the proportions (never enlarging). */
export function fitWithin(width: number, height: number, max: number = MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** The base64 part of a data URL. */
const base64Of = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1);

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareTutorImage(file: File): Promise<PrepareResult> {
  if (!TUTOR_IMAGE_TYPES.includes(file.type)) return { ok: false, error: NOT_IMAGE };
  try {
    const decoded = await decode(file);
    const { width, height } = fitWithin(decoded.width, decoded.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return { ok: false, error: UNREADABLE };
    // A PNG may be transparent; JPEG has no alpha, so it would turn black.
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    context.drawImage(decoded.source, 0, 0, width, height);
    decoded.close();
    for (const quality of QUALITIES) {
      const blob = await toBlob(canvas, quality);
      if (!blob) return { ok: false, error: UNREADABLE };
      if (blob.size <= MAX_BYTES) return { ok: true, image: { mime: 'image/jpeg', data: base64Of(await readAsDataUrl(blob)), preview: URL.createObjectURL(blob) } };
    }
    return { ok: false, error: TOO_BIG };
  } catch {
    return { ok: false, error: UNREADABLE };
  }
}
