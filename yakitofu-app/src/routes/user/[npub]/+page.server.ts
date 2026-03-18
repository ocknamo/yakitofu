import { fetchUserProfileSSR } from '$lib/server/nostrFetch';
import { npubToHex } from '$lib/utils/npubConverter';
import type { UserProfile } from '$lib/utils/userProfileParser';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  let pubkey: string;
  try {
    pubkey = npubToHex(params.npub);
  } catch {
    return { profile: null as UserProfile | null, pubkey: '', npub: params.npub };
  }

  const profile = await fetchUserProfileSSR(pubkey);

  return { profile, pubkey, npub: params.npub };
};
