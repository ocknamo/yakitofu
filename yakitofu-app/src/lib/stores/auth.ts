import { writable } from 'svelte/store';

export interface AuthState {
  isLoggedIn: boolean;
  pubkey: string | null;
  hasNostrExtension: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    isLoggedIn: false,
    pubkey: null,
    hasNostrExtension: false,
  });

  return {
    subscribe,
    login: async () => {
      if (!window.nostr) {
        throw new Error('Nostr extension not found');
      }
      try {
        const pubkey = await window.nostr.getPublicKey();
        update((state) => ({
          ...state,
          isLoggedIn: true,
          pubkey,
          hasNostrExtension: true,
        }));
        return pubkey;
      } catch (error) {
        throw new Error(`Failed to login: ${error}`);
      }
    },
    logout: () => {
      set({
        isLoggedIn: false,
        pubkey: null,
        hasNostrExtension: !!window.nostr,
      });
    },
    checkExtension: () => {
      update((state) => ({
        ...state,
        hasNostrExtension: typeof window !== 'undefined' && !!window.nostr,
      }));
    },
  };
}

export const authStore = createAuthStore();
