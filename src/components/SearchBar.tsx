'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LOCATIONS } from '@/lib/constants';

interface SearchBarProps {
  onSearch: (query: string, zone: string, sort: string) => void;
  currentZone?: string;
}

const SORT_OPTIONS = [
  { key: 'recent', label: 'new' },
  { key: 'felt', label: 'felt' },
  { key: 'dying', label: 'dying' },
] as const;

const ALL_ZONES = LOCATIONS.flatMap(g => g.locations);

export default function SearchBar({ onSearch, currentZone }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState('');
  const [sort, setSort] = useState('recent');
  const [zoneOpen, setZoneOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // close zone dropdown on outside click
  useEffect(() => {
    if (!zoneOpen) return;
    const handler = (e: MouseEvent) => {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) {
        setZoneOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [zoneOpen]);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(val, zone, sort);
    }, 300);
  }

  function handleZoneChange(val: string) {
    setZone(val);
    setZoneOpen(false);
    onSearch(query, val, sort);
  }

  function handleSortChange(val: string) {
    setSort(val);
    onSearch(query, zone, val);
  }

  function handleClear() {
    setQuery('');
    setZone('');
    setSort('recent');
    onSearch('', '', 'recent');
    setOpen(false);
  }

  const hasFilters = query || zone || sort !== 'recent';

  return (
    <div className="search-bar-wrap">
      {/* collapsed: just a subtle trigger row */}
      <button
        className="search-trigger-bar"
        onClick={() => setOpen(!open)}
        aria-label="Search and filter"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>{hasFilters ? (zone || query || sort !== 'recent' ? 'filtered' : 'search') : 'search & filter'}</span>
        {hasFilters && <span className="search-active-dot" />}
      </button>

      {/* expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="search-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {/* search input */}
            <div className="search-input-row">
              <input
                ref={inputRef}
                type="text"
                className="search-input"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="search posts..."
                autoComplete="off"
              />
              {hasFilters && (
                <button className="search-clear" onClick={handleClear}>clear</button>
              )}
            </div>

            {/* filters row */}
            <div className="search-filters">
              {/* custom zone dropdown */}
              <div className="zone-dropdown" ref={zoneRef}>
                <button
                  className="zone-dropdown-trigger"
                  onClick={() => setZoneOpen(!zoneOpen)}
                >
                  <span>{zone || 'all zones'}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                <AnimatePresence>
                  {zoneOpen && (
                    <motion.div
                      className="zone-dropdown-menu"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                    >
                      <button
                        className={`zone-dropdown-item ${!zone ? 'active' : ''}`}
                        onClick={() => handleZoneChange('')}
                      >
                        all zones
                      </button>
                      {currentZone && (
                        <button
                          className={`zone-dropdown-item highlight ${zone === currentZone ? 'active' : ''}`}
                          onClick={() => handleZoneChange(currentZone)}
                        >
                          {currentZone} <span className="zone-you">· you</span>
                        </button>
                      )}
                      <div className="zone-dropdown-divider" />
                      {ALL_ZONES.map((z) => (
                        <button
                          key={z}
                          className={`zone-dropdown-item ${zone === z ? 'active' : ''}`}
                          onClick={() => handleZoneChange(z)}
                        >
                          {z}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* sort buttons */}
              <div className="search-sort-group">
                {SORT_OPTIONS.map((s) => (
                  <button
                    key={s.key}
                    className={`search-sort-btn ${sort === s.key ? 'active' : ''}`}
                    onClick={() => handleSortChange(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
