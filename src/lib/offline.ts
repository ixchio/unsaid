const QUEUE_KEY = 'unsaid-offline-queue';

interface QueuedPost {
  content: string;
  timestamp: number;
}

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function queuePost(content: string) {
  const queue = getQueue();
  queue.push({ content, timestamp: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue(): QueuedPost[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export async function flushQueue(): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let sent = 0;
  const remaining: QueuedPost[] = [];

  for (const item of queue) {
    // skip posts older than 1 hour (they'd be stale)
    if (Date.now() - item.timestamp > 60 * 60 * 1000) continue;

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: item.content }),
      });
      if (res.ok) {
        sent++;
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  if (remaining.length > 0) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } else {
    clearQueue();
  }

  return sent;
}

export function setupOnlineListener(callback: (sent: number) => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = async () => {
    const sent = await flushQueue();
    if (sent > 0) callback(sent);
  };

  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
