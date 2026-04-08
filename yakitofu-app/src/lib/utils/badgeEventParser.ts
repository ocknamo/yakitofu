import type { NostrEvent } from '../../types/nostr';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  thumbnails: {
    xl?: string;
    l?: string;
    m?: string;
    s?: string;
    xs?: string;
  };
  dTag: string;
  createdAt: number;
}

/**
 * Parse a Nostr badge definition event (kind 30009) into a BadgeDefinition object.
 *
 * @param event - The Nostr event to parse
 * @returns BadgeDefinition object
 */
export function parseBadgeEvent(event: NostrEvent): BadgeDefinition {
  const dTag = event.tags.find((t: string[]) => t[0] === 'd')?.[1] || '';
  const name = event.tags.find((t: string[]) => t[0] === 'name')?.[1] || dTag;
  const description = event.tags.find((t: string[]) => t[0] === 'description')?.[1] || '';
  const imageTag = event.tags.find((t: string[]) => t[0] === 'image');
  const imageUrl = imageTag?.[1] || '';

  // Load all thumbnail tags and sort by size (largest first)
  const thumbnailTags = event.tags.filter((t: string[]) => t[0] === 'thumb');
  const thumbnails: BadgeDefinition['thumbnails'] = {};

  // Parse sizes and sort thumbnails by area (width * height)
  const thumbsWithSize = thumbnailTags.map((tag: string[]) => {
    const url = tag[1];
    const sizeStr = tag[2];
    let area = 0;

    if (sizeStr) {
      const match = sizeStr.match(/^(\d+)x(\d+)$/);
      if (match) {
        const width = Number.parseInt(match[1]);
        const height = Number.parseInt(match[2]);
        area = width * height;
      }
    }

    return { url, area };
  });

  // Sort by area (largest first)
  thumbsWithSize.sort(
    (a: { url: string; area: number }, b: { url: string; area: number }) => b.area - a.area
  );

  // Assign to xl, l, m, s, xs in order
  const sizeKeys: Array<keyof BadgeDefinition['thumbnails']> = ['xl', 'l', 'm', 's', 'xs'];
  for (let i = 0; i < Math.min(thumbsWithSize.length, sizeKeys.length); i++) {
    thumbnails[sizeKeys[i]] = thumbsWithSize[i].url;
  }

  return {
    id: event.id || '',
    name,
    description,
    imageUrl,
    thumbnails,
    dTag,
    createdAt: event.created_at,
  };
}
