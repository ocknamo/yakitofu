import type { NostrEvent } from '../../types/nostr';

export interface ProfileBadgeEntry {
  aTag: string; // "30009:issuerPubkey:dTag"
  eTag: string; // kind 8 award event ID
  relayHint?: string;
}

/**
 * Parse a Profile Badges event (kind 10008, or legacy kind 30008 with d=profile_badges)
 * into an ordered list of badge entries.
 *
 * Per NIP-58: clients SHOULD ignore `a` without corresponding `e` tag and vice versa.
 * Tags are expected in consecutive pairs: a, e, a, e, ...
 */
export function parseProfileBadgesEvent(event: NostrEvent): ProfileBadgeEntry[] {
  const entries: ProfileBadgeEntry[] = [];
  const tags = event.tags;

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    if (tag[0] !== 'a') continue;

    const nextTag = tags[i + 1];
    if (!nextTag || nextTag[0] !== 'e') continue;

    const aTag = tag[1];
    const eTag = nextTag[1];

    // Only include valid a-tags that reference kind 30009
    if (!aTag || !aTag.startsWith('30009:')) continue;
    if (!eTag) continue;

    entries.push({
      aTag,
      eTag,
      relayHint: nextTag[2] || undefined,
    });

    i++; // skip the e tag we just consumed
  }

  return entries;
}
