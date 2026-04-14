'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import FeltButton from './FeltButton';
import ReplyThread from './ReplyThread';
import { timeLeft } from '@/lib/time';
import { POST_START_LIFE_MINUTES } from '@/lib/constants';

export interface PostData {
  id: string;
  content: string;
  city: string;
  feltCount: number;
  replyCount: number;
  createdAt: string;
  expiresAt: string;
  hasFelt: boolean;
}

interface PostCardProps {
  post: PostData;
  variant?: 'light' | 'dark';
}

export default function PostCard({ post, variant = 'light' }: PostCardProps) {
  const [expiresAt, setExpiresAt] = useState<Date>(new Date(post.expiresAt));
  const [timeRemaining, setTimeRemaining] = useState(() => timeLeft(expiresAt));
  const [showBonus, setShowBonus] = useState(false);
  const [bonusText, setBonusText] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(timeLeft(expiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleFeltUpdate = useCallback((newCount: number, newExpiresAt?: string) => {
    if (newExpiresAt) {
      const oldTime = expiresAt.getTime();
      const newTime = new Date(newExpiresAt).getTime();
      setExpiresAt(new Date(newExpiresAt));
      setTimeRemaining(timeLeft(new Date(newExpiresAt)));

      if (newTime > oldTime) {
        setBonusText('+10m');
        setShowBonus(true);
        setTimeout(() => setShowBonus(false), 1200);
      }
    }
  }, [expiresAt]);

  const handleReplyExtend = useCallback((newExpiresAt: string) => {
    const oldTime = expiresAt.getTime();
    const newTime = new Date(newExpiresAt).getTime();
    setExpiresAt(new Date(newExpiresAt));
    setTimeRemaining(timeLeft(new Date(newExpiresAt)));

    if (newTime > oldTime) {
      setBonusText('+5m');
      setShowBonus(true);
      setTimeout(() => setShowBonus(false), 1200);
    }
  }, [expiresAt]);

  const now = Date.now();
  const expires = expiresAt.getTime();
  const remaining = expires - now;
  const pct = Math.max(0, Math.min(100, (remaining / (POST_START_LIFE_MINUTES * 60000)) * 100));

  const isDying = remaining < 5 * 60 * 1000 && remaining > 0;
  const isDead = remaining <= 0;

  let barColor = '#22c55e';
  if (pct < 50) barColor = '#eab308';
  if (pct < 20) barColor = '#dc2626';

  if (isDead) return null;

  return (
    <motion.div
      className={`post-card ${isDying ? 'dying' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      layout
    >
      {/* Survival bar */}
      <div
        style={{
          width: '100%',
          height: 3,
          background: variant === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          marginBottom: '1rem',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <motion.div
          style={{
            height: '100%',
            background: barColor,
            borderRadius: 2,
          }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <div className="post-content">
        {post.content}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div className="post-meta">
          <span>{post.city}</span>
          <span className={isDying ? 'time-dying' : ''}>{timeRemaining}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
          {showBonus && (
            <motion.span
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -18 }}
              transition={{ duration: 1 }}
              style={{
                position: 'absolute',
                top: -6,
                right: 0,
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#22c55e',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {bonusText}
            </motion.span>
          )}

          <FeltButton
            postId={post.id}
            initialCount={post.feltCount}
            initialFelt={post.hasFelt}
            variant={variant}
            onUpdate={handleFeltUpdate}
          />
        </div>
      </div>

      {/* Whisper replies */}
      <ReplyThread
        postId={post.id}
        replyCount={post.replyCount}
        onLifeExtended={handleReplyExtend}
      />
    </motion.div>
  );
}
