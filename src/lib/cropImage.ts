export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err instanceof Error ? err : new Error("Image failed to load")));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

/**
 * Draws the selected crop region of an image onto a fixed-size square
 * canvas and returns it as a JPEG Blob — used to turn whatever aspect
 * ratio a user uploads into a clean, consistently-sized square avatar.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  cropArea: CropArea,
  outputSize = 320,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to process image"))),
      "image/jpeg",
      0.92,
    );
  });
}
