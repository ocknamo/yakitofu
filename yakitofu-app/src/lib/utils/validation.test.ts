import { describe, it, expect } from 'vitest';
import { isValidBadgeId, isValidUrl, isValidWebSocketUrl, isValidNpub } from './validation';

describe('validation', () => {
  describe('isValidBadgeId', () => {
    it('should accept valid badge IDs with letters, numbers, hyphens, and underscores', () => {
      expect(isValidBadgeId('my-badge')).toBe(true);
      expect(isValidBadgeId('badge123')).toBe(true);
      expect(isValidBadgeId('test-badge-2024')).toBe(true);
      expect(isValidBadgeId('a')).toBe(true);
      expect(isValidBadgeId('123')).toBe(true);
      expect(isValidBadgeId('MyBadge')).toBe(true);
      expect(isValidBadgeId('TEST')).toBe(true);
      expect(isValidBadgeId('Neiger-Emblem')).toBe(true);
      expect(isValidBadgeId('badge_id')).toBe(true);
    });

    it('should accept badge IDs with most special characters', () => {
      expect(isValidBadgeId('badge!id')).toBe(true);
      expect(isValidBadgeId('badge$id')).toBe(true);
      expect(isValidBadgeId('badge&id')).toBe(true);
      expect(isValidBadgeId("badge'id")).toBe(true);
      expect(isValidBadgeId('badge(id)')).toBe(true);
      expect(isValidBadgeId('badge*id')).toBe(true);
      expect(isValidBadgeId('badge+id')).toBe(true);
      expect(isValidBadgeId('badge,id')).toBe(true);
      expect(isValidBadgeId('badge;id')).toBe(true);
      expect(isValidBadgeId('badge=id')).toBe(true);
      expect(isValidBadgeId('badge%id')).toBe(true);
      expect(isValidBadgeId('badge.id')).toBe(true);
      expect(isValidBadgeId('badge~id')).toBe(true);
      expect(isValidBadgeId('badge_id')).toBe(true);
    });

    it('should reject badge IDs with URL delimiters', () => {
      expect(isValidBadgeId('badge/id')).toBe(false); // Slash
      expect(isValidBadgeId('badge?id')).toBe(false); // Question mark
      expect(isValidBadgeId('badge:id')).toBe(false); // Colon
      expect(isValidBadgeId('badge#id')).toBe(false); // Hash
      expect(isValidBadgeId('badge@id')).toBe(false); // At sign
    });

    it('should reject badge IDs with spaces', () => {
      expect(isValidBadgeId('badge id')).toBe(false);
      expect(isValidBadgeId(' badge')).toBe(false);
      expect(isValidBadgeId('badge ')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidBadgeId('')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should accept valid HTTP and HTTPS URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path/to/image.png')).toBe(true);
      expect(isValidUrl('https://example.com:8080')).toBe(true);
    });

    it('should accept other valid URL protocols', () => {
      expect(isValidUrl('ftp://example.com')).toBe(true);
      expect(isValidUrl('file:///path/to/file')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('http://')).toBe(false);
    });
  });

  describe('isValidWebSocketUrl', () => {
    it('should accept valid WebSocket URLs', () => {
      expect(isValidWebSocketUrl('wss://relay.example.com')).toBe(true);
      expect(isValidWebSocketUrl('ws://localhost:8080')).toBe(true);
      expect(isValidWebSocketUrl('wss://relay.nostr.band')).toBe(true);
    });

    it('should reject non-WebSocket URLs', () => {
      expect(isValidWebSocketUrl('https://example.com')).toBe(false);
      expect(isValidWebSocketUrl('http://example.com')).toBe(false);
      expect(isValidWebSocketUrl('ftp://example.com')).toBe(false);
      expect(isValidWebSocketUrl('example.com')).toBe(false);
      expect(isValidWebSocketUrl('')).toBe(false);
    });
  });

  describe('isValidNpub', () => {
    it('should accept valid npub format', () => {
      // Valid npub format: starts with 'npub1' and has exactly 63 characters
      // Real-world example from NIP-19
      expect(isValidNpub('npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6')).toBe(true);
    });

    it('should reject npub with incorrect prefix', () => {
      expect(isValidNpub('nsec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8a7dp')).toBe(false);
      expect(isValidNpub('npub2qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8a7dp')).toBe(false);
      expect(isValidNpub('npubqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8a7dp')).toBe(false);
    });

    it('should reject npub with incorrect length', () => {
      expect(isValidNpub('npub1')).toBe(false);
      expect(isValidNpub('npub1qqq')).toBe(false);
      expect(isValidNpub('npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6x')).toBe(false); // 64 chars
      expect(isValidNpub('npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w')).toBe(false); // 62 chars
    });

    it('should reject empty or invalid strings', () => {
      expect(isValidNpub('')).toBe(false);
      expect(isValidNpub('not-a-npub')).toBe(false);
    });
  });
});
