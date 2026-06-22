export const MAX_IMAGE_CHARS = 1_800_000;
export const MAX_LOGO_DIMENSION = 640;
export const MAX_AVATAR_DIMENSION = 512;

async function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("invalid_image"));
    };
    img.src = url;
  });
}

function drawToCanvas(image: HTMLImageElement, scale: number) {
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(image, 0, 0, width, height);
  }
  return canvas;
}

function encodeCanvas(canvas: HTMLCanvasElement, type: string, quality?: number) {
  try {
    return canvas.toDataURL(type, quality);
  } catch {
    return canvas.toDataURL();
  }
}

export async function compressImageFile(file: File, maxDimension: number, maxChars: number) {
  const image = await loadImage(file);
  let scale = Math.min(1, maxDimension / Math.max(image.width, image.height));

  for (let pass = 0; pass < 4; pass += 1) {
    const canvas = drawToCanvas(image, scale);
    const attempts: Array<{ type: string; quality?: number }> = [
      { type: "image/webp", quality: 0.9 },
      { type: "image/webp", quality: 0.8 },
      { type: "image/webp", quality: 0.7 },
      { type: "image/jpeg", quality: 0.85 },
      { type: "image/jpeg", quality: 0.75 },
      { type: "image/jpeg", quality: 0.65 },
    ];

    for (const attempt of attempts) {
      const dataUrl = encodeCanvas(canvas, attempt.type, attempt.quality);
      if (attempt.type === "image/webp" && !dataUrl.startsWith("data:image/webp")) {
        continue;
      }
      if (dataUrl.length <= maxChars) {
        return dataUrl;
      }
    }

    scale *= 0.85;
  }

  throw new Error("image_too_large");
}
