import type { BadgeDefinition } from '../utils/badgeEventParser';
import type { UserProfile } from '../utils/userProfileParser';

const DB_NAME = 'yakitofu-cache';
const DB_VERSION = 1;
const MAX_ENTRIES = 100;

interface CachedProfile extends UserProfile {
  cachedAt: number;
}

interface CachedBadgeDefinition extends BadgeDefinition {
  key: string;
  pubkey: string;
  cachedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openCacheDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('profiles')) {
        const profileStore = db.createObjectStore('profiles', { keyPath: 'pubkey' });
        profileStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('badgeDefinitions')) {
        const badgeStore = db.createObjectStore('badgeDefinitions', { keyPath: 'key' });
        badgeStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });

  return dbPromise;
}

async function evictOldestIfNeeded(
  tx: IDBTransaction,
  storeName: string,
): Promise<void> {
  const store = tx.objectStore(storeName);

  const count = await new Promise<number>((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (count < MAX_ENTRIES) return;

  const index = store.index('cachedAt');
  const cursor = await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
    const req = index.openCursor(null, 'next');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (cursor) {
    await new Promise<void>((resolve, reject) => {
      const req = cursor.delete();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export async function getCachedProfile(pubkey: string): Promise<UserProfile | null> {
  const db = await openCacheDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('profiles', 'readonly');
    const req = tx.objectStore('profiles').get(pubkey);
    req.onsuccess = () => {
      const result = req.result as CachedProfile | undefined;
      if (!result) {
        resolve(null);
        return;
      }
      const { cachedAt: _cachedAt, ...profile } = result;
      resolve(profile as UserProfile);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setCachedProfile(profile: UserProfile): Promise<void> {
  const db = await openCacheDB();

  const tx = db.transaction('profiles', 'readwrite');
  await evictOldestIfNeeded(tx, 'profiles');

  const entry: CachedProfile = { ...profile, cachedAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const req = tx.objectStore('profiles').put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedProfiles(pubkeys: string[]): Promise<Map<string, UserProfile>> {
  if (pubkeys.length === 0) return new Map();

  const db = await openCacheDB();
  const result = new Map<string, UserProfile>();

  await Promise.all(
    pubkeys.map(
      (pubkey) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction('profiles', 'readonly');
          const req = tx.objectStore('profiles').get(pubkey);
          req.onsuccess = () => {
            const cached = req.result as CachedProfile | undefined;
            if (cached) {
              const { cachedAt: _cachedAt, ...profile } = cached;
              result.set(pubkey, profile as UserProfile);
            }
            resolve();
          };
          req.onerror = () => reject(req.error);
        }),
    ),
  );

  return result;
}

export async function getCachedBadgeDefinition(
  pubkey: string,
  dTag: string,
): Promise<BadgeDefinition | null> {
  const db = await openCacheDB();
  const key = `${pubkey}:${dTag}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction('badgeDefinitions', 'readonly');
    const req = tx.objectStore('badgeDefinitions').get(key);
    req.onsuccess = () => {
      const result = req.result as CachedBadgeDefinition | undefined;
      if (!result) {
        resolve(null);
        return;
      }
      const { key: _key, pubkey: _pubkey, cachedAt: _cachedAt, ...badge } = result;
      resolve(badge as BadgeDefinition);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setCachedBadgeDefinition(
  pubkey: string,
  badge: BadgeDefinition,
): Promise<void> {
  const db = await openCacheDB();
  const key = `${pubkey}:${badge.dTag}`;

  const tx = db.transaction('badgeDefinitions', 'readwrite');

  // 同一 key の上書きは件数増加なし → 既存エントリをチェック
  const existing = await new Promise<boolean>((resolve, reject) => {
    const req = tx.objectStore('badgeDefinitions').count(key);
    req.onsuccess = () => resolve(req.result > 0);
    req.onerror = () => reject(req.error);
  });

  if (!existing) {
    await evictOldestIfNeeded(tx, 'badgeDefinitions');
  }

  const entry: CachedBadgeDefinition = { ...badge, key, pubkey, cachedAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const req = tx.objectStore('badgeDefinitions').put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
