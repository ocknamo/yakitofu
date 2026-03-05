import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BadgeDefinition } from '../utils/badgeEventParser';
import type { UserProfile } from '../utils/userProfileParser';

type CacheModule = typeof import('./indexedDbCache');

async function freshModule(): Promise<CacheModule> {
  vi.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- intentional module cache reset
  return import('./indexedDbCache');
}

function resetIndexedDB() {
  // @ts-ignore
  globalThis.indexedDB = new IDBFactory();
}

describe('getCachedProfile / setCachedProfile', () => {
  let mod: CacheModule;

  beforeEach(async () => {
    resetIndexedDB();
    mod = await freshModule();
  });

  it('存在しない pubkey は null を返す', async () => {
    expect(await mod.getCachedProfile('nonexistent')).toBeNull();
  });

  it('set 後に get するとプロファイルを返す', async () => {
    const profile: UserProfile = {
      pubkey: 'pk1',
      name: 'Alice',
      displayName: 'Alice A',
      picture: 'https://example.com/alice.png',
    };
    await mod.setCachedProfile(profile);
    expect(await mod.getCachedProfile('pk1')).toEqual(profile);
  });
});

describe('setCachedProfile エビクション', () => {
  let mod: CacheModule;

  beforeEach(async () => {
    resetIndexedDB();
    mod = await freshModule();
  });

  it('101件目で最古エントリが削除される', async () => {
    for (let i = 0; i < 100; i++) {
      await mod.setCachedProfile({ pubkey: `pk${i}`, name: `User${i}`, displayName: '', picture: '' });
    }
    expect(await mod.getCachedProfile('pk0')).not.toBeNull();

    await mod.setCachedProfile({ pubkey: 'pk100', name: 'User100', displayName: '', picture: '' });

    expect(await mod.getCachedProfile('pk0')).toBeNull();
    expect(await mod.getCachedProfile('pk100')).not.toBeNull();
  });
});

describe('getCachedProfiles', () => {
  let mod: CacheModule;

  beforeEach(async () => {
    resetIndexedDB();
    mod = await freshModule();
  });

  it('複数 pubkey を一括取得し、存在しないものは Map に含まれない', async () => {
    await mod.setCachedProfile({ pubkey: 'a', name: 'A', displayName: '', picture: '' });
    await mod.setCachedProfile({ pubkey: 'b', name: 'B', displayName: '', picture: '' });

    const result = await mod.getCachedProfiles(['a', 'b', 'c']);
    expect(result.size).toBe(2);
    expect(result.get('a')?.name).toBe('A');
    expect(result.get('b')?.name).toBe('B');
    expect(result.has('c')).toBe(false);
  });
});

describe('getCachedBadgeDefinition / setCachedBadgeDefinition', () => {
  let mod: CacheModule;

  beforeEach(async () => {
    resetIndexedDB();
    mod = await freshModule();
  });

  it('存在しない key は null を返す', async () => {
    expect(await mod.getCachedBadgeDefinition('pk', 'nonexistent')).toBeNull();
  });

  it('set 後に get すると BadgeDefinition を返す', async () => {
    const badge: BadgeDefinition = {
      id: 'id1',
      name: 'Test Badge',
      description: 'A test badge',
      imageUrl: 'https://example.com/badge.png',
      thumbnails: {},
      dTag: 'test-badge',
    };
    await mod.setCachedBadgeDefinition('pubkey1', badge);
    expect(await mod.getCachedBadgeDefinition('pubkey1', 'test-badge')).toEqual(badge);
  });
});

describe('setCachedBadgeDefinition エビクション', () => {
  let mod: CacheModule;

  beforeEach(async () => {
    resetIndexedDB();
    mod = await freshModule();
  });

  it('101件目で最古エントリが削除される', async () => {
    for (let i = 0; i < 100; i++) {
      await mod.setCachedBadgeDefinition(`pk${i}`, {
        id: `id${i}`,
        name: `Badge${i}`,
        description: '',
        imageUrl: '',
        thumbnails: {},
        dTag: `badge${i}`,
      });
    }
    expect(await mod.getCachedBadgeDefinition('pk0', 'badge0')).not.toBeNull();

    await mod.setCachedBadgeDefinition('pk100', {
      id: 'id100',
      name: 'Badge100',
      description: '',
      imageUrl: '',
      thumbnails: {},
      dTag: 'badge100',
    });

    expect(await mod.getCachedBadgeDefinition('pk0', 'badge0')).toBeNull();
    expect(await mod.getCachedBadgeDefinition('pk100', 'badge100')).not.toBeNull();
  });

  it('同一 key 上書きは件数増加なし（100件のまま最古エントリが残る）', async () => {
    for (let i = 0; i < 100; i++) {
      await mod.setCachedBadgeDefinition(`pk${i}`, {
        id: `id${i}`,
        name: `Badge${i}`,
        description: '',
        imageUrl: '',
        thumbnails: {},
        dTag: `badge${i}`,
      });
    }

    // pk0 を上書き（件数は変わらないはず）
    await mod.setCachedBadgeDefinition('pk0', {
      id: 'id0-updated',
      name: 'Badge0 Updated',
      description: '',
      imageUrl: '',
      thumbnails: {},
      dTag: 'badge0',
    });

    // pk0 は上書きされ残っている
    const result = await mod.getCachedBadgeDefinition('pk0', 'badge0');
    expect(result?.name).toBe('Badge0 Updated');

    // pk1 はエビクションされていない
    expect(await mod.getCachedBadgeDefinition('pk1', 'badge1')).not.toBeNull();
  });
});
