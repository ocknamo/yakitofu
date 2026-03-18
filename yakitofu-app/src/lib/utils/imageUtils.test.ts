import { describe, expect, it } from 'vitest';
import { formatImageSize, type ImageSize, isRecommendedSize, RECOMMENDED_SIZE } from './imageUtils';

describe('imageUtils', () => {
  describe('formatImageSize', () => {
    it('should format image size as "widthxheight"', () => {
      expect(formatImageSize({ width: 1024, height: 1024 })).toBe('1024x1024');
      expect(formatImageSize({ width: 512, height: 512 })).toBe('512x512');
      expect(formatImageSize({ width: 1920, height: 1080 })).toBe('1920x1080');
    });

    it('should handle small sizes', () => {
      expect(formatImageSize({ width: 16, height: 16 })).toBe('16x16');
      expect(formatImageSize({ width: 1, height: 1 })).toBe('1x1');
    });

    it('should handle large sizes', () => {
      expect(formatImageSize({ width: 4096, height: 4096 })).toBe('4096x4096');
      expect(formatImageSize({ width: 10000, height: 5000 })).toBe('10000x5000');
    });

    it('should handle non-square sizes', () => {
      expect(formatImageSize({ width: 800, height: 600 })).toBe('800x600');
      expect(formatImageSize({ width: 1280, height: 720 })).toBe('1280x720');
    });
  });

  describe('isRecommendedSize', () => {
    it('should return true for recommended size (1024x1024)', () => {
      expect(isRecommendedSize({ width: 1024, height: 1024 })).toBe(true);
    });

    it('should return false for non-recommended sizes', () => {
      expect(isRecommendedSize({ width: 512, height: 512 })).toBe(false);
      expect(isRecommendedSize({ width: 1024, height: 512 })).toBe(false);
      expect(isRecommendedSize({ width: 512, height: 1024 })).toBe(false);
      expect(isRecommendedSize({ width: 2048, height: 2048 })).toBe(false);
    });

    it('should work with RECOMMENDED_SIZE constant', () => {
      expect(isRecommendedSize(RECOMMENDED_SIZE)).toBe(true);
      expect(RECOMMENDED_SIZE.width).toBe(1024);
      expect(RECOMMENDED_SIZE.height).toBe(1024);
    });
  });
});
