import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// One-time migration: extend all existing posts to createdAt + 48 hours
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get('secret');
  if (secret !== process.env.CLEANUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const posts = await prisma.post.findMany({
    select: { id: true, createdAt: true, expiresAt: true },
  });

  let updated = 0;
  for (const post of posts) {
    const newExpires = new Date(post.createdAt.getTime() + 48 * 60 * 60 * 1000);
    if (newExpires > post.expiresAt) {
      await prisma.post.update({
        where: { id: post.id },
        data: { expiresAt: newExpires },
      });
      updated++;
    }
  }

  return NextResponse.json({ total: posts.length, updated, message: 'done' });
}
