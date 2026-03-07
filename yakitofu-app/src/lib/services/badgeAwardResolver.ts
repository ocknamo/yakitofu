import { Observable, BehaviorSubject, from, defer } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import type { Subscription } from 'rxjs';
import {
  getCachedReceivedBadgeAwards,
  setCachedReceivedBadgeAwards,
} from './indexedDbCache';
import { getUserReceivedBadgeAwards, waitForConnection } from './nostr';
import { resolveBadgeDefinition, type BadgeDefinitionWithPubkey } from './badgeDefinitionResolver';

const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface AwardEntry {
  issuerPubkey: string;
  dTag: string;
}

interface CachedEntry {
  awards: AwardEntry[];
  cachedAt: number;
}

/** In-memory cache: recipientPubkey -> CachedEntry */
const receivedBadgesCache = new Map<string, CachedEntry>();

function isFresh(entry: CachedEntry): boolean {
  return Date.now() - entry.cachedAt < TTL_MS;
}

/**
 * Resolve received badges for a user (3-layer: memory -> IndexedDB -> relay).
 * Cache TTL is 10 minutes — if cache is fresh, the relay is not queried.
 * Returns Observable<BadgeDefinitionWithPubkey[]> that emits as badges resolve.
 */
export function resolveReceivedBadges(
  recipientPubkey: string,
): Observable<BadgeDefinitionWithPubkey[]> {
  return defer(() => {
    const subject = new BehaviorSubject<BadgeDefinitionWithPubkey[]>([]);
    const seen = new Set<string>(); // "issuerPubkey:dTag"
    const badgeSubscriptions: Subscription[] = [];
    const badges: BadgeDefinitionWithPubkey[] = [];

    function upsertBadge(badge: BadgeDefinitionWithPubkey): void {
      const idx = badges.findIndex((b) => b.pubkey === badge.pubkey && b.dTag === badge.dTag);
      if (idx >= 0) {
        badges[idx] = badge;
      } else {
        badges.push(badge);
      }
      subject.next([...badges]);
    }

    function resolveAndTrack(issuerPubkey: string, dTag: string): void {
      const key = `${issuerPubkey}:${dTag}`;
      if (seen.has(key)) return;
      seen.add(key);

      const sub = resolveBadgeDefinition(issuerPubkey, dTag).subscribe({
        next: (badge) => {
          if (!badge) return;
          upsertBadge(badge);
        },
      });
      badgeSubscriptions.push(sub);
    }

    // 1. In-memory cache
    const memCached = receivedBadgesCache.get(recipientPubkey);
    const memFresh = memCached !== undefined && isFresh(memCached);
    if (memCached) {
      for (const { issuerPubkey, dTag } of memCached.awards) {
        resolveAndTrack(issuerPubkey, dTag);
      }
    }

    // 2. IndexedDB (skip if in-memory is fresh) -> 3. Relay (skip if cache is fresh)
    const pipeline$ = from(
      memFresh
        ? Promise.resolve<CachedEntry | null>(null)
        : getCachedReceivedBadgeAwards(recipientPubkey).catch(() => null),
    ).pipe(
      tap((idbCached) => {
        if (!idbCached) return;
        // Update in-memory if IDB is newer
        if (!memCached || idbCached.cachedAt > memCached.cachedAt) {
          receivedBadgesCache.set(recipientPubkey, idbCached);
        }
        for (const { issuerPubkey, dTag } of idbCached.awards) {
          resolveAndTrack(issuerPubkey, dTag);
        }
      }),
      switchMap((idbCached) => {
        // Skip relay if either in-memory or IDB cache is fresh
        const idbFresh = idbCached !== null && isFresh(idbCached);
        if (memFresh || idbFresh) {
          return new Observable<void>((s) => s.complete());
        }

        // 3. Relay query
        const { observable, req, filters } = getUserReceivedBadgeAwards(recipientPubkey);
        const relayAwards: AwardEntry[] = [];

        return new Observable<void>((subscriber) => {
          const subscription = observable.subscribe({
            next: (packet) => {
              for (const tag of packet.event.tags) {
                if (tag[0] !== 'a') continue;
                const parts = (tag[1] ?? '').split(':');
                if (parts.length < 3 || parts[0] !== '30009') continue;
                const issuerPubkey = parts[1];
                const dTag = parts.slice(2).join(':');
                const key = `${issuerPubkey}:${dTag}`;
                if (!relayAwards.some((a) => `${a.issuerPubkey}:${a.dTag}` === key)) {
                  relayAwards.push({ issuerPubkey, dTag });
                }
                resolveAndTrack(issuerPubkey, dTag);
              }
            },
            error: (err) => subscriber.error(err),
            complete: () => {
              // EOSE received — persist to caches
              const newEntry: CachedEntry = { awards: relayAwards, cachedAt: Date.now() };
              receivedBadgesCache.set(recipientPubkey, newEntry);
              setCachedReceivedBadgeAwards(recipientPubkey, relayAwards).catch(console.error);
              subscriber.complete();
            },
          });

          waitForConnection().then(() => {
            if (!subscription.closed) req.emit(filters);
          });

          return () => subscription.unsubscribe();
        });
      }),
    );

    const pipelineSub = pipeline$.subscribe({
      error: (err) => subject.error(err),
    });

    return subject.asObservable().pipe(
      tap({
        unsubscribe: () => {
          pipelineSub.unsubscribe();
          for (const sub of badgeSubscriptions) sub.unsubscribe();
        },
      }),
    );
  });
}
