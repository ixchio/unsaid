import Ably from 'ably';

let clientInstance: Ably.Realtime | null = null;

/**
 * Get a singleton Ably Realtime client for the browser.
 * Uses the subscribe-only NEXT_PUBLIC key.
 */
export function getAblyClient(): Ably.Realtime | null {
  if (typeof window === 'undefined') return null;

  const key = process.env.NEXT_PUBLIC_ABLY_KEY;
  if (!key) return null;

  if (!clientInstance) {
    clientInstance = new Ably.Realtime({ key, clientId: 'anon' });
  }

  return clientInstance;
}

/**
 * Server-side Ably REST client for publishing.
 */
export function getAblyServer(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  return new Ably.Rest({ key });
}
