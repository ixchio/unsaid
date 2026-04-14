import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'unsaid post';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function PostOgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // fetch post data via edge-compatible fetch
  let content = 'this post has expired.';
  let city = 'lpu campus';
  let feltCount = 0;
  let minutesLeft = 0;
  let alive = false;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unsaid-pi.vercel.app';
    const res = await fetch(`${baseUrl}/api/posts/${id}/og`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      content = data.content || content;
      city = data.city || city;
      feltCount = data.feltCount || 0;
      minutesLeft = data.minutesLeft || 0;
      alive = data.alive || false;
    }
  } catch {
    // fallback to default
  }

  const displayContent = content.length > 160 ? content.slice(0, 157) + '...' : content;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0a0a',
          color: '#e5e5e5',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px 80px',
          position: 'relative',
        }}
      >
        {/* header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 48,
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 400, letterSpacing: '-0.03em' }}>
            unsaid
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: '#555',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {city}
          </div>
        </div>

        {/* quote content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: content.length > 100 ? 32 : 40,
              fontWeight: 300,
              lineHeight: 1.5,
              letterSpacing: '-0.01em',
              color: alive ? '#e5e5e5' : '#555',
              borderLeft: '3px solid #333',
              paddingLeft: 32,
            }}
          >
            &ldquo;{displayContent}&rdquo;
          </div>
        </div>

        {/* footer stats */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 24,
            borderTop: '1px solid #1e1e1e',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 24,
              fontSize: 14,
              fontWeight: 400,
              color: '#555',
              letterSpacing: '0.05em',
            }}
          >
            <span>{feltCount} felt this</span>
            {alive && <span>{minutesLeft}m left</span>}
            {!alive && <span style={{ color: '#dc2626' }}>expired</span>}
          </div>
          <div style={{ fontSize: 13, color: '#333', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            anonymous · ephemeral · zero trace
          </div>
        </div>

        {/* survival bar at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: '#1e1e1e',
          }}
        >
          {alive && (
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (minutesLeft / 60) * 100)}%`,
                background:
                  minutesLeft > 30
                    ? '#22c55e'
                    : minutesLeft > 10
                    ? '#eab308'
                    : '#dc2626',
              }}
            />
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
