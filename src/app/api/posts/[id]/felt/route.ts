import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser } from '@/lib/auth';
import { getAblyServer } from '@/lib/ably';
import { FELT_HOURLY_LIMIT, POST_FELT_BONUS_MINUTES } from '@/lib/constants';
import arcjet, { detectBot, tokenBucket } from '@arcjet/next';

const aj = arcjet({
  key: process.env.ARCJET_KEY || "dummy-key-for-builds",
  characteristics: ['ip.src'],
  rules: [
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE"],
    }),
    tokenBucket({
      mode: "LIVE",
      refillRate: 10,
      interval: 60,
      capacity: 20,
    }),
  ],
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const req = request as any;
  const decision = await aj.protect(req, { requested: 1 });

  if (decision.isDenied()) {
    return NextResponse.json({ error: 'Too Many Requests or Bot Detected' }, { status: 429 });
  }

  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Session not found' }, { status: 401 });
  }

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentFeltCount = await prisma.feltThis.count({
    where: {
      userId: user.id,
      createdAt: { gte: oneHourAgo }
    }
  });

  if (recentFeltCount >= FELT_HOURLY_LIMIT) {
    return NextResponse.json(
      { error: `You've reached your limit of ${FELT_HOURLY_LIMIT} reactions per hour.` },
      { status: 429 }
    );
  }

  const { id: postId } = await params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Post not found or expired' }, { status: 404 });
  }

  const existing = await prisma.feltThis.findUnique({
    where: {
      postId_userId: {
        postId,
        userId: user.id,
      },
    },
  });

  if (existing) {
    // Un-felt: remove the felt, decrement count, and remove bonus time
    const newExpiresAt = new Date(post.expiresAt.getTime() - POST_FELT_BONUS_MINUTES * 60000);
    // Don't let subtraction kill it instantly if we can help it, though it might if they unlike right at the edge.
    const safeExpiresAt = newExpiresAt < new Date() ? post.expiresAt : newExpiresAt;

    await prisma.$transaction([
      prisma.feltThis.delete({
        where: { id: existing.id },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { 
          feltCount: { decrement: 1 },
          expiresAt: safeExpiresAt 
        },
      }),
    ]);

    const updated = await prisma.post.findUnique({
      where: { id: postId },
      select: { feltCount: true, expiresAt: true },
    });

    const feltCount = updated?.feltCount ?? 0;
    const currentExpiresAt = updated?.expiresAt.toISOString();

    const ably = getAblyServer();
    if (ably) {
      const channel = ably.channels.get(`felt:${postId}`);
      channel.publish('update', { feltCount, expiresAt: currentExpiresAt }).catch(() => {});
    }

    return NextResponse.json({ felt: false, feltCount, expiresAt: currentExpiresAt });
  } else {
    // Felt: create the felt, increment count, and ADD bonus time
    const newExpiresAt = new Date(post.expiresAt.getTime() + POST_FELT_BONUS_MINUTES * 60000);

    await prisma.$transaction([
      prisma.feltThis.create({
        data: {
          postId,
          userId: user.id,
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { 
          feltCount: { increment: 1 },
          expiresAt: newExpiresAt
        },
      }),
    ]);

    const updated = await prisma.post.findUnique({
      where: { id: postId },
      select: { feltCount: true, expiresAt: true },
    });

    const feltCount = updated?.feltCount ?? 0;
    const currentExpiresAt = updated?.expiresAt.toISOString();

    const ably = getAblyServer();
    if (ably) {
      const channel = ably.channels.get(`felt:${postId}`);
      channel.publish('update', { feltCount, expiresAt: currentExpiresAt }).catch(() => {});
    }

    return NextResponse.json({ felt: true, feltCount, expiresAt: currentExpiresAt });
  }
}
