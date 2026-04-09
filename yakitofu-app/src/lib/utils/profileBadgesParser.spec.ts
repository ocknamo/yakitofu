import { describe, expect, it } from 'vitest';
import { type ProfileBadgeEntry, parseProfileBadgesEvent } from './profileBadgesParser';

const baseEvent = {
  id: 'event-id',
  pubkey: 'bob',
  created_at: 1000000,
  kind: 10008,
  content: '',
  sig: 'sig',
};

describe('parseProfileBadgesEvent', () => {
  it('returns empty array for event with no tags', () => {
    const event = { ...baseEvent, tags: [] };
    expect(parseProfileBadgesEvent(event)).toEqual([]);
  });

  it('returns empty array when only d tag present (legacy format prefix)', () => {
    const event = { ...baseEvent, kind: 30008, tags: [['d', 'profile_badges']] };
    expect(parseProfileBadgesEvent(event)).toEqual([]);
  });

  it('extracts a single a/e pair', () => {
    const event = {
      ...baseEvent,
      tags: [
        ['a', '30009:alice:bravery'],
        ['e', 'award-event-id-1'],
      ],
    };
    const result = parseProfileBadgesEvent(event);
    expect(result).toEqual<ProfileBadgeEntry[]>([
      { aTag: '30009:alice:bravery', eTag: 'award-event-id-1' },
    ]);
  });

  it('extracts multiple consecutive a/e pairs in order', () => {
    const event = {
      ...baseEvent,
      tags: [
        ['a', '30009:alice:bravery'],
        ['e', 'award-id-1', 'wss://relay.example.com'],
        ['a', '30009:alice:honor'],
        ['e', 'award-id-2'],
      ],
    };
    const result = parseProfileBadgesEvent(event);
    expect(result).toEqual<ProfileBadgeEntry[]>([
      { aTag: '30009:alice:bravery', eTag: 'award-id-1', relayHint: 'wss://relay.example.com' },
      { aTag: '30009:alice:honor', eTag: 'award-id-2' },
    ]);
  });

  it('includes relayHint from e tag when present', () => {
    const event = {
      ...baseEvent,
      tags: [
        ['a', '30009:alice:bravery'],
        ['e', 'award-id-1', 'wss://nostr.academy'],
      ],
    };
    const result = parseProfileBadgesEvent(event);
    expect(result[0].relayHint).toBe('wss://nostr.academy');
  });

  it('skips lone a tag without following e tag', () => {
    const event = {
      ...baseEvent,
      tags: [
        ['a', '30009:alice:bravery'],
        // no e tag follows
      ],
    };
    expect(parseProfileBadgesEvent(event)).toEqual([]);
  });

  it('skips a tag followed by another a tag (no e)', () => {
    const event = {
      ...baseEvent,
      tags: [
        ['a', '30009:alice:bravery'],
        ['a', '30009:alice:honor'],
        ['e', 'award-id-2'],
      ],
    };
    // First a has no e after it, second a/e pair should be extracted
    const result = parseProfileBadgesEvent(event);
    expect(result).toEqual<ProfileBadgeEntry[]>([
      { aTag: '30009:alice:honor', eTag: 'award-id-2' },
    ]);
  });

  it('skips a tags that do not reference kind 30009', () => {
    const event = {
      ...baseEvent,
      tags: [
        ['a', '30001:alice:something'],
        ['e', 'award-id-1'],
        ['a', '30009:alice:bravery'],
        ['e', 'award-id-2'],
      ],
    };
    const result = parseProfileBadgesEvent(event);
    expect(result).toEqual<ProfileBadgeEntry[]>([
      { aTag: '30009:alice:bravery', eTag: 'award-id-2' },
    ]);
  });

  it('works for legacy kind 30008 format with leading d=profile_badges tag', () => {
    const event = {
      ...baseEvent,
      kind: 30008,
      tags: [
        ['d', 'profile_badges'],
        ['a', '30009:alice:bravery'],
        ['e', 'award-id-1'],
        ['a', '30009:alice:honor'],
        ['e', 'award-id-2'],
      ],
    };
    const result = parseProfileBadgesEvent(event);
    expect(result).toEqual<ProfileBadgeEntry[]>([
      { aTag: '30009:alice:bravery', eTag: 'award-id-1' },
      { aTag: '30009:alice:honor', eTag: 'award-id-2' },
    ]);
  });
});
