import { BehaviorSubject, defer, forkJoin, from, Observable, of } from 'rxjs';
import { catchError, defaultIfEmpty, filter, switchMap, take, tap } from 'rxjs/operators';
import type { NostrEvent } from '../../types/nostr';
import { parseProfileBadgesEvent } from '../utils/profileBadgesParser';
import type { BadgeDefinitionWithPubkey } from './badgeDefinitionResolver';
import { resolveBadgeDefinition } from './badgeDefinitionResolver';
import {
  deleteCachedProfileBadges,
  getCachedProfileBadges,
  setCachedProfileBadges,
} from './indexedDbCache';
import { getProfileBadges, waitForConnection } from './nostr';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedEntry {
  /** null = event was fetched but doesn't exist; array = resolved badges in order */
  badges: BadgeDefinitionWithPubkey[] | null;
  cachedAt: number;
}

const profileBadgesCache = new Map<string, CachedEntry>();

function isFresh(entry: CachedEntry): boolean {
  return Date.now() - entry.cachedAt < TTL_MS;
}

/**
 * Resolve a user's Profile Badges (kind 10008 / legacy kind 30008).
 *
 * Returns Observable<BadgeDefinitionWithPubkey[] | null>:
 *   - null  = no profile badges event exists for this user
 *   - []    = event exists but has no valid entries (or none could be resolved)
 *   - [...]  = ordered badge definitions as chosen by the user
 *
 * Migration-aware: fetches both kind 10008 and legacy kind 30008 (d=profile_badges),
 * uses the event with the largest created_at.
 */
export function resolveProfileBadges(
  pubkey: string
): Observable<BadgeDefinitionWithPubkey[] | null> {
  return defer(() => {
    // 1. In-memory cache — fresh: emit cached value and complete without hitting relay.
    // Using of() instead of subject.next + subject.complete because subscribing to an
    // already-completed BehaviorSubject only delivers complete (not the last value).
    const memCached = profileBadgesCache.get(pubkey);
    if (memCached && isFresh(memCached)) {
      return of(memCached.badges);
    }

    const subject = new BehaviorSubject<BadgeDefinitionWithPubkey[] | null>(null);
    let initialized = false;

    if (memCached) {
      // Stale memory cache: emit stale value immediately while we refresh
      subject.next(memCached.badges);
      initialized = true;
    }

    // 2. IndexedDB → 3. Relay
    const pipeline$ = from(getCachedProfileBadges(pubkey).catch(() => null)).pipe(
      switchMap((idbCached) => {
        // If IDB has a newer entry than what's in memory, hydrate memory and emit it
        if (idbCached && (!memCached || idbCached.cachedAt > memCached.cachedAt)) {
          const entry: CachedEntry = {
            badges: idbCached.badges,
            cachedAt: idbCached.cachedAt,
          };
          profileBadgesCache.set(pubkey, entry);
          subject.next(idbCached.badges);
          initialized = true;
        }

        // If IDB cache is fresh, skip the relay entirely
        if (idbCached && isFresh({ badges: idbCached.badges, cachedAt: idbCached.cachedAt })) {
          return new Observable<void>((s) => s.complete());
        }

        // 3. Relay fetch
        return relayFetch$(pubkey, subject);
      })
    );

    const pipelineSub = pipeline$.subscribe({
      error: (err) => subject.error(err),
      complete: () => subject.complete(),
    });

    if (!initialized) {
      // Emit null placeholder until IDB/relay responds
      subject.next(null);
    }

    return subject.asObservable().pipe(tap({ unsubscribe: () => pipelineSub.unsubscribe() }));
  });
}

/** Persist resolved profile badges to memory + IndexedDB. */
function persistProfileBadges(pubkey: string, badges: BadgeDefinitionWithPubkey[] | null): void {
  const entry: CachedEntry = { badges, cachedAt: Date.now() };
  profileBadgesCache.set(pubkey, entry);
  setCachedProfileBadges(pubkey, badges).catch((err) => {
    console.error('[ProfileBadgesResolver] failed to persist to IndexedDB', err);
  });
}

/** Relay fetch pipeline that emits resolved badges into the given subject. */
function relayFetch$(
  pubkey: string,
  subject: BehaviorSubject<BadgeDefinitionWithPubkey[] | null>
): Observable<void> {
  const { observable, req, filters } = getProfileBadges(pubkey);

  return new Observable<void>((subscriber) => {
    const collectedEvents: NostrEvent[] = [];
    let eoseReceived = false;
    let eoseTimeoutId: ReturnType<typeof setTimeout>;

    function onEose(): void {
      if (eoseReceived) return;
      eoseReceived = true;
      clearTimeout(eoseTimeoutId);
      relaySubscription.unsubscribe();
      resolveFromEvents(collectedEvents);
    }

    function resolveFromEvents(events: NostrEvent[]): void {
      if (events.length === 0) {
        // No profile badges event exists
        persistProfileBadges(pubkey, null);
        subject.next(null);
        subscriber.complete();
        return;
      }

      // Prefer kind 10008 (new replaceable format) over kind 30008 (legacy/tombstone).
      // Never let a tombstone kind 30008 override a valid kind 10008, even if published later.
      const kind10008 = events.filter((ev) => ev.kind === 10008);
      const kind30008 = events.filter((ev) => ev.kind === 30008);
      const pool = kind10008.length > 0 ? kind10008 : kind30008;
      const newest = pool.reduce((best, ev) => (ev.created_at >= best.created_at ? ev : best));

      const entries = parseProfileBadgesEvent(newest);

      if (entries.length === 0) {
        persistProfileBadges(pubkey, []);
        subject.next([]);
        subscriber.complete();
        return;
      }

      // Resolve each badge definition in parallel, preserving order
      const defObservables = entries.map(({ aTag }) => {
        const parts = aTag.split(':');
        if (parts.length < 3) return of(null);
        const issuerPubkey = parts[1];
        const dTag = parts.slice(2).join(':');
        return resolveBadgeDefinition(issuerPubkey, dTag).pipe(
          filter((v): v is BadgeDefinitionWithPubkey => v !== null),
          take(1),
          defaultIfEmpty(null as BadgeDefinitionWithPubkey | null),
          catchError(() => of(null))
        );
      });

      forkJoin(defObservables).subscribe({
        next: (resolved) => {
          const badges = resolved.filter((b): b is BadgeDefinitionWithPubkey => b !== null);
          persistProfileBadges(pubkey, badges);
          subject.next(badges);
        },
        error: (err) => {
          console.error('[ProfileBadgesResolver] forkJoin error', err);
          subscriber.complete();
        },
        complete: () => subscriber.complete(),
      });
    }

    const relaySubscription = observable.subscribe({
      next: (packet) => {
        const event = packet.event;
        if (event.pubkey !== pubkey) return;
        if (event.kind !== 10008 && event.kind !== 30008) return;
        collectedEvents.push(event);
      },
      error: (err) => subscriber.error(err),
      complete: () => onEose(),
    });

    waitForConnection().then(() => {
      if (relaySubscription.closed) return;
      req.emit(filters);
      req.over();

      // Fallback timeout if EOSE never arrives
      eoseTimeoutId = setTimeout(() => {
        if (!relaySubscription.closed) {
          relaySubscription.unsubscribe();
          onEose();
        }
      }, 5 * 1000);
    });

    return () => {
      clearTimeout(eoseTimeoutId);
      relaySubscription.unsubscribe();
    };
  });
}

/** Invalidate cached profile badges for a pubkey (call after publishing kind 10008). */
export async function invalidateProfileBadgesCache(pubkey: string): Promise<void> {
  profileBadgesCache.delete(pubkey);
  await deleteCachedProfileBadges(pubkey).catch((err) => {
    console.error('[ProfileBadgesResolver] failed to delete IndexedDB entry', err);
  });
}
