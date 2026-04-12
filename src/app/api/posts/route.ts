import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { POST_MAX_LENGTH, POST_LIFETIME_HOURS, getCityForLocation, LOCATIONS } from '@/lib/constants';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get DB user
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !user.city) {
    return NextResponse.json(
      { error: 'Please select a city first' },
      { status: 400 }
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
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !user.city) {
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

