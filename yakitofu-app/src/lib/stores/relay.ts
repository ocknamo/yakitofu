import { writable } from 'svelte/store';

export interface RelayState {
  relays: string[];
  connected: Set<string>;
}

const DEFAULT_RELAYS = ['wss://yabu.me', 'wss://relay.damus.io', 'wss://r.kojira.io', 'wss://nostr.bitcoiner.social', 'wss://nostr.land', 'wss://nostr.mom'];

function createRelayStore() {
  const { subscribe, set, update } = writable<RelayState>({
    relays: [...DEFAULT_RELAYS],
    connected: new Set(),
  });

  return {
    subscribe,
    addRelay: (relay: string) => {
      update(state => {
        if (!state.relays.includes(relay)) {
          return {
            ...state,
            relays: [...state.relays, relay],
          };
        }
        return state;
      });
    },
    removeRelay: (relay: string) => {
      update(state => ({
        ...state,
        relays: state.relays.filter(r => r !== relay),
        connected: new Set([...state.connected].filter(r => r !== relay)),
      }));
    },
    setConnected: (relay: string, connected: boolean) => {
      update(state => {
        const newConnected = new Set(state.connected);
        if (connected) {
          newConnected.add(relay);
        } else {
          newConnected.delete(relay);
        }
        return {
          ...state,
          connected: newConnected,
        };
      });
    },
    reset: () => {
      set({
        relays: [...DEFAULT_RELAYS],
        connected: new Set(),
      });
    },
  };
}

export const relayStore = createRelayStore();
