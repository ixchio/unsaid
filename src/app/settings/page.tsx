'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import Header from '@/components/Header';
import { LOCATIONS, getCityForLocation } from '@/lib/constants';

export default function SettingsPage() {
  const [currentLocation, setCurrentLocation] = useState('');
  const [city, setCity] = useState('');
  const [university, setUniversity] = useState('');
  const [email, setEmail] = useState('');
  const [joinedAt, setJoinedAt] = useState('');
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const { signOut } = useClerk();

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((data) => {
        if (data.city) {
          setCurrentLocation(data.city);
          const parentCity = getCityForLocation(data.city);
          setCity(parentCity);
          if (data.city !== parentCity) {
            setUniversity(data.city);
          }
        }
        if (data.email) setEmail(data.email);
        if (data.joinedAt) {
          setJoinedAt(
            new Date(data.joinedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          );
        }
      });
  }, []);

  const selectedGroup = LOCATIONS.find((g) => g.city === city);

  function handleCityChange(value: string) {
    setCity(value);
    setUniversity('');
    setSaved(false);
  }

  async function handleSaveLocation() {
    const finalLocation = university || city;
    if (!finalLocation) return;

    setSaved(false);
    startTransition(async () => {
      const res = await fetch('/api/user/city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: finalLocation }),
      });

      if (res.ok) {
        setCurrentLocation(finalLocation);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  async function handleDeleteAccount() {
    startTransition(async () => {
      const res = await fetch('/api/user', { method: 'DELETE' });
      if (res.ok) {
        await signOut();
        router.push('/');
      }
    });
  }

  const locationChanged =
    (university || city) !== currentLocation && (university || city) !== '';

  return (
    <div className="page-wrapper">
      <Header rightAction="cancel" />

      <div className="settings-layout">
        <div />
        <div className="settings-main">
          <h1 className="settings-title">settings</h1>

          {/* Account info */}
          <div className="settings-section">
            <div className="settings-label">account</div>
            <div className="settings-row">
              <span className="settings-row-label">email</span>
              <span className="settings-row-value">{email || '—'}</span>
            </div>
            <div className="settings-row">
              <span className="settings-row-label">joined</span>
              <span className="settings-row-value">{joinedAt || '—'}</span>
            </div>
            <div className="settings-row">
              <span className="settings-row-label">current location</span>
              <span className="settings-row-value">
                {currentLocation || '—'}
              </span>
            </div>
          </div>

          {/* Change location */}
          <div className="settings-section">
            <div className="settings-label">update location</div>
            <p className="settings-hint">
              change your city or pick a university. your future posts will be
              tagged with the new location.
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
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
              >
                <option value="" disabled>
                  select city
                </option>
                {LOCATIONS.map((g) => (
                  <option key={g.city} value={g.city}>
                    {g.city}
                  </option>
                ))}
              </select>

              {selectedGroup && selectedGroup.universities.length > 0 && (
                <select
                  className="city-select"
                  value={university}
                  onChange={(e) => {
                    setUniversity(e.target.value);
                    setSaved(false);
                  }}
                >
                  <option value="">just {city} is fine</option>
                  {selectedGroup.universities.map((uni) => (
                    <option key={uni} value={uni}>
                      {uni}
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
                  ✓ location updated
                </span>
              )}
            </div>
          </div>

          {/* Danger zone */}
          <div className="settings-section" style={{ borderBottom: 'none' }}>
            <div className="settings-label" style={{ color: '#cc3333' }}>
              danger zone
            </div>
            <p className="settings-hint">
              this permanently deletes your account, all your posts, and all
              your felt reactions. this cannot be undone.
            </p>

            {!deleteConfirm ? (
              <button
                className="btn-ghost"
                onClick={() => setDeleteConfirm(true)}
                style={{
                  marginTop: '1rem',
                  borderColor: '#cc3333',
                  color: '#cc3333',
                }}
              >
                delete my account
              </button>
            ) : (
              <div
                style={{
                  marginTop: '1rem',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                }}
              >
                <button
                  className="btn-primary"
                  onClick={handleDeleteAccount}
                  disabled={isPending}
                  style={{
                    background: '#cc3333',
                    borderColor: '#cc3333',
                  }}
                >
                  {isPending ? '...' : 'yes, delete everything'}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setDeleteConfirm(false)}
                >
                  cancel
                </button>
              </div>
            )}
          </div>
        </div>
        <div />
      </div>
    </div>
  );
}
