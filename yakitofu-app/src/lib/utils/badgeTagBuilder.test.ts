import { describe, expect, it } from 'vitest';
import { type BadgeFormData, buildBadgeTags } from './badgeTagBuilder';

describe('badgeTagBuilder', () => {
  describe('buildBadgeTags', () => {
    it('should build basic badge tags without thumbnails', () => {
      const formData: BadgeFormData = {
        badgeId: 'test-badge',
        badgeName: 'Test Badge',
        description: 'This is a test badge',
        imageUrl: 'https://example.com/badge.png',
        mainImageSize: { width: 1024, height: 1024 },
        thumbnails: [],
      };

      const tags = buildBadgeTags(formData);

      expect(tags).toEqual([
        ['d', 'test-badge'],
        ['name', 'Test Badge'],
        ['description', 'This is a test badge'],
        ['image', 'https://example.com/badge.png', '1024x1024'],
      ]);
    });

    it('should use default image size when mainImageSize is null', () => {
      const formData: BadgeFormData = {
        badgeId: 'test-badge',
        badgeName: 'Test Badge',
        description: 'Test description',
        imageUrl: 'https://example.com/badge.png',
        mainImageSize: null,
        thumbnails: [],
      };

      const tags = buildBadgeTags(formData);

      expect(tags).toContainEqual(['image', 'https://example.com/badge.png', '1024x1024']);
    });

    it('should build tags with all thumbnails', () => {
      const formData: BadgeFormData = {
        badgeId: 'test-badge',
        badgeName: 'Test Badge',
        description: 'Test description',
        imageUrl: 'https://example.com/badge.png',
        mainImageSize: { width: 1024, height: 1024 },
        thumbnails: [
          {
            url: 'https://example.com/thumb-512.png',
            size: { width: 512, height: 512 },
            defaultSize: '512x512',
          },
          {
            url: 'https://example.com/thumb-256.png',
            size: { width: 256, height: 256 },
            defaultSize: '256x256',
          },
          {
            url: 'https://example.com/thumb-64.png',
            size: { width: 64, height: 64 },
            defaultSize: '64x64',
          },
          {
            url: 'https://example.com/thumb-32.png',
            size: { width: 32, height: 32 },
            defaultSize: '32x32',
          },
          {
            url: 'https://example.com/thumb-16.png',
            size: { width: 16, height: 16 },
            defaultSize: '16x16',
          },
        ],
      };

      const tags = buildBadgeTags(formData);

      expect(tags).toContainEqual(['thumb', 'https://example.com/thumb-512.png', '512x512']);
      expect(tags).toContainEqual(['thumb', 'https://example.com/thumb-256.png', '256x256']);
      expect(tags).toContainEqual(['thumb', 'https://example.com/thumb-64.png', '64x64']);
      expect(tags).toContainEqual(['thumb', 'https://example.com/thumb-32.png', '32x32']);
      expect(tags).toContainEqual(['thumb', 'https://example.com/thumb-16.png', '16x16']);
    });

    it('should skip empty thumbnail URLs', () => {
      const formData: BadgeFormData = {
        badgeId: 'test-badge',
        badgeName: 'Test Badge',
        description: 'Test description',
        imageUrl: 'https://example.com/badge.png',
        mainImageSize: null,
        thumbnails: [
          { url: '', size: null, defaultSize: '512x512' },
          {
            url: 'https://example.com/thumb-256.png',
            size: { width: 256, height: 256 },
            defaultSize: '256x256',
          },
          { url: '', size: null, defaultSize: '64x64' },
        ],
      };

      const tags = buildBadgeTags(formData);

      expect(tags).toContainEqual(['thumb', 'https://example.com/thumb-256.png', '256x256']);
      expect(tags).not.toContainEqual(['thumb', '', '512x512']);
      expect(tags).not.toContainEqual(['thumb', '', '64x64']);
      expect(tags.filter((t) => t[0] === 'thumb')).toHaveLength(1);
    });

    it('should use default size when thumbnail size is null', () => {
      const formData: BadgeFormData = {
        badgeId: 'test-badge',
        badgeName: 'Test Badge',
        description: 'Test description',
        imageUrl: 'https://example.com/badge.png',
        mainImageSize: null,
        thumbnails: [{ url: 'https://example.com/thumb.png', size: null, defaultSize: '256x256' }],
      };

      const tags = buildBadgeTags(formData);

      expect(tags).toContainEqual(['thumb', 'https://example.com/thumb.png', '256x256']);
    });

    it('should handle mixed thumbnail formats', () => {
      const formData: BadgeFormData = {
        badgeId: 'test-badge',
        badgeName: 'Test Badge',
        description: 'Test description',
        imageUrl: 'https://example.com/badge.png',
        mainImageSize: { width: 1024, height: 1024 },
        thumbnails: [
          {
            url: 'https://example.com/thumb-512.png',
            size: { width: 512, height: 512 },
            defaultSize: '512x512',
          },
          { url: 'https://example.com/thumb-unknown.png', size: null, defaultSize: '256x256' },
          { url: '', size: null, defaultSize: '64x64' },
        ],
      };

      const tags = buildBadgeTags(formData);

      expect(tags).toContainEqual(['thumb', 'https://example.com/thumb-512.png', '512x512']);
      expect(tags).toContainEqual(['thumb', 'https://example.com/thumb-unknown.png', '256x256']);
      expect(tags.filter((t) => t[0] === 'thumb')).toHaveLength(2);
    });
  });
});
