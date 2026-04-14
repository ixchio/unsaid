'use client';

import { useState, useEffect, useTransition } from 'react';
import Header from '@/components/Header';
import { LOCATIONS } from '@/lib/constants';

export default function SettingsPage() {
  const [currentLocation, setCurrentLocation] = useState('');
  const [groupName, setGroupName] = useState('');
  const [location, setLocation] = useState('');
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((data) => {
        if (data.city) {
          setCurrentLocation(data.city);
          // Find the group this location belongs to
          const group = LOCATIONS.find(g => g.locations.includes(data.city));
          if (group) {
            setGroupName(group.groupName);
            setLocation(data.city);
          }
        }
      });
  }, []);

  const selectedGroup = LOCATIONS.find((g) => g.groupName === groupName);

  function handleGroupChange(value: string) {
    setGroupName(value);
    setLocation('');
    setSaved(false);
  }

  async function handleSaveLocation() {
    if (!location) return;

    setSaved(false);
    startTransition(async () => {
      const res = await fetch('/api/user/city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: location }),
      });

      if (res.ok) {
        setCurrentLocation(location);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  const locationChanged = location !== '' && location !== currentLocation;

  return (
    <div className="page-wrapper">
      <Header rightAction="cancel" />

      <div className="settings-layout">
        <div />
        <div className="settings-main">
          <h1 className="settings-title">settings</h1>

          {/* Current location */}
          <div className="settings-section">
            <div className="settings-label">your zone</div>
            <div className="settings-row">
              <span className="settings-row-label">current</span>
              <span className="settings-row-value">
                {currentLocation || '—'}
              </span>
            </div>
          </div>

          {/* Change location */}
          <div className="settings-section" style={{ borderBottom: 'none' }}>
            <div className="settings-label">update zone</div>
            <p className="settings-hint">
              switch your survival zone. your future posts will be
              tied to this new location.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginTop: '1rem',
              }}
            >
              <select
                className="city-select"
                value={groupName}
                onChange={(e) => handleGroupChange(e.target.value)}
              >
                <option value="" disabled>
                  select category
                </option>
                {LOCATIONS.map((g) => (
                  <option key={g.groupName} value={g.groupName}>
                    {g.groupName}
                  </option>
                ))}
              </select>

              {selectedGroup && selectedGroup.locations.length > 0 && (
                <select
                  className="city-select"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setSaved(false);
                  }}
                >
                  <option value="" disabled>select exact zone</option>
                  {selectedGroup.locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              )}

              {locationChanged && (
                <button
                  className="btn-primary"
                  onClick={handleSaveLocation}
                  disabled={isPending}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {isPending ? '...' : 'save'}
                </button>
              )}

              {saved && (
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-muted)',
                  }}
                >
                  ✓ zone updated
                </span>
              )}
            </div>
          </div>

        </div>
        <div />
      </div>
    </div>
  );
}
