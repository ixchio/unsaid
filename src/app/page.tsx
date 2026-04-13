import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'unsaid_id';

async function getStats() {
  const now = new Date();
  const tonightStart = new Date(now);
  tonightStart.setHours(0, 0, 0, 0);

  const [totalTonight, samplePosts] = await Promise.all([
    prisma.post.count({
      where: {
        expiresAt: { gt: now },
        createdAt: { gte: tonightStart },
      },
    }),
    prisma.post.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { feltCount: 'desc' },
      take: 3,
      select: {
        content: true,
        city: true,
        feltCount: true,
      },
    }),
  ]);

  return { totalTonight, samplePosts };
}

export default async function LandingPage() {
  // If user already has a cookie and has picked a city, send them to feed
  const cookieStore = await cookies();
  const deviceId = cookieStore.get(COOKIE_NAME)?.value;

  if (deviceId) {
    const user = await prisma.user.findUnique({
      where: { deviceId },
      select: { city: true },
    });
    if (user?.city) redirect('/feed');
    // Has cookie but no city → show landing, they'll go to /verify
  }

  const { totalTonight, samplePosts } = await getStats();

  const displayPosts =
    samplePosts.length > 0
      ? samplePosts
      : [
          {
            content:
              'i got the internship everyone wanted and i feel absolutely nothing.',
            city: 'Bengaluru',
            feltCount: 47,
          },
          {
            content:
              'she said i love you on tuesday and blocked me on friday.',
            city: 'Delhi',
            feltCount: 112,
          },
          {
            content:
              'the group chat has 47 people and i have never felt more alone.',
            city: 'Mumbai',
            feltCount: 89,
          },
        ];

  return (
    <div className="page-wrapper">
      {/* Header — full width */}
      <header className="header">
        <span className="logo">unsaid</span>
      </header>

      {/* Hero — centered, full viewport */}
      <section className="landing-hero">
        <h1 className="hero-title">
          say the
          <br />
          thing you
          <br />
          didn&apos;t.
        </h1>
        <p className="hero-subtitle">
          anonymous. honest. gone in 48 hours. no profile. no history. just the
          truth.
        </p>
        <Link href="/verify" className="btn-ghost">
          start writing. it&apos;s anonymous.
        </Link>
      </section>

      {/* Stats — full-width band, two cells side by side */}
      <div className="stats-band">
        <div className="stat-cell">
          <span className="stat-number">
            {totalTonight > 0 ? totalTonight.toLocaleString() : '—'}
          </span>
          <span className="stat-label">things said tonight across India</span>
        </div>
        <div className="stat-cell">
          <span className="stat-number">48h</span>
          <span className="stat-label">then it disappears. forever.</span>
        </div>
      </div>

      {/* From tonight — 3-column grid */}
      <div className="from-tonight">
        <div className="from-tonight-label">from tonight</div>
        <div className="sample-posts-grid">
          {displayPosts.map((post, i) => (
            <div key={i} className="sample-post">
              <div className="sample-post-text">
                &ldquo;{post.content}&rdquo;
              </div>
              <div className="sample-post-meta">
                {post.city} · {post.feltCount} felt this
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
