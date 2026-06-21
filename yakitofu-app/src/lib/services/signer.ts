import { get } from 'svelte/store';
import type { NostrEvent } from '../../types/nostr';
import { authStore } from '../stores/auth';
import { getNosskeyClient } from './nosskey';

/**
 * Minimal signing surface shared by NIP-07 (`window.nostr`) and the Nosskey
 * iframe client. Both expose the same NIP-07 compatible methods.
 */
export interface Signer {
  getPublicKey(): Promise<string>;
  signEvent(event: NostrEvent): Promise<NostrEvent>;
}

/**
 * Resolve the active signer based on the login method recorded in the auth
 * store. NIP-07 returns `window.nostr`; Nosskey returns the iframe client.
 */
export async function getActiveSigner(): Promise<Signer> {
  const { method } = get(authStore);

  if (method === 'nosskey') {
    const client = await getNosskeyClient();
    return {
      getPublicKey: () => client.getPublicKey(),
      // The iframe always returns a fully-signed event; narrow to the app's
      // stricter NostrEvent type (created_at / tags are guaranteed present).
      signEvent: (event) => client.signEvent(event) as Promise<NostrEvent>,
    };
  }

  // Default to NIP-07.
  if (!window.nostr) {
    throw new Error('Nostr extension not found');
  }
  return window.nostr;
}

/** Sign an event with the active signer. */
export async function signEvent(event: NostrEvent): Promise<NostrEvent> {
  const signer = await getActiveSigner();
  return signer.signEvent(event);
}
