import type { Subscription } from 'rxjs';
import { BehaviorSubject, defer, from, Observable } from 'rxjs';
import { distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { parseBadgeEvent } from '../utils/badgeEventParser';
import type { BadgeDefinitionWithPubkey } from './badgeDefinitionResolver';
import { getCachedReceivedBadgeAwards, setCachedReceivedBadgeAwards } from './indexedDbCache';
import { getBadgeDefinition, getUserReceivedBadgeAwards, waitForConnection } from './nostr';

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const EMPTY_TTL_MS = 30 * 1000; // 30 seconds (for empty results to avoid caching relay failures)

/** Badge received by a user, including the kind 8 award event ID needed for kind 10008. */
export interface ReceivedBadge extends BadgeDefinitionWithPubkey {
  awardEventId: string;
}

interface CachedEntry {
  badges: ReceivedBadge[];
  cachedAt: number;
}

/** In-memory cache: recipientPubkey -> CachedEntry */
const receivedBadgesCache = new Map<string, CachedEntry>();

function isFresh(entry: CachedEntry): boolean {
  const ttl = entry.badges.length === 0 ? EMPTY_TTL_MS : TTL_MS;
  return Date.now() - entry.cachedAt < ttl;
}

/** 既存キャッシュと新規取得バッジをマージ（同一 pubkey:dTag は新しい createdAt を優先）*/
function mergeBadges(existing: ReceivedBadge[], incoming: ReceivedBadge[]): ReceivedBadge[] {
  const map = new Map<string, ReceivedBadge>();
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
 * Returns Observable<ReceivedBadge[]> that emits once and completes.
 */
export function resolveReceivedBadges(recipientPubkey: string): Observable<ReceivedBadge[]> {
  return defer(() => {
    const subject = new BehaviorSubject<ReceivedBadge[]>([]);

    // 1. In-memory cache
    const memCached = receivedBadgesCache.get(recipientPubkey);
    if (memCached) {
      if (isFresh(memCached)) {
        subject.next(memCached.badges);
        return subject.asObservable();
      }
    }

    // 2. IndexedDB -> 3. Relay
    const pipeline$ = from(getCachedReceivedBadgeAwards(recipientPubkey).catch(() => null)).pipe(
      tap((idbCached) => {
        if (!idbCached) return;
        if (!memCached || idbCached.cachedAt > memCached.cachedAt) {
          receivedBadgesCache.set(recipientPubkey, idbCached);
          subject.next(idbCached.badges);
        }
      }),
      switchMap((idbCached) => {
        if (idbCached && isFresh(idbCached)) {
          return new Observable<void>((s) => s.complete());
        }

        // 3. Relay: kind 8 を EOSE まで収集してからバッジ定義を並列取得
        const {
          observable: awardsObs,
          req: awardsReq,
          filters: awardsFilters,
        } = getUserReceivedBadgeAwards(recipientPubkey);

        return new Observable<void>((subscriber) => {
          const awardEntries: Array<{ issuerPubkey: string; dTag: string; awardEventId: string }> =
            [];
          const defSubs: Subscription[] = [];
          const defTimeouts: Array<ReturnType<typeof setTimeout>> = [];
          let awardsCompleted = false;
          let eoseTimeoutId: ReturnType<typeof setTimeout>;

          // awards 収集完了（EOSE または fallback timeout）の共通ハンドラ
          function onAwardsComplete(): void {
            if (awardsCompleted) return;
            awardsCompleted = true;
            clearTimeout(eoseTimeoutId);

            if (awardEntries.length === 0) {
              finalize([]);
              return;
            }

            let remaining = awardEntries.length;
            const fetched: ReceivedBadge[] = [];

            for (const { issuerPubkey, dTag, awardEventId } of awardEntries) {
              const {
                observable: defObs,
                req: defReq,
                filters: defFilters,
              } = getBadgeDefinition(issuerPubkey, dTag);
              let found = false;

              // ✅ subscribe-first: リレーからのイベントを取りこぼさないよう先にサブスクライブ
              let defTimeoutId: ReturnType<typeof setTimeout>;
              const defSub = defObs
                .pipe(distinctUntilChanged((a, b) => a.event.id === b.event.id))
                .subscribe({
                  next: (packet) => {
                    if (found) return;
                    const event = packet.event;
                    if (event.pubkey !== issuerPubkey) return;
                    const eventDTag = event.tags.find((t: string[]) => t[0] === 'd')?.[1];
                    if (eventDTag !== dTag) return;
                    fetched.push({ ...parseBadgeEvent(event), pubkey: issuerPubkey, awardEventId });
                    found = true;
                  },
                  error: (err) => {
                    clearTimeout(defTimeoutId);
                    console.error(
                      '[BadgeAwardResolver] badge definition fetch error',
                      issuerPubkey,
                      dTag,
                      err
                    );
                    remaining--;
                    if (remaining === 0) finalize(fetched);
                  },
                  complete: () => {
                    clearTimeout(defTimeoutId);
                    if (!found) {
                      console.warn(
                        '[BadgeAwardResolver] badge definition not found on relay: issuerPubkey =',
                        issuerPubkey,
                        'dTag =',
                        dTag
                      );
                    }
                    remaining--;
                    if (remaining === 0) finalize(fetched);
                  },
                });
              defSubs.push(defSub);

              // ✅ emit 後にタイムアウトを開始（subscribe-before-emit パターン）
              waitForConnection().then(() => {
                if (defSub.closed) return;
                defReq.emit(defFilters);
                defReq.over(); // EOSE 後に observable が complete できるよう単発化する
                defTimeoutId = setTimeout(() => {
                  if (!defSub.closed) {
                    console.warn(
                      '[BadgeAwardResolver] badge definition timeout (5s): issuerPubkey =',
                      issuerPubkey,
                      'dTag =',
                      dTag
                    );
                    defSub.unsubscribe();
                    remaining--;
                    if (remaining === 0) finalize(fetched);
                  }
                }, 5 * 1000);
                defTimeouts.push(defTimeoutId);
              });
            }
          }

          // ✅ subscribe-first: リレーからのイベントを取りこぼさないよう先にサブスクライブ
          // awardKeys で O(1) 重複チェック
          const awardKeys = new Set<string>();
          const awardsSub = awardsObs
            .pipe(
              distinctUntilChanged((a, b) => a.event.id === b.event.id) // 同一イベントの重複受信を防止
            )
            .subscribe({
              next: (packet) => {
                const awardEventId = packet.event.id ?? '';
                for (const tag of packet.event.tags) {
                  if (tag[0] !== 'a') continue;
                  const parts = (tag[1] ?? '').split(':');
                  if (parts.length < 3 || parts[0] !== '30009') continue;

                  const issuerPubkey = parts[1];
                  const dTag = parts.slice(2).join(':');
                  const key = `${issuerPubkey}:${dTag}`;
                  if (!awardKeys.has(key)) {
                    awardKeys.add(key);
                    awardEntries.push({ issuerPubkey, dTag, awardEventId });
                  }
                }
              },
              error: (err) => subscriber.error(err),
              complete: () => onAwardsComplete(),
            });

          // ✅ emit 後にタイムアウトを開始（subscribe-before-emit パターン）
          waitForConnection().then(() => {
            if (awardsSub.closed) return;
            awardsReq.emit(awardsFilters);
            awardsReq.over(); // EOSE 後に observable が complete できるよう単発化する

            // EOSE が来ない場合の fallback タイムアウト（emit 後 3秒）
            eoseTimeoutId = setTimeout(() => {
              if (!awardsSub.closed) {
                awardsSub.unsubscribe();
                onAwardsComplete();
              }
            }, 3 * 1000);
          });

          function finalize(resolved: ReceivedBadge[]): void {
            // 電波不良で一部リレーが応答しなかった場合でも既存キャッシュと
            // マージすることで過去取得済みバッジを失わないようにする
            const existing = receivedBadgesCache.get(recipientPubkey);
            const merged = mergeBadges(existing?.badges ?? [], resolved);
            const newEntry: CachedEntry = { badges: merged, cachedAt: Date.now() };
            receivedBadgesCache.set(recipientPubkey, newEntry);
            setCachedReceivedBadgeAwards(recipientPubkey, merged).catch(console.error);
            subject.next(merged);
            subscriber.complete();
          }

          return () => {
            clearTimeout(eoseTimeoutId);
            for (const t of defTimeouts) clearTimeout(t);
            awardsSub.unsubscribe();
            for (const sub of defSubs) sub.unsubscribe();
          };
        });
      })
    );

    const pipelineSub = pipeline$.subscribe({
      error: (err) => subject.error(err),
      complete: () => subject.complete(),
    });

    return subject.asObservable().pipe(tap({ unsubscribe: () => pipelineSub.unsubscribe() }));
  });
}
