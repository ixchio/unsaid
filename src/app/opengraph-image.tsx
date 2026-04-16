import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'unsaid — anonymous campus expression';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#e5e5e5',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* subtle grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div
          style={{
            fontSize: 96,
            fontWeight: 400,
            letterSpacing: '-0.04em',
            marginBottom: 24,
          }}
        >
          unsaid
        </div>

        <div
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: '#888',
            letterSpacing: '-0.01em',
            marginBottom: 48,
          }}
        >
          say the thing you didn&apos;t.
        </div>

        <div
          style={{
            display: 'flex',
            gap: 40,
            fontSize: 16,
            fontWeight: 400,
            color: '#555',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <span>anonymous</span>
          <span style={{ color: '#333' }}>·</span>
          <span>ephemeral</span>
          <span style={{ color: '#333' }}>·</span>
          <span>48 hours</span>
          <span style={{ color: '#333' }}>·</span>
          <span>zero trace</span>
        </div>

        {/* bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #dc2626, #eab308, #22c55e)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
