'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PostCard, { PostData } from '@/components/PostCard';
import Header from '@/components/Header';
import Link from 'next/link';

export default function FeedClient({ userCity }: { userCity: string }) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [trending, setTrending] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dyingCount, setDyingCount] = useState(0);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setTrending(data.trending || []);
      }
    } catch (e) {
      console.error('Failed to fetch posts:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 30000);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  // Track dying posts every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const dying = posts.filter(p => {
        const remaining = new Date(p.expiresAt).getTime() - now;
        return remaining > 0 && remaining < 5 * 60 * 1000;
      });
      setDyingCount(dying.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [posts]);

  const hasAnyPosts = posts.length > 0 || trending.length > 0;

  return (
    <div className="page-wrapper">
      <Header city={userCity} />

      {/* Dying posts alert banner */}
      <AnimatePresence>
        {dyingCount > 0 && (
          <motion.div
            className="dying-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <span className="dying-banner-dot" />
            {dyingCount} {dyingCount === 1 ? 'post is' : 'posts are'} about to die — keep them alive
          </motion.div>
        )}
      </AnimatePresence>

      <div className="feed-layout">
        <div className="feed-sidebar-left" />

        <div className="feed-main">
          {loading ? (
            <div className="empty-state">
              <div className="skeleton" style={{ height: 16, width: '80%', margin: '0 auto 12px' }} />
              <div className="skeleton" style={{ height: 16, width: '60%', margin: '0 auto 12px' }} />
              <div className="skeleton" style={{ height: 16, width: '40%', margin: '0 auto' }} />
            </div>
          ) : !hasAnyPosts ? (
            <div className="empty-state">
              <p>
                nobody gives a fuck yet.
                <br />
                drop something and start the clock.
              </p>
            </div>
          ) : (
            <>
              {posts.length > 0 && (
                <div>
                  <div className="thread-label" style={{ color: 'var(--color-muted)', paddingBottom: '0.5rem' }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--color-text)',
                        flexShrink: 0,
                      }}
                    />
                    lpu campus — survival feed
                  </div>
                  <AnimatePresence mode="popLayout">
                    {posts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {trending.length > 0 && (
                <div className="city-thread">
                  <div
                    className="thread-label"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#fff',
                        flexShrink: 0,
                      }}
                    />
                    campus legends
                  </div>

                  <AnimatePresence mode="popLayout">
                    {trending.map((post) => (
                      <PostCard key={post.id} post={post} variant="dark" />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>

        <div className="feed-sidebar-right" />
      </div>

      <Link href="/compose" className="compose-fab" aria-label="Write something">
        +
      </Link>
    </div>
  );
}
