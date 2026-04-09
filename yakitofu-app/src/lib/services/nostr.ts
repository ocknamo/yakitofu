import { createRxBackwardReq, createRxForwardReq, createRxNostr, type EventPacket } from 'rx-nostr';
import { verifier } from 'rx-nostr-crypto';
import type { Subscription } from 'rxjs';
import type { NostrEvent } from '../../types/nostr';

// Create RxNostr instance with Aggressive connection strategy
export const rxNostr = createRxNostr({
  verifier,
  connectionStrategy: 'aggressive',
});

let connectionStateSubscription: Subscription | null = null;
let _connected = false;

// Initialize with relays
export function initializeRelays(
  relays: string[],
  onConnectionChange?: (relay: string, connected: boolean) => void
) {
  rxNostr.setDefaultRelays(relays);
  _connected = false;

  // Clean up existing subscription
  if (connectionStateSubscription) {
    connectionStateSubscription.unsubscribe();
  }

  // Always subscribe to track connection state (also used by waitForConnection)
  connectionStateSubscription = rxNostr.createConnectionStateObservable().subscribe((packet) => {
    console.log('Connection state packet:', packet);
    if (packet.state === 'connected') _connected = true;
    if (onConnectionChange) {
      relays.forEach((relay) => {
        onConnectionChange(relay, packet.state === 'connected');
      });
    }
  });
}

// Publish event to relays
export async function publishEvent(event: NostrEvent): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Publish timeout'));
    }, 10000);

    rxNostr.send(event).subscribe({
      next: (packet) => {
        console.log('Event published:', packet);
      },
      error: (error: Error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      complete: () => {
        clearTimeout(timeoutId);
        resolve();
      },
    });
  });
}

// Subscribe to events (Forward Strategy - for future events)
export function subscribeToEvents(filters: any[]) {
  const req = createRxForwardReq();
  const observable = rxNostr.use(req);

  return { observable, req };
}

// Fetch past events (Backward Strategy - for already published events)
export function fetchPastEvents(filters: any[]) {
  const req = createRxBackwardReq();
  const observable = rxNostr.use(req);

  return { observable, req };
}

// Get user's badge definitions (use Backward Strategy to fetch past badges)
export function getUserBadgeDefinitions(pubkey: string) {
  const filters = [
    {
      kinds: [30009],
      authors: [pubkey],
    },
  ];

  const { observable, req } = fetchPastEvents(filters);

  return { observable, req, filters };
}

// Get a specific badge definition (kind 30009, filtered by author and d tag)
export function getBadgeDefinition(pubkey: string, dTag: string) {
  const filters = [
    {
      kinds: [30009],
      authors: [pubkey],
      '#d': [dTag],
    },
  ];

  const { observable, req } = fetchPastEvents(filters);

  return { observable, req, filters };
}

// Get badge awardee events (kind 8, filtered by a tag)
export function getBadgeAwardees(issuerPubkey: string, dTag: string) {
  const aTag = `30009:${issuerPubkey}:${dTag}`;
  const filters = [
    {
      kinds: [8],
      '#a': [aTag],
    },
  ];

  const { observable, req } = fetchPastEvents(filters);

  return { observable, req, filters };
}

// Get user profiles in bulk (kind 0)
export function getUserProfiles(pubkeys: string[]) {
  const filters = [
    {
      kinds: [0],
      authors: pubkeys,
    },
  ];

  const { observable, req } = fetchPastEvents(filters);

  return { observable, req, filters };
}

// Get badge award events received by a user (kind 8, filtered by p tag)
export function getUserReceivedBadgeAwards(recipientPubkey: string) {
  const filters = [
    {
      kinds: [8],
      '#p': [recipientPubkey],
    },
  ];

  const { observable, req } = fetchPastEvents(filters);

  return { observable, req, filters };
}

// Get profile badges event (kind 10008, and legacy kind 30008 with d=profile_badges)
export function getProfileBadges(pubkey: string) {
  const filters = [
    { kinds: [10008], authors: [pubkey] },
    { kinds: [30008], authors: [pubkey], '#d': ['profile_badges'] },
  ];

  const { observable, req } = fetchPastEvents(filters);

  return { observable, req, filters };
}

// Search badge definitions by dTag across all authors
export function searchBadgesByDTag(dTag: string) {
  const filters = [
    {
      kinds: [30009],
      '#d': [dTag],
    },
  ];

  const { observable, req } = fetchPastEvents(filters);

  return { observable, req, filters };
}

// Wait for at least one relay to be connected (or timeout)
export function waitForConnection(timeoutMs = 3000): Promise<void> {
  if (_connected) return Promise.resolve();
  return new Promise((resolve) => {
    const stateObs = rxNostr.createConnectionStateObservable();
    const sub = stateObs.subscribe((packet) => {
      if (packet.state === 'connected') {
        clearTimeout(timeoutId);
        sub.unsubscribe();
        resolve();
      }
    });
    const timeoutId = setTimeout(() => {
      sub.unsubscribe();
      resolve();
    }, timeoutMs);
  });
}

// Cleanup
export function cleanup() {
  _connected = false;
  if (connectionStateSubscription) {
    connectionStateSubscription.unsubscribe();
    connectionStateSubscription = null;
  }
  rxNostr.dispose();
}
