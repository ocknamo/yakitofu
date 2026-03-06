import { Observable, BehaviorSubject, from, EMPTY, defer } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import {
  getCachedBadgeAwardees,
  setCachedBadgeAwardees,
} from './indexedDbCache';
import { getBadgeAwardees, waitForConnection } from './nostr';

/** Module-level in-memory cache keyed by "issuerPubkey:dTag". */
const awardeeCache = new Map<string, Map<string, number>>();

function cacheKey(issuerPubkey: string, dTag: string): string {
  return `${issuerPubkey}:${dTag}`;
}

function isNewer(
  incoming: Map<string, number>,
  existing: Map<string, number> | undefined,
): boolean {
  if (!existing || existing.size === 0) return true;

  // Compare each awardee's createdAt timestamp
  for (const [pubkey, incomingCreatedAt] of incoming.entries()) {
    const existingCreatedAt = existing.get(pubkey);
    if (!existingCreatedAt || incomingCreatedAt > existingCreatedAt) {
      return true;
    }
  }

  return false;
}

function mergeAwardees(
  existing: Map<string, number>,
  incoming: Map<string, number>,
): Map<string, number> {
  const merged = new Map<string, number>(existing);

  for (const [pubkey, createdAt] of incoming.entries()) {
    const existingCreatedAt = merged.get(pubkey);
    if (!existingCreatedAt || createdAt > existingCreatedAt) {
      merged.set(pubkey, createdAt);
    }
  }

  return merged;
}

/**
 * Resolve badge awardees for a given badge definition (3-layer: memory -> IndexedDB -> relay).
 * Returns an Observable that emits updated Maps of awardees as they are discovered.
 *
 * The Map contains: pubkey -> createdAt timestamp
 */
export function resolveBadgeAwardees(
  issuerPubkey: string,
  dTag: string,
): Observable<Map<string, number>> {
  return defer(() => {
    const subject = new BehaviorSubject<Map<string, number>>(new Map());
    const key = cacheKey(issuerPubkey, dTag);

    // 1. In-memory cache (sync)
    const cached = awardeeCache.get(key);
    if (cached && cached.size > 0) {
      subject.next(new Map(cached));
    }

    // 2. IndexedDB cache -> 3. Relay
    const pipeline = from(
      getCachedBadgeAwardees(issuerPubkey, dTag).catch(() => null),
    ).pipe(
      tap((idbCached) => {
        if (idbCached && idbCached.size > 0) {
          // Check if IndexedDB data is newer than in-memory cache
          if (isNewer(idbCached, awardeeCache.get(key))) {
            const merged = awardeeCache.has(key)
              ? mergeAwardees(awardeeCache.get(key)!, idbCached)
              : new Map(idbCached);
            awardeeCache.set(key, merged);
            subject.next(new Map(merged));
          }
        }
      }),
      switchMap(() => {
        const { observable, req, filters } = getBadgeAwardees(issuerPubkey, dTag);
        const seen = new Map<string, number>();

        return new Observable<void>((subscriber) => {
          const subscription = observable.subscribe({
            next: (packet) => {
              const event = packet.event;
              if (!event) return;

              // Extract all p-tag pubkeys from the award event
              const pTags = event.tags
                .filter((tag: string[]) => tag[0] === 'p')
                .map((tag: string[]) => tag[1]);

              if (pTags.length === 0) return;

              let changed = false;
              for (const pubkey of pTags) {
                const existingCreatedAt = seen.get(pubkey);
                if (!existingCreatedAt || event.created_at > existingCreatedAt) {
                  seen.set(pubkey, event.created_at);
                  changed = true;
                }
              }

              if (changed) {
                // Update in-memory cache
                const currentCache = awardeeCache.get(key) ?? new Map();
                const merged = mergeAwardees(currentCache, seen);
                awardeeCache.set(key, merged);

                // Persist to IndexedDB
                setCachedBadgeAwardees(issuerPubkey, dTag, merged).catch(
                  console.error,
                );

                // Emit updated map
                subject.next(new Map(merged));
              }
            },
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });

          waitForConnection().then(() => {
            if (!subscription.closed) req.emit(filters);
          });

          return () => subscription.unsubscribe();
        });
      }),
    );

    const pipelineSub = pipeline.subscribe({
      error: (err) => subject.error(err),
    });

    return subject.asObservable().pipe(
      tap({ unsubscribe: () => pipelineSub.unsubscribe() }),
    );
  });
}

/**
 * Synchronous in-memory lookup for badge awardees.
 * Returns undefined if not yet resolved.
 */
export function getCachedBadgeAwardeesSync(
  issuerPubkey: string,
  dTag: string,
): Map<string, number> | undefined {
  return awardeeCache.get(cacheKey(issuerPubkey, dTag));
}

/**
 * Insert badge awardees into caches (in-memory + IndexedDB).
 * Used by BadgePage to populate the cache with fetched data.
 */
export function cacheBadgeAwardees(
  issuerPubkey: string,
  dTag: string,
  awardees: Map<string, number>,
): void {
  const key = cacheKey(issuerPubkey, dTag);
  const currentCache = awardeeCache.get(key) ?? new Map();
  const merged = mergeAwardees(currentCache, awardees);
  awardeeCache.set(key, merged);
  setCachedBadgeAwardees(issuerPubkey, dTag, merged).catch(console.error);
}