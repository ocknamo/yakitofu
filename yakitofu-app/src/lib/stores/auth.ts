import { writable } from 'svelte/store';
import { destroyNosskeyClient, getNosskeyClient } from '../services/nosskey';

export type LoginMethod = 'nip07' | 'nosskey';

export interface AuthState {
  isLoggedIn: boolean;
  pubkey: string | null;
  hasNostrExtension: boolean;
  method: LoginMethod | null;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    isLoggedIn: false,
    pubkey: null,
    hasNostrExtension: false,
    method: null,
  });

  return {
    subscribe,
    // Login via NIP-07 browser extension (window.nostr).
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
          method: 'nip07',
        }));
        return pubkey;
      } catch (error) {
        throw new Error(`Failed to login: ${error}`);
      }
    },
    // Login via the Nosskey iframe (nosskey.app passkey account).
    loginNosskey: async () => {
      const client = await getNosskeyClient();
      const pubkey = await client.getPublicKey();
      update((state) => ({
        ...state,
        isLoggedIn: true,
        pubkey,
        method: 'nosskey',
      }));
      return pubkey;
    },
    logout: () => {
      destroyNosskeyClient();
      set({
        isLoggedIn: false,
        pubkey: null,
        hasNostrExtension: !!window.nostr,
        method: null,
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
