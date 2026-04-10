/**
 * Server-side Nostr relay fetch utilities for SSR (Cloudflare Workers compatible).
 * Uses native WebSocket API - no browser-specific APIs (no IndexedDB, no window.nostr).
 */

import type { BadgeDefinition } from '$lib/utils/badgeEventParser';
import { parseBadgeEvent } from '$lib/utils/badgeEventParser';
import type { UserProfile } from '$lib/utils/userProfileParser';
import { parseUserProfile } from '$lib/utils/userProfileParser';
import type { NostrEvent } from '../../types/nostr';

function isValidNostrEvent(obj: unknown): obj is NostrEvent {
  if (!obj || typeof obj !== 'object') return false;
  const e = obj as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.pubkey === 'string' &&
    typeof e.kind === 'number' &&
    typeof e.content === 'string' &&
    Array.isArray(e.tags)
  );
}

// Same defaults as relay.ts
const SSR_RELAYS = [
  'wss://yabu.me',
  'wss://relay.damus.io',
  'wss://r.kojira.io',
  'wss://nostr.bitcoiner.social',
];

interface NostrFilter {
  kinds?: number[];
  authors?: string[];
  '#d'?: string[];
  limit?: number;
}

/**
 * Fetch a single event from one relay via WebSocket.
 * Returns the first EVENT received, or null on EOSE/timeout.
 */
function fetchFromRelay(
  relayUrl: string,
  filter: NostrFilter,
  timeoutMs = 4000
): Promise<NostrEvent | null> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: NostrEvent | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // ignore close errors
      }
      resolve(value);
    };

    const timer = setTimeout(() => settle(null), timeoutMs);

    let ws: WebSocket;
    try {
      ws = new WebSocket(relayUrl);
    } catch {
      settle(null);
      return;
    }

    const subId = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    ws.onopen = () => {
      ws.send(JSON.stringify(['REQ', subId, filter]));
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as unknown[];
        if (!Array.isArray(msg)) return;
        if (msg[0] === 'EVENT' && msg[1] === subId) {
          if (isValidNostrEvent(msg[2])) settle(msg[2]);
        } else if (msg[0] === 'EOSE' && msg[1] === subId) {
          settle(null);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => settle(null);
    ws.onclose = () => settle(null);
  });
}

/**
 * Try all relays in parallel and return the first non-null result.
 */
async function fetchFromRelays(filter: NostrFilter): Promise<NostrEvent | null> {
  const results = await Promise.all(SSR_RELAYS.map((relay) => fetchFromRelay(relay, filter)));
  return results.find((r) => r !== null) ?? null;
}

/**
 * Fetch a badge definition (kind 30009) for SSR OGP generation.
 */
export async function fetchBadgeDefinitionSSR(
  pubkey: string,
  dTag: string
): Promise<BadgeDefinition | null> {
  const event = await fetchFromRelays({
    kinds: [30009],
    authors: [pubkey],
    '#d': [dTag],
    limit: 1,
  });
  if (!event) return null;
  return parseBadgeEvent(event);
}

/**
 * Fetch a user profile (kind 0) for SSR OGP generation.
 */
export async function fetchUserProfileSSR(pubkey: string): Promise<UserProfile | null> {
  const event = await fetchFromRelays({
    kinds: [0],
    authors: [pubkey],
    limit: 1,
  });
  if (!event) return null;
  return parseUserProfile(event);
}
