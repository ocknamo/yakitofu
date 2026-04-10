import type { NostrEvent } from '../../types/nostr';

export interface UserProfile {
  pubkey: string;
  name: string;
  displayName: string;
  picture: string;
  createdAt: number;
}

/**
 * Parse a Nostr kind 0 (metadata) event into a UserProfile object.
 * Falls back to empty strings if parsing fails.
 */
export function parseUserProfile(event: NostrEvent): UserProfile {
  let name = '';
  let displayName = '';
  let picture = '';

  try {
    const content = JSON.parse(event.content);
    if (content && typeof content === 'object') {
      name = typeof content.name === 'string' ? content.name : '';
      displayName =
        typeof content.display_name === 'string'
          ? content.display_name
          : typeof content.displayName === 'string'
            ? content.displayName
            : '';
      picture = typeof content.picture === 'string' ? content.picture : '';
    }
  } catch {
    // Fallback to empty strings if content is not valid JSON
  }

  return {
    pubkey: event.pubkey ?? '',
    name,
    displayName,
    picture,
    createdAt: event.created_at,
  };
}
