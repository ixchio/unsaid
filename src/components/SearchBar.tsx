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

export default function SearchBar({ onSearch, currentZone }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState('');
  const [sort, setSort] = useState('recent');
  const [zonePicker, setZonePicker] = useState(false);
  const [zoneSearch, setZoneSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneSearchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // focus zone search when picker opens
  useEffect(() => {
    if (zonePicker) {
      setTimeout(() => zoneSearchRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setZoneSearch('');
    }
    return () => { document.body.style.overflow = ''; };
  }, [zonePicker]);

  // escape key closes zone picker
  useEffect(() => {
    if (!zonePicker) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZonePicker(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zonePicker]);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(val, zone, sort);
    }, 300);
  }

  function handleZoneChange(val: string) {
    setZone(val);
    setZonePicker(false);
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
  const lowerSearch = zoneSearch.toLowerCase();

  // filter locations by zone search query
  const filteredGroups = LOCATIONS.map(g => ({
    ...g,
    locations: g.locations.filter(l => l.toLowerCase().includes(lowerSearch)),
  })).filter(g => g.locations.length > 0);

  return (
    <>
      <div className="search-bar-wrap">
        {/* collapsed trigger */}
        <button
          className="search-trigger-bar"
          onClick={() => setOpen(!open)}
          aria-label="Search and filter"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>{hasFilters ? 'filtered' : 'search & filter'}</span>
          {hasFilters && <span className="search-active-dot" />}
        </button>

        {/* expanded panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              className="search-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
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
                {/* zone chip — opens full overlay picker */}
                <button
                  className={`zone-chip ${zone ? 'active' : ''}`}
                  onClick={() => setZonePicker(true)}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{zone || 'all zones'}</span>
                  {zone && (
                    <span
                      className="zone-chip-clear"
                      onClick={(e) => { e.stopPropagation(); handleZoneChange(''); }}
                    >
                      ×
                    </span>
                  )}
                </button>

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

      {/* zone picker overlay — renders at portal level, no overflow clipping */}
      <AnimatePresence>
        {zonePicker && (
          <motion.div
            className="zone-picker-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="zone-picker"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* header */}
              <div className="zone-picker-header">
                <span className="zone-picker-title">pick a zone</span>
                <button
                  className="zone-picker-close"
                  onClick={() => setZonePicker(false)}
                >
                  esc
                </button>
              </div>

              {/* search within zones */}
              <div className="zone-picker-search">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={zoneSearchRef}
                  type="text"
                  value={zoneSearch}
                  onChange={(e) => setZoneSearch(e.target.value)}
                  placeholder="search zones..."
                  autoComplete="off"
                />
              </div>

              {/* zone list */}
              <div className="zone-picker-list">
                {/* "all zones" option */}
                <button
                  className={`zone-picker-item all ${!zone ? 'active' : ''}`}
                  onClick={() => handleZoneChange('')}
                >
                  all zones
                </button>

                {/* current zone shortcut */}
                {currentZone && !zoneSearch && (
                  <button
                    className={`zone-picker-item yours ${zone === currentZone ? 'active' : ''}`}
                    onClick={() => handleZoneChange(currentZone)}
                  >
                    {currentZone}
                    <span className="zone-picker-badge">your zone</span>
                  </button>
                )}

                {/* grouped zones */}
                {filteredGroups.map((group) => (
                  <div key={group.groupName} className="zone-picker-group">
                    <div className="zone-picker-group-label">{group.groupName}</div>
                    <div className="zone-picker-group-items">
                      {group.locations.map((z) => (
                        <button
                          key={z}
                          className={`zone-picker-item ${zone === z ? 'active' : ''}`}
                          onClick={() => handleZoneChange(z)}
                        >
                          {z}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredGroups.length === 0 && (
                  <div className="zone-picker-empty">no zones match "{zoneSearch}"</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
