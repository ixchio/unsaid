'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LOCATIONS } from '@/lib/constants';

export default function VerifyPage() {
  const [groupName, setGroupName] = useState('');
  const [location, setLocation] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selectedGroup = LOCATIONS.find((g) => g.groupName === groupName);

  function handleGroupChange(value: string) {
    setGroupName(value);
    setLocation(''); // reset specific location when group changes
  }

  async function handleSubmit() {
    if (!location) return;

    startTransition(async () => {
      let fingerprint = '';
      try {
        const fpPromise = import('@fingerprintjs/fingerprintjs').then(FingerprintJS => FingerprintJS.load());
        const fp = await fpPromise;
        const result = await fp.get();
        fingerprint = result.visitorId;
      } catch (err) {
        console.warn('Fingerprinting failed', err);
      }

      const res = await fetch('/api/user/city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: location, fingerprint }),
      });

      if (res.ok) {
        router.push('/feed');
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.error) {
           alert(errorData.error);
        }
      }
    });
  }

  return (
    <div className="verify-page">
      <h1 className="verify-title">one last thing.</h1>
      <p className="verify-subtitle">
        pick your lpu zone.
        <br />
        you will enter the survival feed for that location. nobody sees your name. ever.
      </p>

      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {/* Category dropdown */}
        <select
          className="city-select"
          value={groupName}
          onChange={(e) => handleGroupChange(e.target.value)}
        >
          <option value="" disabled>
            dropzone category
          </option>
          {LOCATIONS.map((g) => (
            <option key={g.groupName} value={g.groupName}>
              {g.groupName}
            </option>
          ))}
        </select>

        {/* Location dropdown (shows after group selection) */}
        {selectedGroup && selectedGroup.locations.length > 0 && (
          <select
            className="city-select"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="" disabled>
              select exact zone
            </option>
            {selectedGroup.locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={!location || isPending}
      >
        {isPending ? '...' : 'enter survival feed'}
      </button>

      {location && (
        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          posts will be tagged to <strong style={{ color: 'var(--color-text)', fontWeight: 500 }}>{location.toUpperCase()}</strong>
        </p>
      )}
    </div>
  );
}
