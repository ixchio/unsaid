'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { POST_MAX_LENGTH } from '@/lib/constants';

const PROMPTS = [
  'kya chal raha hai actually...',
  'the thing you didn\'t say today...',
  'what kept you up last night...',
  'what you wish someone knew...',
  'the text you typed and deleted...',
];

export default function ComposeClient() {
  const [content, setContent] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  const charCount = POST_MAX_LENGTH - content.length;
  const placeholder = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];

  async function handlePost() {
    if (!content.trim() || content.length > POST_MAX_LENGTH) return;

    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() }),
        });

        if (res.ok) {
          router.push('/feed');
        } else {
          const data = await res.json();
          setError(data.error || 'Something went wrong');
        }
      } catch {
        setError('Failed to post. Try again.');
      }
    });
  }

  return (
    <div className="page-wrapper">
      <Header rightAction="cancel" />

      <div className="compose-layout">
        <div />

        <div className="compose-main">
          <div className="compose-prompt">what actually happened today</div>

          <div style={{ borderBottom: '1px solid var(--color-border)' }}>
            <textarea
              className="compose-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              maxLength={POST_MAX_LENGTH + 10}
              autoFocus
            />
          </div>

          {error && (
            <div
              style={{
                padding: '0.75rem 2.5rem',
                fontSize: '0.8rem',
                color: '#cc3333',
              }}
            >
              {error}
            </div>
          )}

          <div className="compose-footer">
            <span
              className={`char-counter ${
                charCount <= 20
                  ? 'danger'
                  : charCount <= 50
                  ? 'warning'
                  : ''
              }`}
            >
              {charCount}
            </span>

            <button
              className="btn-ghost"
              onClick={handlePost}
              disabled={
                !content.trim() ||
                content.length > POST_MAX_LENGTH ||
                isPending
              }
              style={{ opacity: content.trim() ? 1 : 0.3 }}
            >
              {isPending ? '...' : 'post it'}
            </button>
          </div>

          <div className="posting-notice">
            <div className="nobody-icon">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span>
              <strong>posting as nobody.</strong> your name, email, nothing —
              attached to this.
            </span>
          </div>
        </div>

        <div />
      </div>
    </div>
  );
}
