import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser } from '@/lib/auth';

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Session not found' }, { status: 401 });
  }

  const now = new Date();

  const [totalPosts, postsAlive, totalReactions, totalReplies, topReactionResult, longestSurvivorResult] = await Promise.all([
    prisma.post.count({ where: { authorId: user.id } }),
    prisma.post.count({ where: { authorId: user.id, expiresAt: { gt: now } } }),
    prisma.feltThis.count({
      where: { post: { authorId: user.id } },
    }),
    prisma.reply.count({
      where: { post: { authorId: user.id } },
    }),
    prisma.feltThis.groupBy({
      by: ['type'],
      where: { post: { authorId: user.id } },
      _count: true,
      orderBy: { _count: { type: 'desc' } },
      take: 1,
    }),
    prisma.post.findFirst({
      where: { authorId: user.id },
      orderBy: { expiresAt: 'desc' },
      select: { createdAt: true, expiresAt: true },
    }),
  ]);

  const topReaction = topReactionResult.length > 0 ? topReactionResult[0].type : null;

  let longestSurvivor = 0;
  if (longestSurvivorResult) {
    longestSurvivor = Math.round(
      (longestSurvivorResult.expiresAt.getTime() - longestSurvivorResult.createdAt.getTime()) / 60000
    );
  }

  return NextResponse.json({
    totalPosts,
    postsAlive,
    totalReactions,
    totalReplies,
    topReaction,
    longestSurvivor,
  });
}
