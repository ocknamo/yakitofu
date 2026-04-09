import { describe, expect, it } from 'vitest';
import { parseUserProfile } from './userProfileParser';

describe('userProfileParser', () => {
  describe('parseUserProfile', () => {
    it('should parse all fields from valid JSON content', () => {
      const event = {
        id: 'event-1',
        kind: 0,
        pubkey: 'abc123',
        created_at: 1700000000,
        tags: [],
        content: JSON.stringify({
          name: 'alice',
          display_name: 'Alice Smith',
          picture: 'https://example.com/alice.png',
        }),
        sig: 'sig-1',
      };

      const result = parseUserProfile(event);

      expect(result).toEqual({
        pubkey: 'abc123',
        name: 'alice',
        displayName: 'Alice Smith',
        picture: 'https://example.com/alice.png',
        createdAt: 1700000000,
      });
    });

    it('should accept displayName key as fallback for display_name', () => {
      const event = {
        id: 'event-2',
        kind: 0,
        pubkey: 'abc123',
        created_at: 1700000000,
        tags: [],
        content: JSON.stringify({
          name: 'bob',
          displayName: 'Bob Jones',
          picture: '',
        }),
        sig: 'sig-2',
      };

      const result = parseUserProfile(event);

      expect(result.displayName).toBe('Bob Jones');
    });

    it('should prefer display_name over displayName', () => {
      const event = {
        id: 'event-3',
        kind: 0,
        pubkey: 'abc123',
        created_at: 1700000000,
        tags: [],
        content: JSON.stringify({
          name: 'carol',
          display_name: 'Carol (NIP-24)',
          displayName: 'Carol (legacy)',
        }),
        sig: 'sig-3',
      };

      const result = parseUserProfile(event);

      expect(result.displayName).toBe('Carol (NIP-24)');
    });

    it('should default string fields to empty string when content is invalid JSON', () => {
      const event = {
        id: 'event-4',
        kind: 0,
        pubkey: 'abc123',
        created_at: 1700000000,
        tags: [],
        content: 'not-valid-json',
        sig: 'sig-4',
      };

      const result = parseUserProfile(event);

      expect(result).toEqual({
        pubkey: 'abc123',
        name: '',
        displayName: '',
        picture: '',
        createdAt: 1700000000,
      });
    });

    it('should default missing content fields to empty string', () => {
      const event = {
        id: 'event-5',
        kind: 0,
        pubkey: 'abc123',
        created_at: 1700000000,
        tags: [],
        content: '{}',
        sig: 'sig-5',
      };

      const result = parseUserProfile(event);

      expect(result.name).toBe('');
      expect(result.displayName).toBe('');
      expect(result.picture).toBe('');
    });
  });
});
