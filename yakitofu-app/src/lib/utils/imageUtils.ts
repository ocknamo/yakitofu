// Image utilities

export interface ImageSize {
  width: number;
  height: number;
}

export const RECOMMENDED_SIZE = {
  width: 1024,
  height: 1024,
};

export async function getImageSize(url: string): Promise<ImageSize> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export function isRecommendedSize(size: ImageSize): boolean {
  return size.width === RECOMMENDED_SIZE.width && size.height === RECOMMENDED_SIZE.height;
}

export function formatImageSize(size: ImageSize): string {
  return `${size.width}x${size.height}`;
}
