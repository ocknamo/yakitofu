import { Observable, BehaviorSubject, from, EMPTY, defer } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import {
  getCachedBadgeDefinition,
  getCachedBadgeDefinitionsByPubkey,
  setCachedBadgeDefinition,
} from './indexedDbCache';
import { getBadgeDefinition, getUserBadgeDefinitions, waitForConnection } from './nostr';
import { parseBadgeEvent, type BadgeDefinition } from '../utils/badgeEventParser';

export interface BadgeDefinitionWithPubkey extends BadgeDefinition {
  pubkey: string;
}

/** In-memory cache keyed by "pubkey:dTag". */
const badgeCache = new Map<string, BadgeDefinitionWithPubkey>();
/** Index: pubkey -> Set of cache keys. */
const pubkeyIndex = new Map<string, Set<string>>();

function cacheKey(pubkey: string, dTag: string): string {
  return `${pubkey}:${dTag}`;
}

function isNewer(
  incoming: BadgeDefinitionWithPubkey,
  existing: BadgeDefinitionWithPubkey | undefined,
): boolean {
  return !existing || !existing.createdAt || incoming.createdAt >= existing.createdAt;
}

function upsertCache(badge: BadgeDefinitionWithPubkey): boolean {
  const key = cacheKey(badge.pubkey, badge.dTag);
  const existing = badgeCache.get(key);
  if (isNewer(badge, existing)) {
    badgeCache.set(key, badge);
    let keys = pubkeyIndex.get(badge.pubkey);
    if (!keys) {
      keys = new Set();
      pubkeyIndex.set(badge.pubkey, keys);
    }
    keys.add(key);
    return true;
  }
  return false;
}

/**
 * Resolve a single badge definition (3-layer: memory -> IndexedDB -> relay).
 * Returns an Observable that emits updated values as they are discovered.
 */
export function resolveBadgeDefinition(
  pubkey: string,
  dTag: string,
): Observable<BadgeDefinitionWithPubkey | null> {
  return defer(() => {
    const subject = new BehaviorSubject<BadgeDefinitionWithPubkey | null>(null);
    const key = cacheKey(pubkey, dTag);

    // 1. In-memory
    const cached = badgeCache.get(key);
    if (cached) {
      subject.next(cached);
    }

    // 2. IndexedDB -> 3. Relay
    const pipeline = from(
      getCachedBadgeDefinition(pubkey, dTag).catch(() => null),
    ).pipe(
      tap((idbCached) => {
        if (idbCached) {
          const badge: BadgeDefinitionWithPubkey = { ...idbCached, pubkey };
          if (upsertCache(badge)) {
            subject.next(badge);
          }
        }
      }),
      switchMap(() => {
        const { observable, req, filters } = getBadgeDefinition(pubkey, dTag);

        return new Observable<void>((subscriber) => {
          const subscription = observable.subscribe({
            next: (packet) => {
              const event = packet.event;
              if (event.pubkey !== pubkey) return;
              const eventDTag = event.tags.find((tag: string[]) => tag[0] === 'd')?.[1];
              if (eventDTag !== dTag) return;

              const parsed = parseBadgeEvent(event);
              const badge: BadgeDefinitionWithPubkey = { ...parsed, pubkey };
              if (upsertCache(badge)) {
                setCachedBadgeDefinition(pubkey, parsed).catch(console.error);
                subject.next(badge);
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
 * Resolve all badge definitions for a pubkey (3-layer: memory -> IndexedDB -> relay).
 * Returns an Observable that emits an updated Map<dTag, BadgeDefinitionWithPubkey>.
 */
export function resolveBadgeDefinitionsByPubkey(
  pubkey: string,
): Observable<Map<string, BadgeDefinitionWithPubkey>> {
  return defer(() => {
    const result = new Map<string, BadgeDefinitionWithPubkey>();
    const subject = new BehaviorSubject<Map<string, BadgeDefinitionWithPubkey>>(result);

    function upsertAndEmit(badge: BadgeDefinitionWithPubkey): boolean {
      const existing = result.get(badge.dTag);
      if (isNewer(badge, existing)) {
        result.set(badge.dTag, badge);
        upsertCache(badge);
        return true;
      }
      return false;
    }

    // 1. In-memory
    const keys = pubkeyIndex.get(pubkey);
    if (keys) {
      for (const key of keys) {
        const cached = badgeCache.get(key);
        if (cached) result.set(cached.dTag, cached);
      }
      if (result.size > 0) {
        subject.next(new Map(result));
      }
    }

    // 2. IndexedDB -> 3. Relay
    const pipeline = from(
      getCachedBadgeDefinitionsByPubkey(pubkey).catch(() => new Map<string, BadgeDefinition>()),
    ).pipe(
      tap((idbCached) => {
        let changed = false;
        for (const [, badge] of idbCached) {
          const withPubkey: BadgeDefinitionWithPubkey = { ...badge, pubkey };
          if (upsertAndEmit(withPubkey)) changed = true;
        }
        if (changed) subject.next(new Map(result));
      }),
      switchMap(() => {
        const { observable, req, filters } = getUserBadgeDefinitions(pubkey);

        return new Observable<void>((subscriber) => {
          const subscription = observable.subscribe({
            next: (packet) => {
              const event = packet.event;
              if (event.pubkey !== pubkey) return;
              const parsed = parseBadgeEvent(event);
              const badge: BadgeDefinitionWithPubkey = { ...parsed, pubkey };
              if (upsertAndEmit(badge)) {
                setCachedBadgeDefinition(pubkey, parsed).catch(console.error);
                subject.next(new Map(result));
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
 * Synchronous in-memory lookup for a single badge definition.
 */
export function getCachedBadgeSync(
  pubkey: string,
  dTag: string,
): BadgeDefinitionWithPubkey | undefined {
  return badgeCache.get(cacheKey(pubkey, dTag));
}

/**
 * Insert a badge definition into caches (in-memory + IndexedDB).
 * Used by SearchResultPage to populate the cache with search results.
 */
export function cacheBadgeDefinition(badge: BadgeDefinitionWithPubkey): void {
  if (upsertCache(badge)) {
    const { pubkey, ...badgeDef } = badge;
    setCachedBadgeDefinition(pubkey, badgeDef).catch(console.error);
  }
}
