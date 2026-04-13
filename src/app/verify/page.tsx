'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LOCATIONS } from '@/lib/constants';

export default function VerifyPage() {
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selectedGroup = LOCATIONS.find((g) => g.city === city);

  function handleCityChange(value: string) {
    setCity(value);
    setLocation(''); // reset university when city changes
  }

  async function handleSubmit() {
    const finalLocation = location || city;
    if (!finalLocation) return;

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
        body: JSON.stringify({ city: finalLocation, fingerprint }),
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
        pick your city. optionally your college.
        <br />
        your posts get tagged with it. nobody sees your name. ever.
      </p>

      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {/* City dropdown */}
        <select
          className="city-select"
          value={city}
          onChange={(e) => handleCityChange(e.target.value)}
        >
          <option value="" disabled>
            your city
          </option>
          {LOCATIONS.map((g) => (
            <option key={g.city} value={g.city}>
              {g.city}
            </option>
          ))}
        </select>

        {/* University dropdown (shows after city selection) */}
        {selectedGroup && selectedGroup.universities.length > 0 && (
          <select
            className="city-select"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">
              just {city} is fine
            </option>
            {selectedGroup.universities.map((uni) => (
              <option key={uni} value={uni}>
                {uni}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={!city || isPending}
      >
        {isPending ? '...' : 'enter unsaid'}
      </button>

      {(location || city) && (
        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          posts will be tagged <strong style={{ color: 'var(--color-text)', fontWeight: 500 }}>{(location || city).toUpperCase()}</strong>
        </p>
      )}
    </div>
  );
}
