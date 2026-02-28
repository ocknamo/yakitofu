import { describe, it, expect } from 'vitest';
import { npubToHex, hexToNpub } from './npubConverter';

describe('npubConverter', () => {
  // Test vectors from NIP-19
  const validTestCases = [
    {
      // Real-world example
      npub: 'npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6',
      hex: '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d',
    },
  ];

  describe('npubToHex', () => {
    it('should convert valid npub to hex', () => {
      for (const testCase of validTestCases) {
        expect(npubToHex(testCase.npub)).toBe(testCase.hex);
      }
    });

    it('should throw error for invalid npub format', () => {
      expect(() => npubToHex('invalid')).toThrow('Invalid npub format');
      expect(() => npubToHex('nsec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8a7dp')).toThrow();
      expect(() => npubToHex('')).toThrow();
    });

    it('should throw error for malformed npub', () => {
      expect(() => npubToHex('npub1')).toThrow();
      expect(() => npubToHex('npub1qqq')).toThrow();
    });
  });

  describe('hexToNpub', () => {
    it('should convert valid hex to npub', () => {
      for (const testCase of validTestCases) {
        expect(hexToNpub(testCase.hex)).toBe(testCase.npub);
      }
    });

    it('should handle 64-character hex strings', () => {
      const hex = '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d';
      const result = hexToNpub(hex);
      expect(result).toMatch(/^npub1[a-z0-9]{58}$/);
      expect(result.length).toBe(63);
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity when converting npub -> hex -> npub', () => {
      for (const testCase of validTestCases) {
        const hex = npubToHex(testCase.npub);
        const npub = hexToNpub(hex);
        expect(npub).toBe(testCase.npub);
      }
    });

    it('should maintain data integrity when converting hex -> npub -> hex', () => {
      for (const testCase of validTestCases) {
        const npub = hexToNpub(testCase.hex);
        const hex = npubToHex(npub);
        expect(hex).toBe(testCase.hex);
      }
    });
  });
});
