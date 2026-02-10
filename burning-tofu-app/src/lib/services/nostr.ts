import { createRxNostr, createRxForwardReq, createRxBackwardReq, type EventPacket } from 'rx-nostr';
import { verifier } from 'rx-nostr-crypto';
import type { NostrEvent } from '../../types/nostr';

// Create RxNostr instance with Aggressive connection strategy
export const rxNostr = createRxNostr({ 
  verifier,
  connectionStrategy: 'aggressive'
});

// Initialize with relays
export function initializeRelays(relays: string[], onConnectionChange?: (relay: string, connected: boolean) => void) {
  rxNostr.setDefaultRelays(relays);
  
  // Subscribe to connection state changes if callback provided
  if (onConnectionChange) {
    rxNostr.createConnectionStateObservable().subscribe((packet) => {
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

// Cleanup
export function cleanup() {
  rxNostr.dispose();
}
