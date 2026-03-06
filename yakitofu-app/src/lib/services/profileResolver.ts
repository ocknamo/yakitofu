import { Observable, BehaviorSubject, from, EMPTY, defer } from 'rxjs';
import { switchMap, tap, filter } from 'rxjs/operators';
import { getCachedProfiles, setCachedProfile } from './indexedDbCache';
import { getUserProfiles, waitForConnection } from './nostr';
import { parseUserProfile, type UserProfile } from '../utils/userProfileParser';

/** Cache TTL: 24 hours in milliseconds */
const CACHE_TTL = 24 * 60 * 60 * 1000;

/** Module-level in-memory profile cache (newest-wins by createdAt). */
const profileCache = new Map<string, UserProfile>();

function isNewer(incoming: UserProfile, existing: UserProfile | undefined): boolean {
  return !existing || !existing.createdAt || incoming.createdAt >= existing.createdAt;
}

/**
 * Resolve user profiles for the given pubkeys.
 *
 * Returns an Observable that emits an updated `Map<string, UserProfile>`
 * each time a newer profile is discovered. Resolution order:
 *   1. In-memory cache (synchronous)
 *   2. IndexedDB cache (async)
 *   3. Relay subscription (async / streaming)
 *
 * The subscriber receives the *cumulative* map of all resolved profiles
 * (not just the ones requested — only requested keys are fetched, but the
 * emitted map contains all of them found so far).
 *
 * Unsubscribe to clean up the relay subscription.
 */
export function resolveProfiles(pubkeys: string[]): Observable<Map<string, UserProfile>> {
  if (pubkeys.length === 0) return EMPTY;

  const unique = [...new Set(pubkeys)];

  return defer(() => {
    // Snapshot that accumulates results for this call
    const result = new Map<string, UserProfile>();
    const subject = new BehaviorSubject<Map<string, UserProfile>>(result);

    function upsert(profile: UserProfile): boolean {
      const existing = result.get(profile.pubkey);
      if (isNewer(profile, existing)) {
        result.set(profile.pubkey, profile);
        profileCache.set(profile.pubkey, profile);
        return true;
      }
      return false;
    }

    // 1. In-memory cache (sync)
    let uncached: string[] = [];
    for (const pk of unique) {
      const cached = profileCache.get(pk);
      if (cached) {
        result.set(pk, cached);
      } else {
        uncached.push(pk);
      }
    }
    if (result.size > 0) {
      subject.next(new Map(result));
    }

    // 2. IndexedDB cache (async) → 3. Relay (async)
    const pipeline = from(
      getCachedProfiles(uncached).catch(() => new Map()),
    ).pipe(
      tap((idbCached) => {
        let changed = false;
        const now = Date.now();
        for (const [pubkey, { profile, cachedAt }] of idbCached) {
          // Only use cache if it's within TTL (24 hours)
          if (now - cachedAt <= CACHE_TTL) {
            if (upsert(profile)) changed = true;
          }
          // If cache is expired, the pubkey remains in uncached for relay fetch
        }
        if (changed) subject.next(new Map(result));
        uncached = uncached.filter((pk) => !result.has(pk));
      }),
      switchMap(() => {
        if (uncached.length === 0) return EMPTY;

        const { observable, req, filters } = getUserProfiles(uncached);

        return new Observable<void>((subscriber) => {
          const subscription = observable.subscribe({
            next: (packet) => {
              const profile = parseUserProfile(packet.event);
              if (upsert(profile)) {
                setCachedProfile(profile).catch(console.error);
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
      // Do not complete subject — it stays open until unsubscribed
    });

    return subject.asObservable().pipe(
      // Cleanup on unsubscribe
      tap({ unsubscribe: () => pipelineSub.unsubscribe() }),
    );
  });
}

/**
 * Look up a single profile from the in-memory cache (no I/O).
 * Returns undefined if not yet resolved.
 */
export function getCachedProfileSync(pubkey: string): UserProfile | undefined {
  return profileCache.get(pubkey);
}
