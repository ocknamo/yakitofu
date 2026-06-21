import { NosskeyIframeClient } from 'nosskey-iframe';
import { get } from 'svelte/store';
import { languageStore } from '../stores/i18n';

// URL of the Nosskey signing iframe (nosskey.app). The iframe exposes a
// NIP-07 compatible API (getPublicKey / signEvent / ...) over postMessage.
const NOSSKEY_IFRAME_URL = 'https://nosskey.app/#/iframe';

const CONTAINER_CLASS = 'nosskey-iframe-container';

let client: NosskeyIframeClient | null = null;
let container: HTMLDivElement | null = null;
let readyPromise: Promise<NosskeyIframeClient> | null = null;

function createContainer(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = CONTAINER_CLASS;
  document.body.appendChild(el);
  return el;
}

/**
 * Lazily create the NosskeyIframeClient, mount its iframe into a fixed-position
 * container, and wait until it signals ready. Subsequent calls reuse the same
 * client. The iframe element manages its own visibility (display none/block)
 * based on iframe-initiated `nosskey:visibility` messages.
 */
export async function getNosskeyClient(): Promise<NosskeyIframeClient> {
  if (client) return client;
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    container = createContainer();
    const lang = get(languageStore); // 'en' | 'ja'
    const c = new NosskeyIframeClient({
      iframeUrl: NOSSKEY_IFRAME_URL,
      container,
      theme: 'auto',
      lang: lang === 'ja' || lang === 'en' ? lang : 'auto',
    });
    await c.ready();
    client = c;
    return c;
  })();

  try {
    return await readyPromise;
  } catch (error) {
    // Allow a later retry after a failed initialization.
    destroyNosskeyClient();
    throw error;
  }
}

/** Tear down the client and remove the iframe container from the DOM. */
export function destroyNosskeyClient(): void {
  client?.destroy();
  client = null;
  readyPromise = null;
  container?.remove();
  container = null;
}
