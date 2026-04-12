'use client';

import { motion } from 'framer-motion';
import FeltButton from './FeltButton';
import { timeLeft } from '@/lib/time';

export interface PostData {
  id: string;
  content: string;
  city: string;
  feltCount: number;
  createdAt: string;
  expiresAt: string;
  hasFelt: boolean;
}

interface PostCardProps {
  post: PostData;
  variant?: 'light' | 'dark';
}

export default function PostCard({ post, variant = 'light' }: PostCardProps) {
  const remaining = timeLeft(new Date(post.expiresAt));

  return (
    <motion.div
      className="post-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      layout
    >
      <div className="post-content">
        {post.content}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="post-meta">
          <span>{post.city}</span>
          <span>{remaining}</span>
        </div>

        <FeltButton
          postId={post.id}
          initialCount={post.feltCount}
          initialFelt={post.hasFelt}
          variant={variant}
        />
      </div>
    </motion.div>
  );
}
