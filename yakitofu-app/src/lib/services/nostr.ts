import {
  createRxNostr,
  createRxForwardReq,
  createRxBackwardReq,
  type EventPacket,
} from 'rx-nostr';
import { verifier } from 'rx-nostr-crypto';
import type { NostrEvent } from '../../types/nostr';
import type { Subscription } from 'rxjs';

// Create RxNostr instance with Aggressive connection strategy
export const rxNostr = createRxNostr({
  verifier,
  connectionStrategy: 'aggressive',
});

let connectionStateSubscription: Subscription | null = null;

// Initialize with relays
export function initializeRelays(
  relays: string[],
  onConnectionChange?: (relay: string, connected: boolean) => void
) {
  rxNostr.setDefaultRelays(relays);

  // Clean up existing subscription
  if (connectionStateSubscription) {
    connectionStateSubscription.unsubscribe();
  }

  // Subscribe to connection state changes if callback provided
  if (onConnectionChange) {
    connectionStateSubscription = rxNostr.createConnectionStateObservable().subscribe((packet) => {
      console.log('Connection state packet:', packet);
      // According to rx-nostr docs, packet.state is the connection state string
      // We need to check all relays
      relays.forEach((relay) => {
        // For now, mark all as connected when we get any state update
        // This is a simplified approach - ideally we'd track individual relay states
        onConnectionChange(relay, packet.state === 'connected');
      });
    });
  }
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

// Wait for at least one relay to be connected (or timeout)
export function waitForConnection(timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    const stateObs = rxNostr.createConnectionStateObservable();
    const timeoutId = setTimeout(resolve, timeoutMs);
    const sub = stateObs.subscribe((packet) => {
      if (packet.state === 'connected') {
        clearTimeout(timeoutId);
        sub.unsubscribe();
        resolve();
      }
    });
  });
}

// Cleanup
export function cleanup() {
  if (connectionStateSubscription) {
    connectionStateSubscription.unsubscribe();
    connectionStateSubscription = null;
  }
  rxNostr.dispose();
}
