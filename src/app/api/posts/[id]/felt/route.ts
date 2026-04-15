import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser } from '@/lib/auth';
import { getAblyServer } from '@/lib/ably';
import { FELT_HOURLY_LIMIT, POST_FELT_BONUS_MINUTES, REACTION_TYPES } from '@/lib/constants';
import arcjet, { detectBot, tokenBucket } from '@arcjet/next';

const VALID_TYPES = REACTION_TYPES.map(r => r.key);

const aj = arcjet({
  key: process.env.ARCJET_KEY || "dummy-key-for-builds",
  characteristics: ['ip.src'],
  rules: [
    detectBot({
      mode: "DRY_RUN",
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

async function getBreakdown(postId: string) {
  const counts = await prisma.feltThis.groupBy({
    by: ['type'],
    where: { postId },
    _count: true,
  });
  const breakdown: Record<string, number> = {};
  for (const c of counts) breakdown[c.type] = c._count;
  return breakdown;
}

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

  // parse reaction type from body
  let reactionType = 'felt';
  try {
    const body = await request.json();
    if (body.type && VALID_TYPES.includes(body.type)) {
      reactionType = body.type;
    }
  } catch {
    // no body or invalid json — default to 'felt'
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Post not found or expired' }, { status: 404 });
  }

  const existing = await prisma.feltThis.findUnique({
    where: {
      postId_userId: { postId, userId: user.id },
    },
  });

  if (existing && existing.type === reactionType) {
    // toggle off: remove reaction
    const newExpiresAt = new Date(post.expiresAt.getTime() - POST_FELT_BONUS_MINUTES * 60000);
    const safeExpiresAt = newExpiresAt < new Date() ? post.expiresAt : newExpiresAt;

    await prisma.$transaction([
      prisma.feltThis.delete({ where: { id: existing.id } }),
      prisma.post.update({
        where: { id: postId },
        data: { feltCount: { decrement: 1 }, expiresAt: safeExpiresAt },
      }),
    ]);

    const updated = await prisma.post.findUnique({
      where: { id: postId },
      select: { feltCount: true, expiresAt: true },
    });

    const feltCount = updated?.feltCount ?? 0;
    const expiresAt = updated?.expiresAt.toISOString();
    const breakdown = await getBreakdown(postId);

    const ably = getAblyServer();
    if (ably) {
      ably.channels.get(`felt:${postId}`).publish('update', { feltCount, expiresAt, breakdown }).catch(() => {});
    }

    return NextResponse.json({ felt: false, type: null, feltCount, expiresAt, breakdown });
  } else if (existing) {
    // change reaction type (no time change, no count change)
    await prisma.feltThis.update({
      where: { id: existing.id },
      data: { type: reactionType },
    });

    const breakdown = await getBreakdown(postId);

    const ably = getAblyServer();
    if (ably) {
      ably.channels.get(`felt:${postId}`).publish('update', {
        feltCount: post.feltCount,
        expiresAt: post.expiresAt.toISOString(),
        breakdown,
      }).catch(() => {});
    }

    return NextResponse.json({
      felt: true,
      type: reactionType,
      feltCount: post.feltCount,
      expiresAt: post.expiresAt.toISOString(),
      breakdown,
    });
  } else {
    // new reaction
    const newExpiresAt = new Date(post.expiresAt.getTime() + POST_FELT_BONUS_MINUTES * 60000);

    await prisma.$transaction([
      prisma.feltThis.create({
        data: { postId, userId: user.id, type: reactionType },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { feltCount: { increment: 1 }, expiresAt: newExpiresAt },
      }),
    ]);

    const updated = await prisma.post.findUnique({
      where: { id: postId },
      select: { feltCount: true, expiresAt: true },
    });

    const feltCount = updated?.feltCount ?? 0;
    const expiresAt = updated?.expiresAt.toISOString();
    const breakdown = await getBreakdown(postId);

    const ably = getAblyServer();
    if (ably) {
      ably.channels.get(`felt:${postId}`).publish('update', { feltCount, expiresAt, breakdown }).catch(() => {});
    }

    return NextResponse.json({ felt: true, type: reactionType, feltCount, expiresAt, breakdown });
  }
}
