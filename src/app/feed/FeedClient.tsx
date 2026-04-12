'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import PostCard, { PostData } from '@/components/PostCard';
import Header from '@/components/Header';
import Link from 'next/link';

export default function FeedClient({ userCity }: { userCity: string }) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [national, setNational] = useState<PostData[]>([]);
  const [trending, setTrending] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setNational(data.national || []);
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

  const hasAnyPosts = posts.length > 0 || national.length > 0 || trending.length > 0;

  return (
    <div className="page-wrapper">
      <Header city={userCity} />

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
                nothing here yet.
                <br />
                be the first to say the unsaid thing.
              </p>
            </div>
          ) : (
            <>
              {/* Your city posts */}
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
                    {userCity.toLowerCase()}
                  </div>
                  <AnimatePresence mode="popLayout">
                    {posts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* National — posts from all other cities */}
              {national.length > 0 && (
                <div>
                  <div className="thread-label" style={{ color: 'var(--color-muted)', paddingTop: '1.5rem', paddingBottom: '0.5rem' }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--color-muted)',
                        flexShrink: 0,
                      }}
                    />
                    across india
                  </div>
                  <AnimatePresence mode="popLayout">
                    {national.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Everyone felt this — the black zone */}
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
                    everyone felt this
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

      {/* Compose FAB */}
      <Link href="/compose" className="compose-fab" aria-label="Write something">
        +
      </Link>
    </div>
  );
}
