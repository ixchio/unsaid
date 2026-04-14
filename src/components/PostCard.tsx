'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import ReactionPicker from './ReactionPicker';
import ReplyThread from './ReplyThread';
import ShareButton from './ShareButton';
import { timeLeft } from '@/lib/time';
import { POST_START_LIFE_MINUTES, type ReactionType } from '@/lib/constants';

export interface PostData {
  id: string;
  content: string;
  city: string;
  feltCount: number;
  replyCount: number;
  createdAt: string;
  expiresAt: string;
  hasFelt: boolean;
  userReaction?: ReactionType | null;
  reactionBreakdown?: Record<string, number>;
  isOwn?: boolean;
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

  const handleReactionUpdate = useCallback((newCount: number, newExpiresAt?: string) => {
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
  const created = new Date(post.createdAt).getTime();
  const expires = expiresAt.getTime();
  const remaining = expires - now;
  const totalLife = expires - created;
  // use actual total life for bar, capped at reasonable max
  const maxLife = Math.max(POST_START_LIFE_MINUTES * 60000, totalLife);
  const pct = Math.max(0, Math.min(100, (remaining / maxLife) * 100));

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
      <div className="survival-bar-track">
        <motion.div
          className="survival-bar-fill"
          style={{ background: barColor }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <div className="post-content">{post.content}</div>

      <div className="post-bottom-row">
        <div className="post-meta">
          <span>{post.city}</span>
          <span className={isDying ? 'time-dying' : ''}>{timeRemaining}</span>
          {post.isOwn && <span className="own-badge">you</span>}
        </div>

        <div className="post-actions">
          {showBonus && (
            <motion.span
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -18 }}
              transition={{ duration: 1 }}
              className="bonus-float"
            >
              {bonusText}
            </motion.span>
          )}

          <ShareButton postId={post.id} content={post.content} />

          <ReactionPicker
            postId={post.id}
            initialCount={post.feltCount}
            initialReaction={post.userReaction || (post.hasFelt ? 'felt' : null)}
            reactionBreakdown={post.reactionBreakdown}
            variant={variant}
            onUpdate={handleReactionUpdate}
          />
        </div>
      </div>

      <ReplyThread
        postId={post.id}
        replyCount={post.replyCount}
        onLifeExtended={handleReplyExtend}
      />
    </motion.div>
  );
}
