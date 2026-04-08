import { fetchBadgeDefinitionSSR } from '$lib/server/nostrFetch';
import type { BadgeDefinition } from '$lib/utils/badgeEventParser';
import { npubToHex } from '$lib/utils/npubConverter';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  // params.id = "npub1xxx:encodedDTag" — same format as old hash URL (without '#/badge/')
  const match = params.id.match(/^(npub1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58}):(.*)$/);

  if (!match) {
    return { badge: null as BadgeDefinition | null, pubkey: '', dTag: '' };
  }

  const npub = match[1];
  const dTag = decodeURIComponent(match[2]);

  let pubkey: string;
  try {
    pubkey = npubToHex(npub);
  } catch {
    return { badge: null as BadgeDefinition | null, pubkey: '', dTag: '' };
  }

  const badge = await fetchBadgeDefinitionSSR(pubkey, dTag);

  return { badge, pubkey, dTag };
};
