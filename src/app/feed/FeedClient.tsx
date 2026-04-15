'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Ably from 'ably';
import PostCard, { PostData } from '@/components/PostCard';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import Link from 'next/link';
import { getAblyClient } from '@/lib/ably';
import { requestNotificationPermission, sendNotification, getMyPostIds } from '@/lib/notifications';

export default function FeedClient({ userCity }: { userCity: string }) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [trending, setTrending] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [trendingHasMore, setTrendingHasMore] = useState(false);
  const [dyingCount, setDyingCount] = useState(0);
  const [feedError, setFeedError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchZone, setSearchZone] = useState('');
  const [searchSort, setSearchSort] = useState('recent');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isSearching = searchQuery || searchZone || searchSort !== 'recent';

  const buildUrl = useCallback((cursor?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (searchQuery) params.set('q', searchQuery);
    if (searchZone) params.set('zone', searchZone);
    if (searchSort !== 'recent') params.set('sort', searchSort);
    return `/api/posts?${params.toString()}`;
  }, [searchQuery, searchZone, searchSort]);

  const fetchPosts = useCallback(async (append = false, cursor?: string) => {
    if (append) setLoadingMore(true);
    else setFeedError('');
    try {
      const res = await fetch(buildUrl(cursor));
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setPosts(prev => [...prev, ...(data.posts || [])]);
        } else {
          setPosts(data.posts || []);
          setTrending(data.trending || []);
          setTrendingHasMore(data.trendingHasMore || false);
        }
        setHasMore(data.hasMore || false);
        setFeedError('');
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Feed API error:', res.status, data);
        if (!append) setFeedError(data.error || 'failed to load feed.');
      }
    } catch (e) {
      console.error('Failed to fetch posts:', e);
      if (!append) setFeedError('network error. check your connection.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildUrl]);

  // initial fetch + refresh on search change
  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  // infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore) {
          const lastPost = posts[posts.length - 1];
          if (lastPost) fetchPosts(true, lastPost.id);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, posts, fetchPosts]);

  // real-time: subscribe to new posts via Ably
  useEffect(() => {
    const ably = getAblyClient();
    if (!ably) return;

    const channel = ably.channels.get('feed:global');
    const onNewPost = (msg: Ably.InboundMessage) => {
      if (msg.data?.id) {
        setPosts(prev => {
          if (prev.some(p => p.id === msg.data.id)) return prev;
          return [msg.data as PostData, ...prev];
        });
      }
    };

    channel.subscribe('new-post', onNewPost);
    return () => { channel.unsubscribe('new-post', onNewPost); };
  }, []);

  // notifications: request permission + watch for reactions on own posts
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const ably = getAblyClient();
    if (!ably) return;

    const myPostIds = getMyPostIds();
    const channels: Ably.RealtimeChannel[] = [];

    for (const pid of myPostIds.slice(-10)) {
      const ch = ably.channels.get(`felt:${pid}`);
      const handler = (msg: Ably.InboundMessage) => {
        if (msg.data?.feltCount) {
          sendNotification('unsaid', `someone reacted to your post (${msg.data.feltCount} total)`, `felt-${pid}`);
        }
      };
      ch.subscribe('update', handler);
      channels.push(ch);
    }

    return () => {
      channels.forEach(ch => ch.unsubscribe());
    };
  }, []);

  // dying posts counter
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const dying = posts.filter(p => {
        const remaining = new Date(p.expiresAt).getTime() - now;
        return remaining > 0 && remaining < 5 * 60 * 1000;
      });
      setDyingCount(dying.length);

      // notify about dying own posts
      const myPostIds = getMyPostIds();
      dying.forEach(p => {
        if (myPostIds.includes(p.id)) {
          const remaining = new Date(p.expiresAt).getTime() - now;
          if (remaining > 0 && remaining < 2 * 60 * 1000) {
            sendNotification('unsaid', 'your post is about to die. nobody is keeping it alive.', `dying-${p.id}`);
          }
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [posts]);

  function handleSearch(query: string, zone: string, sort: string) {
    setSearchQuery(query);
    setSearchZone(zone);
    setSearchSort(sort);
  }

  const hasAnyPosts = posts.length > 0 || trending.length > 0;

  return (
    <div className="page-wrapper">
      <Header city={userCity} />

      {/* Dying posts alert banner */}
      <AnimatePresence>
        {dyingCount > 0 && !isSearching && (
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
          {/* Search inside feed column */}
          <SearchBar onSearch={handleSearch} currentZone={userCity} />

          <ErrorBoundary>
            {loading ? (
              <div className="empty-state">
                <div className="skeleton" style={{ height: 16, width: '80%', margin: '0 auto 12px' }} />
                <div className="skeleton" style={{ height: 16, width: '60%', margin: '0 auto 12px' }} />
                <div className="skeleton" style={{ height: 16, width: '40%', margin: '0 auto' }} />
              </div>
            ) : feedError ? (
              <div className="empty-state">
                <p style={{ color: '#f87171' }}>{feedError}</p>
                <button
                  className="btn-ghost"
                  style={{ marginTop: '1rem' }}
                  onClick={() => { setLoading(true); fetchPosts(); }}
                >
                  try again
                </button>
              </div>
            ) : !hasAnyPosts ? (
              <div className="empty-state">
                <p>
                  {isSearching ? 'nothing matches.' : 'nobody gives a fuck yet.'}
                  <br />
                  {isSearching ? 'try different filters.' : 'drop something and start the clock.'}
                </p>
              </div>
            ) : (
              <>
                {/* Survival feed — always visible */}
                <div>
                  <div className="thread-label" style={{ color: 'var(--color-muted)', paddingBottom: '0.5rem' }}>
                    <span className="thread-dot" />
                    {isSearching ? 'search results' : 'lpu campus — survival feed'}
                  </div>

                  {posts.length > 0 ? (
                    <>
                      <AnimatePresence mode="popLayout">
                        {posts.map((post) => (
                          <PostCard key={post.id} post={post} />
                        ))}
                      </AnimatePresence>

                      {/* infinite scroll sentinel */}
                      <div ref={sentinelRef} className="scroll-sentinel">
                        {loadingMore && (
                          <div className="loading-more">
                            <div className="skeleton" style={{ height: 12, width: '50%', margin: '0 auto' }} />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="feed-empty-state">
                      <p className="feed-empty-text">
                        {isSearching ? 'nothing matches your filters.' : 'the feed is quiet right now.'}
                      </p>
                      {!isSearching && (
                        <Link href="/compose" className="feed-empty-cta">
                          break the silence
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {/* Campus legends */}
                {trending.length > 0 && !isSearching && (
                  <div className="city-thread">
                    <div className="thread-label" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      <span className="thread-dot light" />
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
          </ErrorBoundary>
        </div>

        <div className="feed-sidebar-right" />
      </div>

      <Link href="/compose" className="compose-fab" aria-label="Write something">
        +
      </Link>
    </div>
  );
}
