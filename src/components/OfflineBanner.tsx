'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getQueue, setupOnlineListener } from '@/lib/offline';

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [flushedMsg, setFlushedMsg] = useState('');

  useEffect(() => {
    setOnline(navigator.onLine);
    setQueueCount(getQueue().length);

    const onOffline = () => { setOnline(false); };
    const onOnline = () => { setOnline(true); };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    const cleanup = setupOnlineListener((sent) => {
      setQueueCount(getQueue().length);
      setFlushedMsg(`${sent} queued post${sent > 1 ? 's' : ''} sent`);
      setTimeout(() => setFlushedMsg(''), 3000);
    });

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      cleanup();
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          className="offline-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
        >
          <span className="offline-dot" />
          offline — posts will queue until you&apos;re back
          {queueCount > 0 && <span className="offline-count">{queueCount} queued</span>}
        </motion.div>
      )}
      {flushedMsg && (
        <motion.div
          className="online-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
        >
          ✓ {flushedMsg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
