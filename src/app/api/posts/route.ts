import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser } from '@/lib/auth';
import { POST_MAX_LENGTH, POST_START_LIFE_MINUTES, LEGEND_THRESHOLD_HOURS, DAILY_POST_LIMIT } from '@/lib/constants';
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
      refillRate: 15,
      interval: 60,
      capacity: 30,
    }),
  ],
});

export async function POST(request: Request) {
  const req = request as any;
  const decision = await aj.protect(req, { requested: 1 });

  if (decision.isDenied()) {
    return NextResponse.json({ error: 'Too Many Requests or Bot Detected' }, { status: 429 });
  }

  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Session not found' }, { status: 401 });
  }

  if (!user.city) {
    return NextResponse.json(
      { error: 'Please select an LPU location first' },
      { status: 400 }
    );
  }

  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);

  const recentPostsCount = await prisma.post.count({
    where: {
      authorId: user.id,
      createdAt: { gte: yesterday }
    }
  });

  if (recentPostsCount >= DAILY_POST_LIMIT) {
    return NextResponse.json(
      { error: `You've reached your daily limit of ${DAILY_POST_LIMIT} posts.` },
      { status: 429 }
    );
  }

  const body = await request.json();
  const content = body.content?.trim();

  if (!content || content.length === 0) {
    return NextResponse.json(
      { error: 'Post cannot be empty' },
      { status: 400 }
    );
  }

  if (content.length > POST_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Post cannot exceed ${POST_MAX_LENGTH} characters` },
      { status: 400 }
    );
  }

  // ── Survival Mechanics: Initial Life ──
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + POST_START_LIFE_MINUTES);

  const post = await prisma.post.create({
    data: {
      content,
      city: user.city,
      expiresAt,
      authorId: user.id,
    },
  });

  return NextResponse.json({ id: post.id, city: post.city });
}

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Session not found' }, { status: 401 });
  }

  if (!user.city) {
    return NextResponse.json({ posts: [], trending: [] });
  }

  const now = new Date();
  const legendThreshold = new Date();
  legendThreshold.setHours(legendThreshold.getHours() - LEGEND_THRESHOLD_HOURS);

  const postSelect = {
    id: true,
    content: true,
    city: true,
    feltCount: true,
    replyCount: true,
    createdAt: true,
    expiresAt: true,
    feltThis: {
      where: { userId: user.id },
      select: { id: true },
    },
  } as const;

  const [cityPosts, legends] = await Promise.all([
    prisma.post.findMany({
      where: {
        expiresAt: { gt: now },
        createdAt: { gte: legendThreshold }
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: postSelect,
    }),

    prisma.post.findMany({
      where: {
        expiresAt: { gt: now },
        createdAt: { lt: legendThreshold },
      },
      orderBy: { feltCount: 'desc' },
      take: 20,
      select: postSelect,
    }),
  ]);

  const formatPost = (post: typeof cityPosts[0]) => ({
    id: post.id,
    content: post.content,
    city: post.city,
    feltCount: post.feltCount,
    replyCount: post.replyCount,
    createdAt: post.createdAt.toISOString(),
    expiresAt: post.expiresAt.toISOString(),
    hasFelt: post.feltThis.length > 0,
  });

  return NextResponse.json({
    posts: cityPosts.map(formatPost),
    trending: legends.map(formatPost),
  });
}
