// Validation utilities

export function isValidBadgeId(id: string): boolean {
  // Badge ID accepts any non-whitespace Unicode characters including emoji
  // Also allows empty string
  return id === '' || /^\S+$/u.test(id);
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidWebSocketUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'wss:' || parsed.protocol === 'ws:') && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

export function isValidNpub(npub: string): boolean {
  return npub.startsWith('npub1') && npub.length === 63;
}
