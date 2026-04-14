const STORAGE_KEY = 'unsaid-my-posts';

export function trackMyPost(postId: string) {
  if (typeof window === 'undefined') return;
  const ids = getMyPostIds();
  ids.push(postId);
  // keep last 50
  if (ids.length > 50) ids.shift();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function getMyPostIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function isMyPost(postId: string): boolean {
  return getMyPostIds().includes(postId);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendNotification(title: string, body: string, tag?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.hasFocus()) return; // don't notify if tab is active

  new Notification(title, {
    body,
    tag: tag || 'unsaid',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  });
}
