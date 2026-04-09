import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NostrEvent } from '../../types/nostr';
import type { BadgeDefinitionWithPubkey } from './badgeDefinitionResolver';

// vi.mock() is hoisted — mocks are applied before imports resolve
vi.mock('./nostr', () => ({
  getProfileBadges: vi.fn(),
  waitForConnection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./badgeDefinitionResolver', () => ({
  resolveBadgeDefinition: vi.fn(),
}));

import { resolveBadgeDefinition } from './badgeDefinitionResolver';
import { getProfileBadges } from './nostr';
import { invalidateProfileBadgesCache, resolveProfileBadges } from './profileBadgesResolver';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PUBKEY = 'test-pubkey-aaa';
const ISSUER = 'issuer-pubkey-bbb';
const DTAG = 'awesome-badge';

const mockBadgeDef: BadgeDefinitionWithPubkey = {
  pubkey: ISSUER,
  id: 'badge-event-id',
  dTag: DTAG,
  name: 'Awesome Badge',
  description: 'A test badge',
  imageUrl: 'https://example.com/badge.png',
  thumbnails: {},
  createdAt: 1_000_000,
};

function makeEvent(kind: number, createdAt: number, tags: string[][], pubkey = PUBKEY): NostrEvent {
  return {
    id: `ev-${kind}-${createdAt}`,
    pubkey,
    kind,
    created_at: createdAt,
    tags,
    content: '',
    sig: 'sig',
  };
}

type Packet = { event: NostrEvent; from: string };

/**
 * Resolves profile badges for PUBKEY using a controlled relay Subject.
 * Events are emitted *after* subscription so the `relaySubscription` const
 * is fully initialised before `complete()` is called (avoids TDZ error).
 */
async function resolveWith(
  events: NostrEvent[],
  pubkey = PUBKEY
): Promise<(BadgeDefinitionWithPubkey[] | null)[]> {
  const relay$ = new Subject<Packet>();

  vi.mocked(getProfileBadges).mockReturnValue({
    observable: relay$.asObservable() as any,
    req: { emit: vi.fn(), over: vi.fn() } as any,
    filters: [],
  });

  const values: (BadgeDefinitionWithPubkey[] | null)[] = [];
  const done = new Promise<void>((resolve, reject) => {
    resolveProfileBadges(pubkey).subscribe({
      next: (v) => values.push(v),
      error: reject,
      complete: () => resolve(),
    });
  });

  // Emit events AFTER subscription — avoids TDZ on relaySubscription const
  for (const event of events) {
    relay$.next({ event, from: 'wss://relay.test' });
  }
  relay$.complete(); // triggers EOSE handling

  await done;
  return values;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveProfileBadges', () => {
  beforeEach(() => {
    invalidateProfileBadgesCache(PUBKEY);
    vi.mocked(resolveBadgeDefinition).mockReturnValue(of(mockBadgeDef) as any);
  });

  // -------------------------------------------------------------------------
  // Event selection: kind 10008 vs. kind 30008 (the tombstone bug)
  // -------------------------------------------------------------------------

  describe('event selection strategy', () => {
    it('prefers kind 10008 over kind 30008 tombstone even when tombstone has a later created_at', async () => {
      // Root cause of the "always empty" bug:
      // ProfileBadgesManager published kind 10008 (T=1000) then, after await,
      // published tombstone kind 30008 (T=1001).  Old code picked the tombstone.
      const kind10008 = makeEvent(10008, 1000, [
        ['a', `30009:${ISSUER}:${DTAG}`],
        ['e', 'award-id-1'],
      ]);
      const tombstone30008 = makeEvent(30008, 1001, [['d', 'profile_badges']]);

      const values = await resolveWith([kind10008, tombstone30008]);

      // Must return badges from kind 10008, NOT an empty array from the tombstone
      const last = values[values.length - 1] as BadgeDefinitionWithPubkey[];
      expect(last).not.toBeNull();
      expect(last).toHaveLength(1);
      expect(last[0].dTag).toBe(DTAG);
    });

    it('prefers kind 10008 over kind 30008 when kind 10008 has a later created_at (normal case)', async () => {
      const kind10008 = makeEvent(10008, 1002, [
        ['a', `30009:${ISSUER}:${DTAG}`],
        ['e', 'award-id-1'],
      ]);
      const legacyKind30008 = makeEvent(30008, 999, [
        ['d', 'profile_badges'],
        ['a', `30009:${ISSUER}:other-badge`],
        ['e', 'award-id-old'],
      ]);

      const values = await resolveWith([kind10008, legacyKind30008]);

      const last = values[values.length - 1] as BadgeDefinitionWithPubkey[];
      expect(last).toHaveLength(1);
      expect(last[0].dTag).toBe(DTAG);
    });

    it('falls back to kind 30008 when no kind 10008 event exists (backward compat)', async () => {
      const legacyKind30008 = makeEvent(30008, 1000, [
        ['d', 'profile_badges'],
        ['a', `30009:${ISSUER}:${DTAG}`],
        ['e', 'award-id-1'],
      ]);

      const values = await resolveWith([legacyKind30008]);

      const last = values[values.length - 1] as BadgeDefinitionWithPubkey[];
      expect(last).toHaveLength(1);
      expect(last[0].dTag).toBe(DTAG);
    });

    it('returns null when no profile badges event exists for the pubkey', async () => {
      const values = await resolveWith([]);

      expect(values[values.length - 1]).toBeNull();
    });

    it('ignores events from other pubkeys', async () => {
      const foreignEvent = makeEvent(
        10008,
        1000,
        [
          ['a', `30009:${ISSUER}:${DTAG}`],
          ['e', 'award-id-1'],
        ],
        'other-pubkey-zzz'
      );

      const values = await resolveWith([foreignEvent]);

      expect(values[values.length - 1]).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Badge definition resolution
  // -------------------------------------------------------------------------

  describe('badge definition resolution', () => {
    it('resolves badge definitions in order and returns them', async () => {
      const badgeDef2: BadgeDefinitionWithPubkey = {
        ...mockBadgeDef,
        dTag: 'second-badge',
        name: 'Second',
      };
      const event = makeEvent(10008, 1000, [
        ['a', `30009:${ISSUER}:${DTAG}`],
        ['e', 'award-id-1'],
        ['a', `30009:${ISSUER}:second-badge`],
        ['e', 'award-id-2'],
      ]);

      vi.mocked(resolveBadgeDefinition)
        .mockReturnValueOnce(of(mockBadgeDef) as any)
        .mockReturnValueOnce(of(badgeDef2) as any);

      const values = await resolveWith([event]);

      const last = values[values.length - 1] as BadgeDefinitionWithPubkey[];
      expect(last).toHaveLength(2);
      expect(last[0].dTag).toBe(DTAG);
      expect(last[1].dTag).toBe('second-badge');
    });

    it('returns empty array when kind 10008 has no valid a/e pairs (empty tombstone)', async () => {
      const emptyEvent = makeEvent(10008, 1000, []);

      const values = await resolveWith([emptyEvent]);

      expect(values[values.length - 1]).toEqual([]);
    });

    it('filters out badge definitions that could not be resolved', async () => {
      const event = makeEvent(10008, 1000, [
        ['a', `30009:${ISSUER}:${DTAG}`],
        ['e', 'award-id-1'],
        ['a', `30009:${ISSUER}:missing-badge`],
        ['e', 'award-id-2'],
      ]);

      vi.mocked(resolveBadgeDefinition)
        .mockReturnValueOnce(of(mockBadgeDef) as any)
        .mockReturnValueOnce(of(null) as any); // not found

      const values = await resolveWith([event]);

      const last = values[values.length - 1] as BadgeDefinitionWithPubkey[];
      expect(last).toHaveLength(1);
      expect(last[0].dTag).toBe(DTAG);
    });
  });

  // -------------------------------------------------------------------------
  // In-memory cache
  // -------------------------------------------------------------------------

  describe('in-memory cache', () => {
    it('serves a second call from cache without hitting the relay again', async () => {
      const event = makeEvent(10008, 1000, [
        ['a', `30009:${ISSUER}:${DTAG}`],
        ['e', 'award-id-1'],
      ]);

      // First call — populates cache
      await resolveWith([event]);
      const relayCallsAfterFirst = vi.mocked(getProfileBadges).mock.calls.length;

      // Second call — should use cache, not the relay
      const cached = await resolveWith([event]);

      expect(vi.mocked(getProfileBadges).mock.calls.length).toBe(relayCallsAfterFirst);

      const last = cached[cached.length - 1] as BadgeDefinitionWithPubkey[];
      expect(last).toHaveLength(1);
      expect(last[0].dTag).toBe(DTAG);
    });
  });
});
