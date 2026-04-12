'use client';

import { useState, useEffect } from 'react';
import Ably from 'ably';
import { getAblyClient } from '@/lib/ably';

interface FeltButtonProps {
  postId: string;
  initialCount: number;
  initialFelt: boolean;
  variant?: 'light' | 'dark';
}

export default function FeltButton({
  postId,
  initialCount,
  initialFelt,
}: FeltButtonProps) {
  const [felt, setFelt] = useState(initialFelt);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to real-time felt count updates via Ably
  useEffect(() => {
    const ably = getAblyClient();
    if (!ably) return;

    const channel = ably.channels.get(`felt:${postId}`);

    const onUpdate = (msg: Ably.InboundMessage) => {
      if (msg.data && typeof msg.data.feltCount === 'number') {
        setCount(msg.data.feltCount);
      }
    };

    channel.subscribe('update', onUpdate);

    return () => {
      channel.unsubscribe('update', onUpdate);
    };
  }, [postId]);

  async function handleFelt() {
    if (isLoading) return;

    // Optimistic update
    const prevFelt = felt;
    const prevCount = count;
    setFelt(!felt);
    setCount((c) => (felt ? c - 1 : c + 1));
    setIsLoading(true);

    try {
      const res = await fetch(`/api/posts/${postId}/felt`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setFelt(data.felt);
        setCount(data.feltCount);
      } else {
        setFelt(prevFelt);
        setCount(prevCount);
      }
    } catch {
      setFelt(prevFelt);
      setCount(prevCount);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      className={`felt-btn ${felt ? 'felt-active' : ''}`}
      onClick={handleFelt}
      disabled={isLoading}
      aria-label={felt ? 'unfelt this' : 'felt this'}
    >
      <span className="felt-dot" />
      <span>{count}</span>
      <span>felt this</span>
    </button>
  );
}
