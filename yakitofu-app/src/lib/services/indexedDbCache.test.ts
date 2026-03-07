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
      createdAt: 1000,
    };
    await mod.setCachedProfile(profile);
    expect(await mod.getCachedProfile('pk1')).toEqual(profile);
  });

  it('古いイベントではキャッシュを上書きしない', async () => {
    const newer: UserProfile = {
      pubkey: 'pk1',
      name: 'Alice New',
      displayName: '',
      picture: '',
      createdAt: 2000,
    };
    const older: UserProfile = {
      pubkey: 'pk1',
      name: 'Alice Old',
      displayName: '',
      picture: '',
      createdAt: 1000,
    };
    await mod.setCachedProfile(newer);
    await mod.setCachedProfile(older);
    expect((await mod.getCachedProfile('pk1'))?.name).toBe('Alice New');
  });

  it('新しいイベントではキャッシュを上書きする', async () => {
    const older: UserProfile = {
      pubkey: 'pk1',
      name: 'Alice Old',
      displayName: '',
      picture: '',
      createdAt: 1000,
    };
    const newer: UserProfile = {
      pubkey: 'pk1',
      name: 'Alice New',
      displayName: '',
      picture: '',
      createdAt: 2000,
    };
    await mod.setCachedProfile(older);
    await mod.setCachedProfile(newer);
    expect((await mod.getCachedProfile('pk1'))?.name).toBe('Alice New');
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
      await mod.setCachedProfile({ pubkey: `pk${i}`, name: `User${i}`, displayName: '', picture: '', createdAt: i });
    }
    expect(await mod.getCachedProfile('pk0')).not.toBeNull();

    await mod.setCachedProfile({ pubkey: 'pk100', name: 'User100', displayName: '', picture: '', createdAt: 100 });

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
    await mod.setCachedProfile({ pubkey: 'a', name: 'A', displayName: '', picture: '', createdAt: 1000 });
    await mod.setCachedProfile({ pubkey: 'b', name: 'B', displayName: '', picture: '', createdAt: 1000 });

    const result = await mod.getCachedProfiles(['a', 'b', 'c']);
    expect(result.size).toBe(2);
    expect(result.get('a')?.profile.name).toBe('A');
    expect(result.get('a')?.cachedAt).toBeDefined();
    expect(result.get('b')?.profile.name).toBe('B');
    expect(result.get('b')?.cachedAt).toBeDefined();
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
      createdAt: 1000,
    };
    await mod.setCachedBadgeDefinition('pubkey1', badge);
    expect(await mod.getCachedBadgeDefinition('pubkey1', 'test-badge')).toEqual(badge);
  });

  it('古いイベントではバッジキャッシュを上書きしない', async () => {
    const newer: BadgeDefinition = {
      id: 'id-new',
      name: 'Badge New',
      description: '',
      imageUrl: '',
      thumbnails: {},
      dTag: 'test-badge',
      createdAt: 2000,
    };
    const older: BadgeDefinition = {
      id: 'id-old',
      name: 'Badge Old',
      description: '',
      imageUrl: '',
      thumbnails: {},
      dTag: 'test-badge',
      createdAt: 1000,
    };
    await mod.setCachedBadgeDefinition('pubkey1', newer);
    await mod.setCachedBadgeDefinition('pubkey1', older);
    expect((await mod.getCachedBadgeDefinition('pubkey1', 'test-badge'))?.name).toBe('Badge New');
  });
});

describe('getCachedBadgeDefinitionsByPubkey', () => {
  let mod: CacheModule;

  beforeEach(async () => {
    resetIndexedDB();
    mod = await freshModule();
  });

  it('指定 pubkey のバッジのみを返す', async () => {
    await mod.setCachedBadgeDefinition('pk1', {
      id: 'id1',
      name: 'Badge1',
      description: '',
      imageUrl: '',
      thumbnails: {},
      dTag: 'badge1',
      createdAt: 1000,
    });
    await mod.setCachedBadgeDefinition('pk1', {
      id: 'id2',
      name: 'Badge2',
      description: '',
      imageUrl: '',
      thumbnails: {},
      dTag: 'badge2',
      createdAt: 1000,
    });
    await mod.setCachedBadgeDefinition('pk2', {
      id: 'id3',
      name: 'Badge3',
      description: '',
      imageUrl: '',
      thumbnails: {},
      dTag: 'badge3',
      createdAt: 1000,
    });

    const result = await mod.getCachedBadgeDefinitionsByPubkey('pk1');
    expect(result.size).toBe(2);
    expect(result.get('badge1')?.name).toBe('Badge1');
    expect(result.get('badge2')?.name).toBe('Badge2');
    expect(result.has('badge3')).toBe(false);
  });

  it('該当なしの場合は空 Map を返す', async () => {
    const result = await mod.getCachedBadgeDefinitionsByPubkey('nonexistent');
    expect(result.size).toBe(0);
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
        createdAt: i,
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
      createdAt: 100,
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
        createdAt: i,
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
      createdAt: 1000,
    });

    // pk0 は上書きされ残っている
    const result = await mod.getCachedBadgeDefinition('pk0', 'badge0');
    expect(result?.name).toBe('Badge0 Updated');

    // pk1 はエビクションされていない
    expect(await mod.getCachedBadgeDefinition('pk1', 'badge1')).not.toBeNull();
  });
});

describe('getCachedReceivedBadgeAwards / setCachedReceivedBadgeAwards', () => {
  let mod: CacheModule;

  beforeEach(async () => {
    resetIndexedDB();
    mod = await freshModule();
  });

  it('存在しない recipientPubkey は null を返す', async () => {
    expect(await mod.getCachedReceivedBadgeAwards('nonexistent')).toBeNull();
  });

  it('set 後に get するとバッジ定義リストと cachedAt を返す', async () => {
    const badges = [
      {
        pubkey: 'issuer1',
        id: 'id1',
        name: 'Badge1',
        description: 'desc',
        imageUrl: 'https://example.com/badge.png',
        thumbnails: {},
        dTag: 'badge1',
        createdAt: 1000,
      },
    ];
    await mod.setCachedReceivedBadgeAwards('recipient1', badges);
    const result = await mod.getCachedReceivedBadgeAwards('recipient1');
    expect(result).not.toBeNull();
    expect(result!.badges).toEqual(badges);
    expect(result!.cachedAt).toBeGreaterThan(0);
  });

  it('空のバッジリストを保存・取得できる', async () => {
    await mod.setCachedReceivedBadgeAwards('recipient1', []);
    const result = await mod.getCachedReceivedBadgeAwards('recipient1');
    expect(result).not.toBeNull();
    expect(result!.badges).toEqual([]);
  });

  it('上書き保存で最新のバッジリストが取得できる', async () => {
    await mod.setCachedReceivedBadgeAwards('recipient1', []);
    const badges = [
      {
        pubkey: 'issuer1',
        id: 'id1',
        name: 'Badge1',
        description: '',
        imageUrl: '',
        thumbnails: {},
        dTag: 'badge1',
        createdAt: 1000,
      },
    ];
    await mod.setCachedReceivedBadgeAwards('recipient1', badges);
    const result = await mod.getCachedReceivedBadgeAwards('recipient1');
    expect(result!.badges).toHaveLength(1);
    expect(result!.badges[0].name).toBe('Badge1');
  });
});
