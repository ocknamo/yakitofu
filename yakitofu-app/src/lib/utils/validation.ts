// Validation utilities

export function isValidBadgeId(id: string): boolean {
  // Badge ID should be alphanumeric with hyphens
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidWebSocketUrl(url: string): boolean {
  return url.startsWith('wss://') || url.startsWith('ws://');
}

export function isValidNpub(npub: string): boolean {
  return npub.startsWith('npub1') && npub.length === 63;
}
