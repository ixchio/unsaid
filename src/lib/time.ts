/** Human-friendly time remaining string */
export function timeLeft(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  if (diff <= 0) return 'gone';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    if (minutes > 0) return `${hours}h ${minutes}m left`;
    return `${hours}h left`;
  }
  
  if (minutes >= 5) {
    return `${minutes}m left`;
  }
  
  // Under 5 minutes: Intense mode
  const ms = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  return `${ms}:${ss} left`;
}

/** Format a Date as relative time for display */
export function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
