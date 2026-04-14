import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  SITE_URL, SITE_NAME, OG_DEFAULTS, TWITTER_DEFAULTS,
  canonicalUrl, postJsonLd,
} from '@/lib/seo';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { content: true, city: true, feltCount: true, replyCount: true, expiresAt: true },
  });

  if (!post || post.expiresAt < new Date()) {
    return {
      title: 'this post is gone',
      description: 'it didn\'t survive. nobody kept it alive.',
      robots: { index: false, follow: true },
    };
  }

  const preview = post.content.length > 120 ? post.content.slice(0, 120) + '...' : post.content;
  const url = canonicalUrl(`/post/${id}`);

  return {
    title: `"${preview}" — ${post.city}`,
    description: `${post.feltCount} felt this · ${post.replyCount} whispers · ${post.city} · anonymous post on unsaid`,
    alternates: { canonical: url },
    openGraph: {
      ...OG_DEFAULTS,
      type: 'article',
      title: `"${preview}"`,
      description: `${post.feltCount} felt this · ${post.city} · unsaid`,
      url,
      images: [{
        url: `/post/${id}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: `anonymous post from ${post.city}`,
      }],
    },
    twitter: {
      ...TWITTER_DEFAULTS,
      card: 'summary_large_image',
      title: `"${preview}" — ${post.city}`,
      description: `${post.feltCount} felt this · anonymous post on unsaid`,
      images: [`/post/${id}/opengraph-image`],
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      content: true,
      city: true,
      feltCount: true,
      replyCount: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  if (!post) return notFound();

  const isExpired = post.expiresAt < new Date();

  if (isExpired) {
    return (
      <div className="post-detail-page">
        <header className="header">
          <Link href="/" className="logo" style={{ textDecoration: 'none' }}>unsaid</Link>
        </header>
        <div className="post-detail-gone">
          <div className="post-detail-gone-icon">×</div>
          <h2>this one&apos;s gone.</h2>
          <p>it didn&apos;t survive. nobody kept it alive.</p>
          <Link href="/feed" className="btn-ghost">see what&apos;s alive</Link>
        </div>
      </div>
    );
  }

  const remaining = post.expiresAt.getTime() - Date.now();
  const minutes = Math.max(0, Math.round(remaining / 60000));

  const jsonLd = postJsonLd({
    id: post.id,
    content: post.content,
    city: post.city,
    feltCount: post.feltCount,
    replyCount: post.replyCount,
    createdAt: post.createdAt.toISOString(),
    expiresAt: post.expiresAt.toISOString(),
  });

  return (
    <div className="post-detail-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="header">
        <Link href="/" className="logo" style={{ textDecoration: 'none' }}>unsaid</Link>
        <Link href="/feed" className="btn-ghost" style={{ fontSize: '0.65rem', padding: '0.5rem 1.5rem' }}>
          enter feed
        </Link>
      </header>

      <div className="post-detail-card">
        <div className="post-detail-content">{post.content}</div>
        <div className="post-detail-meta">
          <span>{post.city}</span>
          <span>·</span>
          <span>{post.feltCount} felt this</span>
          <span>·</span>
          <span>{post.replyCount} whispers</span>
          <span>·</span>
          <span>{minutes}m left</span>
        </div>
      </div>

      <div className="post-detail-cta">
        <p>this post is alive. join the feed to react.</p>
        <Link href="/verify" className="btn-primary">
          enter unsaid
        </Link>
      </div>
    </div>
  );
}
