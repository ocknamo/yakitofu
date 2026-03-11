import { Observable, BehaviorSubject, from, defer } from 'rxjs';
import { tap, switchMap, timeout, distinctUntilChanged } from 'rxjs/operators';
import type { Subscription } from 'rxjs';
import {
  getCachedReceivedBadgeAwards,
  setCachedReceivedBadgeAwards,
} from './indexedDbCache';
import { getUserReceivedBadgeAwards, getBadgeDefinition, waitForConnection } from './nostr';
import { parseBadgeEvent } from '../utils/badgeEventParser';
import type { BadgeDefinitionWithPubkey } from './badgeDefinitionResolver';
import { completeOnTimeout } from 'rx-nostr';

const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CachedEntry {
  badges: BadgeDefinitionWithPubkey[];
  cachedAt: number;
}

/** In-memory cache: recipientPubkey -> CachedEntry */
const receivedBadgesCache = new Map<string, CachedEntry>();

function isFresh(entry: CachedEntry): boolean {
  return Date.now() - entry.cachedAt < TTL_MS;
}

/** 既存キャッシュと新規取得バッジをマージ（同一 pubkey:dTag は新しい createdAt を優先）*/
function mergeBadges(
  existing: BadgeDefinitionWithPubkey[],
  incoming: BadgeDefinitionWithPubkey[],
): BadgeDefinitionWithPubkey[] {
  const map = new Map<string, BadgeDefinitionWithPubkey>();
  for (const badge of existing) {
    map.set(`${badge.pubkey}:${badge.dTag}`, badge);
  }
  for (const badge of incoming) {
    const key = `${badge.pubkey}:${badge.dTag}`;
    const ex = map.get(key);
    if (!ex || badge.createdAt >= ex.createdAt) {
      map.set(key, badge);
    }
  }
  return Array.from(map.values());
}

/**
 * Resolve received badges for a user (2-layer: memory/IndexedDB cache -> relay).
 * Cache TTL is 10 minutes — if cache is fresh, the relay is not queried at all.
 * When relay is needed: collect all kind 8 award events until EOSE, then fetch
 * each badge definition (kind 30009) directly from relay in parallel.
 * Returns Observable<BadgeDefinitionWithPubkey[]> that emits once and completes.
 */
export function resolveReceivedBadges(
  recipientPubkey: string,
): Observable<BadgeDefinitionWithPubkey[]> {
  return defer(() => {
    const subject = new BehaviorSubject<BadgeDefinitionWithPubkey[]>([]);
    console.log('[BadgeAwardResolver] resolveReceivedBadges start: recipientPubkey =', recipientPubkey);

    // 1. In-memory cache
    const memCached = receivedBadgesCache.get(recipientPubkey);
    if (memCached) {
      const age = Math.round((Date.now() - memCached.cachedAt) / 1000);
      if (isFresh(memCached)) {
        console.log('[BadgeAwardResolver] cache hit (in-memory, fresh): count =', memCached.badges.length, 'age =', age, 's');
        subject.next(memCached.badges);
        return subject.asObservable();
      }
      console.log('[BadgeAwardResolver] cache hit (in-memory, stale): count =', memCached.badges.length, 'age =', age, 's');
    } else {
      console.log('[BadgeAwardResolver] cache miss (in-memory)');
    }

    // 2. IndexedDB -> 3. Relay
    const pipeline$ = from(
      getCachedReceivedBadgeAwards(recipientPubkey).catch(() => null),
    ).pipe(
      tap((idbCached) => {
        if (!idbCached) {
          console.log('[BadgeAwardResolver] cache miss (IndexedDB)');
          return;
        }
        console.log('[BadgeAwardResolver] cache hit (IndexedDB): count =', idbCached.badges.length);
        if (!memCached || idbCached.cachedAt > memCached.cachedAt) {
          receivedBadgesCache.set(recipientPubkey, idbCached);
          subject.next(idbCached.badges);
        }
      }),
      switchMap((idbCached) => {
        if (idbCached && isFresh(idbCached)) {
          console.log('[BadgeAwardResolver] IndexedDB cache is fresh, skipping relay');
          return new Observable<void>((s) => s.complete());
        }

        // 3. Relay: kind 8 を EOSE まで収集してからバッジ定義を並列取得
        const { observable: awardsObs, req: awardsReq, filters: awardsFilters } =
          getUserReceivedBadgeAwards(recipientPubkey);
        console.log('[BadgeAwardResolver] querying relay for kind 8 awards, filters =', awardsFilters);

        return new Observable<void>((subscriber) => {
          const awardEntries: Array<{ issuerPubkey: string; dTag: string }> = [];
          const defSubs: Subscription[] = [];

          const awardsSub = awardsObs.pipe(
            distinctUntilChanged((a, b) => a.event.id === b.event.id), // 同一イベントの重複受信を防止
            completeOnTimeout(3 * 1000), // 3秒でタイムアウトしてEOSEとみなす
          ).subscribe({
            next: (packet) => {
              console.log('[BadgeAwardResolver] kind 8 event received: id =', packet.event.id, 'tags =', packet.event.tags);
              for (const tag of packet.event.tags) {
                if (tag[0] !== 'a') continue;
                const parts = (tag[1] ?? '').split(':');
                if (parts.length < 3 || parts[0] !== '30009') continue;

                const issuerPubkey = parts[1];
                const dTag = parts.slice(2).join(':');
                const key = `${issuerPubkey}:${dTag}`;
                if (!awardEntries.some((a) => `${a.issuerPubkey}:${a.dTag}` === key)) {
                  awardEntries.push({ issuerPubkey, dTag });
                }
              }
            },
            error: (err) => subscriber.error(err),
            complete: () => {
              console.log('[BadgeAwardResolver] kind 8 collection complete (EOSE/timeout): awardEntries =', awardEntries);
              // EOSE — awards リスト確定。バッジ定義をリレーから並列取得する
              if (awardEntries.length === 0) {
                console.log('[BadgeAwardResolver] no award entries found, finalizing with empty array');
                finalize([]);
                return;
              }

              let remaining = awardEntries.length;
              const fetched: BadgeDefinitionWithPubkey[] = [];
              console.log('[BadgeAwardResolver] fetching', awardEntries.length, 'badge definitions in parallel');

              for (const { issuerPubkey, dTag } of awardEntries) {
                const { observable: defObs, req: defReq, filters: defFilters } =
                  getBadgeDefinition(issuerPubkey, dTag);
                let found = false;
                console.log('[BadgeAwardResolver] fetching badge definition: issuerPubkey =', issuerPubkey, 'dTag =', dTag);

                const defSub = defObs.pipe(
                  completeOnTimeout(5 * 1000) // 5秒でタイムアウトしてEOSEとみなす
                ).subscribe({
                  next: (packet) => {
                    if (found) return;
                    const event = packet.event;
                    console.log('[BadgeAwardResolver] badge definition event received: id =', event.id, 'pubkey =', event.pubkey, 'tags =', event.tags);
                    if (event.pubkey !== issuerPubkey) return;
                    const eventDTag = event.tags.find((t: string[]) => t[0] === 'd')?.[1];
                    if (eventDTag !== dTag) return;
                    const parsed = parseBadgeEvent(event);
                    console.log('[BadgeAwardResolver] badge definition parsed:', parsed);
                    fetched.push({ ...parsed, pubkey: issuerPubkey });
                    found = true;
                  },
                  error: (err) => {
                    console.error('[BadgeAwardResolver] badge definition fetch error for', issuerPubkey, dTag, err);
                    remaining--;
                    if (remaining === 0) finalize(fetched);
                  },
                  complete: () => {
                    if (!found) {
                      console.warn('[BadgeAwardResolver] badge definition not found (timeout/EOSE): issuerPubkey =', issuerPubkey, 'dTag =', dTag);
                    }
                    remaining--;
                    console.log('[BadgeAwardResolver] badge definition complete, remaining =', remaining);
                    if (remaining === 0) finalize(fetched);
                  },
                });
                defSubs.push(defSub);

                waitForConnection().then(() => {
                  if (!defSub.closed) {
                    defReq.emit(defFilters);
                    defReq.over(); // EOSE 後に observable が complete できるよう単発化する
                  }
                });
              }

              function finalize(resolved: BadgeDefinitionWithPubkey[]): void {
                console.log('[BadgeAwardResolver] finalize: resolved count =', resolved.length, resolved);
                // 電波不良で一部リレーが応答しなかった場合でも既存キャッシュと
                // マージすることで過去取得済みバッジを失わないようにする
                const existing = receivedBadgesCache.get(recipientPubkey);
                const merged = mergeBadges(existing?.badges ?? [], resolved);
                console.log('[BadgeAwardResolver] finalize: merged count =', merged.length);
                const newEntry: CachedEntry = { badges: merged, cachedAt: Date.now() };
                receivedBadgesCache.set(recipientPubkey, newEntry);
                setCachedReceivedBadgeAwards(recipientPubkey, merged).catch(console.error);
                subject.next(merged);
                subscriber.complete();
              }
            },
          });

          waitForConnection().then(() => {
            console.log('[BadgeAwardResolver] connection ready, emitting kind 8 req filters:', awardsFilters);
            if (!awardsSub.closed) {
              awardsReq.emit(awardsFilters);
              awardsReq.over(); // EOSE 後に observable が complete できるよう単発化する
            }
          });

          return () => {
            awardsSub.unsubscribe();
            for (const sub of defSubs) sub.unsubscribe();
          };
        });
      }),
    );

    const pipelineSub = pipeline$.subscribe({
      error: (err) => subject.error(err),
      complete: () => subject.complete(),
    });

    return subject.asObservable().pipe(
      tap({ unsubscribe: () => pipelineSub.unsubscribe() }),
    );
  });
}
