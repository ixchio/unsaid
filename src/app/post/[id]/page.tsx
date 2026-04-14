import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { content: true, city: true, feltCount: true, expiresAt: true },
  });

  if (!post || post.expiresAt < new Date()) {
    return { title: 'unsaid — gone' };
  }

  const preview = post.content.length > 120 ? post.content.slice(0, 120) + '...' : post.content;

  return {
    title: `unsaid — ${post.city}`,
    description: preview,
    openGraph: {
      title: `"${preview}"`,
      description: `${post.feltCount} felt this · ${post.city} · unsaid`,
      type: 'article',
      siteName: 'unsaid',
    },
    twitter: {
      card: 'summary',
      title: `unsaid — ${post.city}`,
      description: preview,
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

  // redirect to feed with this post in view (or show standalone)
  return (
    <div className="post-detail-page">
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
