import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'unsaid_id';

async function getStats() {
  const now = new Date();

  const [aliveNow, totalFelts, samplePosts] = await Promise.all([
    prisma.post.count({
      where: { expiresAt: { gt: now } },
    }),
    prisma.feltThis.count(),
    prisma.post.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { feltCount: 'desc' },
      take: 3,
      select: {
        content: true,
        city: true,
        feltCount: true,
        replyCount: true,
        expiresAt: true,
      },
    }),
  ]);

  return { aliveNow, totalFelts, samplePosts };
}

export default async function LandingPage() {
  const cookieStore = await cookies();
  const deviceId = cookieStore.get(COOKIE_NAME)?.value;

  if (deviceId) {
    const user = await prisma.user.findUnique({
      where: { deviceId },
      select: { city: true },
    });
    if (user?.city) redirect('/feed');
  }

  const { aliveNow, totalFelts, samplePosts } = await getStats();

  const displayPosts =
    samplePosts.length > 0
      ? samplePosts.map((p) => ({
          content: p.content,
          zone: p.city,
          feltCount: p.feltCount,
          replies: p.replyCount,
          minutesLeft: Math.max(0, Math.round((p.expiresAt.getTime() - Date.now()) / 60000)),
        }))
      : [
          {
            content: 'BH-3 mess ka paneer is literally painted rubber. everyone knows but nobody says it.',
            zone: 'BH-3',
            feltCount: 47,
            replies: 12,
            minutesLeft: 23,
          },
          {
            content: 'she sits in block 36 third row. been attending the wrong section for 3 weeks now.',
            zone: 'Block 36',
            feltCount: 112,
            replies: 34,
            minutesLeft: 8,
          },
          {
            content: 'dominos queue at 11pm is longer than the placement queue.',
            zone: 'Dominos LPU',
            feltCount: 89,
            replies: 21,
            minutesLeft: 41,
          },
        ];

  return (
    <div className="page-wrapper">
      <header className="header">
        <span className="logo">unsaid</span>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <h1 className="hero-title">
          nobody gives
          <br />
          a fuck.
        </h1>
        <p className="hero-subtitle">
          no name. no face. no account. no consequences.
          <br />
          say whatever you want. it dies in 60 minutes anyway.
        </p>
        <Link href="/verify" className="btn-ghost">
          start talking
        </Link>
      </section>

      {/* The pitch — raw */}
      <div className="pitch-section">
        <div className="pitch-lines">
          <div className="pitch-line">
            <span className="pitch-dot" />
            your post gets 60 minutes to live. then it&apos;s gone.
          </div>
          <div className="pitch-line">
            <span className="pitch-dot" />
            if people feel it, it stays alive longer.
          </div>
          <div className="pitch-line">
            <span className="pitch-dot" />
            if nobody cares, it dies. like it never existed.
          </div>
          <div className="pitch-line">
            <span className="pitch-dot" />
            no sign up. no email. no phone. nothing.
          </div>
        </div>
      </div>

      {/* Live posts */}
      {displayPosts.length > 0 && (
        <div className="from-tonight">
          <div className="from-tonight-label">right now</div>
          <div className="sample-posts-grid">
            {displayPosts.map((post, i) => (
              <div key={i} className="sample-post">
                <div className="sample-post-text">
                  &ldquo;{post.content}&rdquo;
                </div>
                <div className="sample-post-bottom">
                  <span className="sample-post-meta">{post.zone}</span>
                  <span className="sample-post-stats">
                    {post.feltCount} felt &middot; {post.replies} whispers &middot; {post.minutesLeft}m left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Numbers — minimal */}
      <div className="stats-band stats-band-2">
        <div className="stat-cell">
          <span className="stat-number">
            {aliveNow > 0 ? aliveNow.toLocaleString() : '0'}
          </span>
          <span className="stat-label">posts alive</span>
        </div>
        <div className="stat-cell">
          <span className="stat-number">
            {totalFelts > 0 ? totalFelts.toLocaleString() : '0'}
          </span>
          <span className="stat-label">felt this</span>
        </div>
      </div>

      {/* Final CTA */}
      <div className="final-cta">
        <div className="final-cta-text">
          the honest version of your campus already exists.
          <br />
          you&apos;re just not on it yet.
        </div>
        <Link href="/verify" className="btn-primary">
          enter
        </Link>
        <div className="final-cta-note">
          anonymous. ephemeral. zero trace.
        </div>
      </div>
    </div>
  );
}
