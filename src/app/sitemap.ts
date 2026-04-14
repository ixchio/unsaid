import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/feed`,
      lastModified: now,
      changeFrequency: 'always',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/verify`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // dynamic: live posts
  // wrap in try/catch — sitemap should never crash the build
  let postPages: MetadataRoute.Sitemap = [];
  try {
    const { prisma } = await import('@/lib/prisma');
    const livePosts = await prisma.post.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { feltCount: 'desc' },
      take: 200,
      select: { id: true, createdAt: true },
    });

    postPages = livePosts.map((post) => ({
      url: `${SITE_URL}/post/${post.id}`,
      lastModified: post.createdAt.toISOString(),
      changeFrequency: 'hourly' as const,
      priority: 0.6,
    }));
  } catch {
    // DB unavailable — return static pages only
  }

  return [...staticPages, ...postPages];
}
