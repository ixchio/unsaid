import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser } from '@/lib/auth';
import { getAblyServer } from '@/lib/ably';
import arcjet, { detectBot, tokenBucket } from '@arcjet/next';

const REPLY_MAX_LENGTH = 200;
const REPLY_BONUS_MINUTES = 5; // replies also extend post life

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Session not found' }, { status: 401 });
  }

  const { id: postId } = await params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { expiresAt: true },
  });

  if (!post || post.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const replies = await prisma.reply.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: {
      id: true,
      content: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    replies: replies.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const req = request as any;
  const decision = await aj.protect(req, { requested: 1 });

  if (decision.isDenied()) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Session not found' }, { status: 401 });
  }

  const { id: postId } = await params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Post expired or not found' }, { status: 404 });
  }

  const body = await request.json();
  const content = body.content?.trim();

  if (!content || content.length === 0) {
    return NextResponse.json({ error: 'Reply cannot be empty' }, { status: 400 });
  }

  if (content.length > REPLY_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Reply cannot exceed ${REPLY_MAX_LENGTH} characters` },
      { status: 400 }
    );
  }

  // Replies also extend post life
  const newExpiresAt = new Date(post.expiresAt.getTime() + REPLY_BONUS_MINUTES * 60000);

  const [reply] = await prisma.$transaction([
    prisma.reply.create({
      data: {
        content,
        postId,
        authorId: user.id,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    }),
    prisma.post.update({
      where: { id: postId },
      data: {
        replyCount: { increment: 1 },
        expiresAt: newExpiresAt,
      },
    }),
  ]);

  // Broadcast reply + new expiry via Ably
  const ably = getAblyServer();
  if (ably) {
    const channel = ably.channels.get(`replies:${postId}`);
    channel.publish('new', {
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt.toISOString(),
    }).catch(() => {});

    // Also update felt channel with new expiresAt
    const feltChannel = ably.channels.get(`felt:${postId}`);
    feltChannel.publish('update', {
      feltCount: post.feltCount,
      expiresAt: newExpiresAt.toISOString(),
    }).catch(() => {});
  }

  return NextResponse.json({
    id: reply.id,
    content: reply.content,
    createdAt: reply.createdAt.toISOString(),
    expiresAt: newExpiresAt.toISOString(),
  });
}
