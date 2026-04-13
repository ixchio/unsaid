import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser } from '@/lib/auth';
import { POST_MAX_LENGTH, POST_LIFETIME_HOURS, getCityForLocation, LOCATIONS, DAILY_POST_LIMIT } from '@/lib/constants';
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
      refillRate: 15, // 15 requests per minute
      interval: 60,
      capacity: 30,   // let them read the feed and post occasionally
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
      { error: 'Please select a city first' },
      { status: 400 }
    );
  }

  // ── Database Daily Rate Limit ──
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

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + POST_LIFETIME_HOURS);

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
    return NextResponse.json({ posts: [], national: [], trending: [] });
  }

  const now = new Date();

  // Resolve the parent city and get ALL locations in that city group
  const parentCity = getCityForLocation(user.city);
  const cityGroup = LOCATIONS.find((g) => g.city === parentCity);
  const localLocations = cityGroup
    ? [cityGroup.city, ...cityGroup.universities]
    : [user.city];

  const postSelect = {
    id: true,
    content: true,
    city: true,
    feltCount: true,
    createdAt: true,
    expiresAt: true,
    feltThis: {
      where: { userId: user.id },
      select: { id: true },
    },
  } as const;

  const [cityPosts, nationalPosts, trending] = await Promise.all([
    // 1. All posts from user's city group (user's city + all universities in it)
    prisma.post.findMany({
      where: {
        city: { in: localLocations },
        expiresAt: { gt: now },
        feltCount: { lt: 50 },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: postSelect,
    }),

    // 2. National — everything OUTSIDE user's city group
    prisma.post.findMany({
      where: {
        city: { notIn: localLocations },
        expiresAt: { gt: now },
        feltCount: { lt: 50 },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: postSelect,
    }),

    // 3. "Everyone felt this" — 50+ felt, any city
    prisma.post.findMany({
      where: {
        expiresAt: { gt: now },
        feltCount: { gte: 50 },
      },
      orderBy: { feltCount: 'desc' },
      take: 10,
      select: postSelect,
    }),
  ]);

  const formatPost = (post: typeof cityPosts[0]) => ({
    id: post.id,
    content: post.content,
    city: post.city,
    feltCount: post.feltCount,
    createdAt: post.createdAt.toISOString(),
    expiresAt: post.expiresAt.toISOString(),
    hasFelt: post.feltThis.length > 0,
  });

  return NextResponse.json({
    posts: cityPosts.map(formatPost),
    national: nationalPosts.map(formatPost),
    trending: trending.map(formatPost),
    cityLabel: parentCity,
  });
}
