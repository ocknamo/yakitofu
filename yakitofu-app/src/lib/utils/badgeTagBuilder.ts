import { formatImageSize, type ImageSize } from './imageUtils';

export interface ThumbnailData {
  url: string;
  size: ImageSize | null;
  defaultSize: string;
}

export interface BadgeFormData {
  badgeId: string;
  badgeName: string;
  description: string;
  imageUrl: string;
  mainImageSize: ImageSize | null;
  thumbnails: ThumbnailData[];
}

/**
 * Build Nostr tags array from badge form data.
 *
 * @param formData - The form data containing badge information
 * @returns Array of Nostr tags
 */
export function buildBadgeTags(formData: BadgeFormData): string[][] {
  const tags: string[][] = [
    ['d', formData.badgeId],
    ['name', formData.badgeName],
    ['description', formData.description],
    [
      'image',
      formData.imageUrl,
      formData.mainImageSize ? formatImageSize(formData.mainImageSize) : '1024x1024',
    ],
  ];

  // Add thumbnail tags for each size
  for (const thumbnail of formData.thumbnails) {
    if (thumbnail.url) {
      const sizeStr = thumbnail.size ? formatImageSize(thumbnail.size) : thumbnail.defaultSize;
      tags.push(['thumb', thumbnail.url, sizeStr]);
    }
  }

  return tags;
}
