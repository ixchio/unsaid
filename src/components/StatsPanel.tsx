'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Stats {
  totalPosts: number;
  postsAlive: number;
  totalReactions: number;
  totalReplies: number;
  topReaction: string | null;
  longestSurvivor: number; // minutes
}

export default function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="stats-panel">
        <div className="stats-panel-title">your shadow</div>
        <div className="stats-panel-loading">loading...</div>
      </div>
    );
  }

  if (!stats) return null;

  const items = [
    { label: 'posts dropped', value: stats.totalPosts },
    { label: 'still alive', value: stats.postsAlive },
    { label: 'reactions received', value: stats.totalReactions },
    { label: 'whispers received', value: stats.totalReplies },
  ];

  return (
    <div className="stats-panel">
      <div className="stats-panel-title">your shadow</div>
      <div className="stats-panel-subtitle">
        anonymous. but the numbers don&apos;t lie.
      </div>

      <div className="stats-grid">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            className="stats-grid-item"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <span className="stats-grid-value">{item.value}</span>
            <span className="stats-grid-label">{item.label}</span>
          </motion.div>
        ))}
      </div>

      {stats.topReaction && (
        <div className="stats-vibe">
          your vibe: <strong>{stats.topReaction}</strong>
        </div>
      )}

      {stats.longestSurvivor > 0 && (
        <div className="stats-record">
          longest survivor: <strong>{Math.round(stats.longestSurvivor / 60)}h {stats.longestSurvivor % 60}m</strong>
        </div>
      )}
    </div>
  );
}
