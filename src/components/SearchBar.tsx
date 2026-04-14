'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LOCATIONS } from '@/lib/constants';

interface SearchBarProps {
  onSearch: (query: string, zone: string, sort: string) => void;
  currentZone?: string;
}

export default function SearchBar({ onSearch, currentZone }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState('');
  const [sort, setSort] = useState('recent');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(val, zone, sort);
    }, 300);
  }

  function handleZoneChange(val: string) {
    setZone(val);
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
      <button
        className={`search-trigger ${hasFilters ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Search and filter"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        {hasFilters && <span className="search-active-dot" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="search-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
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
                <button className="search-clear" onClick={handleClear}>
                  clear
                </button>
              )}
            </div>

            <div className="search-filters">
              <select
                className="search-select"
                value={zone}
                onChange={(e) => handleZoneChange(e.target.value)}
              >
                <option value="">all zones</option>
                {LOCATIONS.map((g) =>
                  g.locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))
                )}
              </select>

              <div className="search-sort-group">
                {[
                  { key: 'recent', label: 'new' },
                  { key: 'felt', label: 'felt' },
                  { key: 'dying', label: 'dying' },
                ].map((s) => (
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

            {currentZone && !zone && (
              <button
                className="search-zone-quick"
                onClick={() => handleZoneChange(currentZone)}
              >
                only {currentZone}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
