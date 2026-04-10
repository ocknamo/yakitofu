import type { BadgeDefinition } from '../utils/badgeEventParser';
import type { UserProfile } from '../utils/userProfileParser';

const DB_NAME = 'yakitofu-cache';
const DB_VERSION = 7;
const MAX_ENTRIES = 100;

interface CachedProfile extends UserProfile {
  cachedAt: number;
}

interface CachedBadgeDefinition extends BadgeDefinition {
  key: string;
  pubkey: string;
  cachedAt: number;
}

interface CachedBadgeAwardees {
  key: string;
  issuerPubkey: string;
  dTag: string;
  awardees: Record<string, number>;
  cachedAt: number;
}

interface CachedReceivedBadgeAwards {
  key: string; // recipientPubkey
  recipientPubkey: string;
  badges: Array<BadgeDefinition & { pubkey: string; awardEventId: string }>;
  cachedAt: number;
}

interface CachedProfileBadges {
  key: string; // pubkey
  pubkey: string;
  /** null = kind 10008 event was fetched but doesn't exist for this user */
  badges: Array<BadgeDefinition & { pubkey: string }> | null;
  cachedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openCacheDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const { oldVersion } = event;

      if (!db.objectStoreNames.contains('profiles')) {
        const profileStore = db.createObjectStore('profiles', { keyPath: 'pubkey' });
        profileStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('badgeDefinitions')) {
        const badgeStore = db.createObjectStore('badgeDefinitions', { keyPath: 'key' });
        badgeStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('badgeAwardees')) {
        const awardeeStore = db.createObjectStore('badgeAwardees', {
          keyPath: 'key',
        });
        awardeeStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      // v4 -> v5 / v5 -> v6: receivedBadgeAwards の格納形式が変わるため再作成する
      if (oldVersion < 6 && db.objectStoreNames.contains('receivedBadgeAwards')) {
        db.deleteObjectStore('receivedBadgeAwards');
      }

      if (!db.objectStoreNames.contains('receivedBadgeAwards')) {
        const receivedStore = db.createObjectStore('receivedBadgeAwards', { keyPath: 'key' });
        receivedStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('profileBadges')) {
        const profileBadgesStore = db.createObjectStore('profileBadges', { keyPath: 'key' });
        profileBadgesStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });

  return dbPromise;
}

async function evictOldestIfNeeded(tx: IDBTransaction, storeName: string): Promise<void> {
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
  const store = tx.objectStore('profiles');

  // 既存キャッシュのタイムスタンプを確認し、古いイベントでは上書きしない
  const existing = await new Promise<CachedProfile | undefined>((resolve, reject) => {
    const req = store.get(profile.pubkey);
    req.onsuccess = () => resolve(req.result as CachedProfile | undefined);
    req.onerror = () => reject(req.error);
  });

  if (existing && existing.createdAt && existing.createdAt >= profile.createdAt) {
    return;
  }

  if (!existing) {
    await evictOldestIfNeeded(tx, 'profiles');
  }

  const entry: CachedProfile = { ...profile, cachedAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedProfiles(
  pubkeys: string[]
): Promise<Map<string, { profile: UserProfile; cachedAt: number }>> {
  if (pubkeys.length === 0) return new Map();

  const db = await openCacheDB();
  const result = new Map<string, { profile: UserProfile; cachedAt: number }>();

  await Promise.all(
    pubkeys.map(
      (pubkey) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction('profiles', 'readonly');
          const req = tx.objectStore('profiles').get(pubkey);
          req.onsuccess = () => {
            const cached = req.result as CachedProfile | undefined;
            if (cached) {
              const { cachedAt, ...profile } = cached;
              result.set(pubkey, { profile: profile as UserProfile, cachedAt });
            }
            resolve();
          };
          req.onerror = () => reject(req.error);
        })
    )
  );

  return result;
}

export async function getCachedBadgeDefinition(
  pubkey: string,
  dTag: string
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

export async function getCachedBadgeDefinitionsByPubkey(
  pubkey: string
): Promise<Map<string, BadgeDefinition>> {
  const db = await openCacheDB();
  const result = new Map<string, BadgeDefinition>();
  const prefix = `${pubkey}:`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction('badgeDefinitions', 'readonly');
    const store = tx.objectStore('badgeDefinitions');
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(result);
        return;
      }
      const entry = cursor.value as CachedBadgeDefinition;
      if (entry.key.startsWith(prefix)) {
        const { key: _key, pubkey: _pubkey, cachedAt: _cachedAt, ...badge } = entry;
        result.set(badge.dTag, badge as BadgeDefinition);
      }
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function setCachedBadgeDefinition(
  pubkey: string,
  badge: BadgeDefinition
): Promise<void> {
  const db = await openCacheDB();
  const key = `${pubkey}:${badge.dTag}`;

  const tx = db.transaction('badgeDefinitions', 'readwrite');
  const store = tx.objectStore('badgeDefinitions');

  // 既存キャッシュのタイムスタンプを確認し、古いイベントでは上書きしない
  const existing = await new Promise<CachedBadgeDefinition | undefined>((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as CachedBadgeDefinition | undefined);
    req.onerror = () => reject(req.error);
  });

  if (existing && existing.createdAt && existing.createdAt >= badge.createdAt) {
    return;
  }

  if (!existing) {
    await evictOldestIfNeeded(tx, 'badgeDefinitions');
  }

  const entry: CachedBadgeDefinition = { ...badge, key, pubkey, cachedAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedBadgeAwardees(
  issuerPubkey: string,
  dTag: string
): Promise<Map<string, number> | null> {
  const db = await openCacheDB();
  const key = `${issuerPubkey}:${dTag}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction('badgeAwardees', 'readonly');
    const req = tx.objectStore('badgeAwardees').get(key);
    req.onsuccess = () => {
      const result = req.result as CachedBadgeAwardees | undefined;
      if (!result) {
        resolve(null);
        return;
      }
      const awardeesMap = new Map<string, number>(Object.entries(result.awardees));
      resolve(awardeesMap);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setCachedBadgeAwardees(
  issuerPubkey: string,
  dTag: string,
  awardees: Map<string, number>
): Promise<void> {
  const db = await openCacheDB();
  const key = `${issuerPubkey}:${dTag}`;

  const tx = db.transaction('badgeAwardees', 'readwrite');
  const store = tx.objectStore('badgeAwardees');

  // 既存キャッシュをチェック
  const existing = await new Promise<CachedBadgeAwardees | undefined>((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as CachedBadgeAwardees | undefined);
    req.onerror = () => reject(req.error);
  });

  if (!existing) {
    await evictOldestIfNeeded(tx, 'badgeAwardees');
  }

  const entry: CachedBadgeAwardees = {
    key,
    issuerPubkey,
    dTag,
    awardees: Object.fromEntries(awardees),
    cachedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedReceivedBadgeAwards(recipientPubkey: string): Promise<{
  badges: Array<BadgeDefinition & { pubkey: string; awardEventId: string }>;
  cachedAt: number;
} | null> {
  const db = await openCacheDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('receivedBadgeAwards', 'readonly');
    const req = tx.objectStore('receivedBadgeAwards').get(recipientPubkey);
    req.onsuccess = () => {
      const result = req.result as CachedReceivedBadgeAwards | undefined;
      if (!result) {
        resolve(null);
        return;
      }
      resolve({ badges: result.badges, cachedAt: result.cachedAt });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setCachedReceivedBadgeAwards(
  recipientPubkey: string,
  badges: Array<BadgeDefinition & { pubkey: string; awardEventId: string }>
): Promise<void> {
  const db = await openCacheDB();

  const tx = db.transaction('receivedBadgeAwards', 'readwrite');
  const store = tx.objectStore('receivedBadgeAwards');

  const existing = await new Promise<CachedReceivedBadgeAwards | undefined>((resolve, reject) => {
    const req = store.get(recipientPubkey);
    req.onsuccess = () => resolve(req.result as CachedReceivedBadgeAwards | undefined);
    req.onerror = () => reject(req.error);
  });

  if (!existing) {
    await evictOldestIfNeeded(tx, 'receivedBadgeAwards');
  }

  const entry: CachedReceivedBadgeAwards = {
    key: recipientPubkey,
    recipientPubkey,
    badges,
    cachedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedProfileBadges(pubkey: string): Promise<{
  badges: Array<BadgeDefinition & { pubkey: string }> | null;
  cachedAt: number;
} | null> {
  const db = await openCacheDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('profileBadges', 'readonly');
    const req = tx.objectStore('profileBadges').get(pubkey);
    req.onsuccess = () => {
      const result = req.result as CachedProfileBadges | undefined;
      if (!result) {
        resolve(null);
        return;
      }
      resolve({ badges: result.badges, cachedAt: result.cachedAt });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setCachedProfileBadges(
  pubkey: string,
  badges: Array<BadgeDefinition & { pubkey: string }> | null
): Promise<void> {
  const db = await openCacheDB();

  const tx = db.transaction('profileBadges', 'readwrite');
  const store = tx.objectStore('profileBadges');

  const existing = await new Promise<CachedProfileBadges | undefined>((resolve, reject) => {
    const req = store.get(pubkey);
    req.onsuccess = () => resolve(req.result as CachedProfileBadges | undefined);
    req.onerror = () => reject(req.error);
  });

  if (!existing) {
    await evictOldestIfNeeded(tx, 'profileBadges');
  }

  const entry: CachedProfileBadges = {
    key: pubkey,
    pubkey,
    badges,
    cachedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCachedProfileBadges(pubkey: string): Promise<void> {
  const db = await openCacheDB();

  const tx = db.transaction('profileBadges', 'readwrite');
  const store = tx.objectStore('profileBadges');
  await new Promise<void>((resolve, reject) => {
    const req = store.delete(pubkey);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
