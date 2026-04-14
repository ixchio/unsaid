'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Ably from 'ably';
import { getAblyClient } from '@/lib/ably';
import { timeAgo } from '@/lib/time';

interface ReplyData {
  id: string;
  content: string;
  createdAt: string;
}

interface ReplyThreadProps {
  postId: string;
  replyCount: number;
  onLifeExtended?: (newExpiresAt: string) => void;
}

export default function ReplyThread({ postId, replyCount, onLifeExtended }: ReplyThreadProps) {
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<ReplyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [count, setCount] = useState(replyCount);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch replies when opened
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/posts/${postId}/replies`)
      .then(r => r.json())
      .then(data => {
        setReplies(data.replies || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, postId]);

  // Subscribe to real-time new replies
  useEffect(() => {
    const ably = getAblyClient();
    if (!ably) return;

    const channel = ably.channels.get(`replies:${postId}`);

    const onNew = (msg: Ably.InboundMessage) => {
      if (msg.data?.id) {
        setReplies(prev => {
          if (prev.some(r => r.id === msg.data.id)) return prev;
          return [...prev, msg.data as ReplyData];
        });
        setCount(c => c + 1);
      }
    };

    channel.subscribe('new', onNew);
    return () => {
      channel.unsubscribe('new', onNew);
    };
  }, [postId]);

  async function handleSend() {
    if (!content.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setReplies(prev => [...prev, { id: data.id, content: data.content, createdAt: data.createdAt }]);
        setCount(c => c + 1);
        setContent('');
        if (data.expiresAt && onLifeExtended) {
          onLifeExtended(data.expiresAt);
        }
      }
    } catch {
      // silent fail
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="reply-thread-wrap">
      <button
        className="reply-toggle"
        onClick={() => {
          setOpen(!open);
          if (!open) setTimeout(() => inputRef.current?.focus(), 100);
        }}
      >
        {count > 0 ? `${count} ${count === 1 ? 'whisper' : 'whispers'}` : 'whisper'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="reply-thread"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {loading ? (
              <div className="reply-loading">loading...</div>
            ) : replies.length === 0 ? (
              <div className="reply-empty">no whispers yet. be the first.</div>
            ) : (
              <div className="reply-list">
                {replies.map((reply) => (
                  <div key={reply.id} className="reply-item">
                    <span className="reply-content">{reply.content}</span>
                    <span className="reply-time">{timeAgo(new Date(reply.createdAt))}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="reply-input-row">
              <input
                ref={inputRef}
                type="text"
                className="reply-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="whisper back..."
                maxLength={200}
                disabled={sending}
              />
              <button
                className="reply-send"
                onClick={handleSend}
                disabled={!content.trim() || sending}
              >
                {sending ? '...' : 'send'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
