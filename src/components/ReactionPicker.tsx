'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Ably from 'ably';
import { getAblyClient } from '@/lib/ably';
import { REACTION_TYPES, type ReactionType } from '@/lib/constants';

interface ReactionPickerProps {
  postId: string;
  initialCount: number;
  initialReaction: ReactionType | null;
  reactionBreakdown?: Record<string, number>;
  variant?: 'light' | 'dark';
  onUpdate?: (newCount: number, newExpiresAt?: string) => void;
}

export default function ReactionPicker({
  postId,
  initialCount,
  initialReaction,
  reactionBreakdown: initialBreakdown,
  variant = 'light',
  onUpdate,
}: ReactionPickerProps) {
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(initialReaction);
  const [count, setCount] = useState(initialCount);
  const [breakdown, setBreakdown] = useState<Record<string, number>>(initialBreakdown || {});
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // close picker on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  // subscribe to real-time updates
  useEffect(() => {
    const ably = getAblyClient();
    if (!ably) return;

    const channel = ably.channels.get(`felt:${postId}`);
    const onAblyUpdate = (msg: Ably.InboundMessage) => {
      if (msg.data && typeof msg.data.feltCount === 'number') {
        setCount(msg.data.feltCount);
        if (msg.data.breakdown) setBreakdown(msg.data.breakdown);
        if (onUpdate) onUpdate(msg.data.feltCount, msg.data.expiresAt);
      }
    };

    channel.subscribe('update', onAblyUpdate);
    return () => { channel.unsubscribe('update', onAblyUpdate); };
  }, [postId, onUpdate]);

  async function handleReaction(type: ReactionType) {
    if (isLoading) return;

    const prevReaction = currentReaction;
    const prevCount = count;
    const isToggleOff = currentReaction === type;

    // optimistic
    setCurrentReaction(isToggleOff ? null : type);
    setCount(c => isToggleOff ? c - 1 : (prevReaction ? c : c + 1));
    setExpanded(false);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/posts/${postId}/felt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: isToggleOff ? currentReaction : type }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentReaction(data.felt ? data.type : null);
        setCount(data.feltCount);
        if (data.breakdown) setBreakdown(data.breakdown);
        if (onUpdate && data.expiresAt) onUpdate(data.feltCount, data.expiresAt);
      } else {
        setCurrentReaction(prevReaction);
        setCount(prevCount);
      }
    } catch {
      setCurrentReaction(prevReaction);
      setCount(prevCount);
    } finally {
      setIsLoading(false);
    }
  }

  const activeReaction = REACTION_TYPES.find(r => r.key === currentReaction);
  const isDark = variant === 'dark';

  // top 3 reaction types for mini breakdown display
  const topReactions = Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="reaction-picker-wrap" ref={pickerRef}>
      {/* main button */}
      <button
        className={`felt-btn ${currentReaction ? 'felt-active' : ''} ${isDark ? 'dark' : ''}`}
        onClick={() => currentReaction ? handleReaction(currentReaction) : setExpanded(!expanded)}
        onContextMenu={(e) => { e.preventDefault(); setExpanded(!expanded); }}
        disabled={isLoading}
        aria-label={currentReaction ? `remove ${currentReaction} reaction` : 'react'}
      >
        {activeReaction ? (
          <>
            <span className="reaction-icon">{activeReaction.icon}</span>
            <span>{count}</span>
            <span>{activeReaction.label}</span>
          </>
        ) : (
          <>
            <span className="felt-dot" />
            <span>{count}</span>
            <span>react</span>
          </>
        )}
      </button>

      {/* mini breakdown badges */}
      {topReactions.length > 1 && (
        <div className="reaction-breakdown">
          {topReactions.map(([key, val]) => {
            const rt = REACTION_TYPES.find(r => r.key === key);
            if (!rt) return null;
            return (
              <span key={key} className="reaction-badge" title={`${val} ${rt.label}`}>
                {rt.icon === '·' ? '·' : rt.icon}{val}
              </span>
            );
          })}
        </div>
      )}

      {/* expanded picker */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className={`reaction-panel ${isDark ? 'dark' : ''}`}
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {REACTION_TYPES.map((r) => (
              <button
                key={r.key}
                className={`reaction-option ${currentReaction === r.key ? 'active' : ''}`}
                onClick={() => handleReaction(r.key as ReactionType)}
                disabled={isLoading}
                title={r.label}
              >
                <span className="reaction-option-icon">{r.icon === '·' ? '●' : r.icon}</span>
                <span className="reaction-option-label">{r.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
