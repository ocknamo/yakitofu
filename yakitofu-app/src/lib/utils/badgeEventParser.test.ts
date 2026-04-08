import { describe, expect, it } from 'vitest';
import { type BadgeDefinition, parseBadgeEvent } from './badgeEventParser';

describe('badgeEventParser', () => {
  describe('parseBadgeEvent', () => {
    it('should parse a basic badge event without thumbnails', () => {
      const event = {
        id: 'event-123',
        kind: 30009,
        pubkey: 'pubkey-123',
        created_at: 1234567890,
        tags: [
          ['d', 'test-badge'],
          ['name', 'Test Badge'],
          ['description', 'This is a test badge'],
          ['image', 'https://example.com/badge.png'],
        ],
        content: '',
        sig: 'sig-123',
      };

      const result = parseBadgeEvent(event);

      expect(result).toEqual({
        id: 'event-123',
        name: 'Test Badge',
        description: 'This is a test badge',
        imageUrl: 'https://example.com/badge.png',
        thumbnails: {},
        dTag: 'test-badge',
        createdAt: 1234567890,
      });
    });

    it('should use dTag as name when name tag is missing', () => {
      const event = {
        id: 'event-123',
        kind: 30009,
        pubkey: 'pubkey-123',
        created_at: 1234567890,
        tags: [
          ['d', 'test-badge'],
          ['description', 'Test description'],
          ['image', 'https://example.com/badge.png'],
        ],
        content: '',
        sig: 'sig-123',
      };

      const result = parseBadgeEvent(event);

      expect(result.name).toBe('test-badge');
    });

    it('should parse thumbnails and sort by size (largest first)', () => {
      const event = {
        id: 'event-123',
        kind: 30009,
        pubkey: 'pubkey-123',
        created_at: 1234567890,
        tags: [
          ['d', 'test-badge'],
          ['name', 'Test Badge'],
          ['description', 'Test description'],
          ['image', 'https://example.com/badge.png'],
          ['thumb', 'https://example.com/thumb-16.png', '16x16'],
          ['thumb', 'https://example.com/thumb-512.png', '512x512'],
          ['thumb', 'https://example.com/thumb-256.png', '256x256'],
          ['thumb', 'https://example.com/thumb-64.png', '64x64'],
          ['thumb', 'https://example.com/thumb-32.png', '32x32'],
        ],
        content: '',
        sig: 'sig-123',
      };

      const result = parseBadgeEvent(event);

      expect(result.thumbnails).toEqual({
        xl: 'https://example.com/thumb-512.png',
        l: 'https://example.com/thumb-256.png',
        m: 'https://example.com/thumb-64.png',
        s: 'https://example.com/thumb-32.png',
        xs: 'https://example.com/thumb-16.png',
      });
    });

    it('should handle fewer than 5 thumbnails', () => {
      const event = {
        id: 'event-123',
        kind: 30009,
        pubkey: 'pubkey-123',
        created_at: 1234567890,
        tags: [
          ['d', 'test-badge'],
          ['name', 'Test Badge'],
          ['description', 'Test description'],
          ['image', 'https://example.com/badge.png'],
          ['thumb', 'https://example.com/thumb-256.png', '256x256'],
          ['thumb', 'https://example.com/thumb-64.png', '64x64'],
        ],
        content: '',
        sig: 'sig-123',
      };

      const result = parseBadgeEvent(event);

      expect(result.thumbnails).toEqual({
        xl: 'https://example.com/thumb-256.png',
        l: 'https://example.com/thumb-64.png',
      });
    });

    it('should handle thumbnails without size information', () => {
      const event = {
        id: 'event-123',
        kind: 30009,
        pubkey: 'pubkey-123',
        created_at: 1234567890,
        tags: [
          ['d', 'test-badge'],
          ['name', 'Test Badge'],
          ['description', 'Test description'],
          ['image', 'https://example.com/badge.png'],
          ['thumb', 'https://example.com/thumb-1.png'],
          ['thumb', 'https://example.com/thumb-2.png'],
        ],
        content: '',
        sig: 'sig-123',
      };

      const result = parseBadgeEvent(event);

      // Without size info, order is preserved
      expect(result.thumbnails).toEqual({
        xl: 'https://example.com/thumb-1.png',
        l: 'https://example.com/thumb-2.png',
      });
    });

    it('should handle missing optional tags with defaults', () => {
      const event = {
        id: 'event-123',
        kind: 30009,
        pubkey: 'pubkey-123',
        created_at: 1234567890,
        tags: [['d', 'test-badge']],
        content: '',
        sig: 'sig-123',
      };

      const result = parseBadgeEvent(event);

      expect(result).toEqual({
        id: 'event-123',
        name: 'test-badge', // Falls back to dTag
        description: '',
        imageUrl: '',
        thumbnails: {},
        dTag: 'test-badge',
        createdAt: 1234567890,
      });
    });
  });
});
