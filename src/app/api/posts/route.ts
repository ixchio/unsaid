import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser } from '@/lib/auth';
import { getAblyServer } from '@/lib/ably';
import { POST_MAX_LENGTH, POST_START_LIFE_MINUTES, LEGEND_THRESHOLD_HOURS, DAILY_POST_LIMIT, FEED_PAGE_SIZE, TRENDING_PAGE_SIZE } from '@/lib/constants';
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
  try {
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

    // broadcast new post to feed channel
    const ably = getAblyServer();
    if (ably) {
      const channel = ably.channels.get('feed:global');
      channel.publish('new-post', {
        id: post.id,
        content: post.content,
        city: post.city,
        feltCount: 0,
        replyCount: 0,
        createdAt: post.createdAt.toISOString(),
        expiresAt: post.expiresAt.toISOString(),
        hasFelt: false,
        userReaction: null,
        reactionBreakdown: {},
        isOwn: false,
        authorId: post.authorId,
      }).catch(() => {});
    }

    return NextResponse.json({ id: post.id, city: post.city });
  } catch (err) {
    console.error('[POST /api/posts] Error:', err);
    return NextResponse.json(
      { error: 'Failed to create post. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    if (!user.city) {
      return NextResponse.json({ posts: [], trending: [], hasMore: false, trendingHasMore: false });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const trendingCursor = searchParams.get('trendingCursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || String(FEED_PAGE_SIZE)), 50);
    const trendingLimit = Math.min(parseInt(searchParams.get('trendingLimit') || String(TRENDING_PAGE_SIZE)), 30);
    const query = searchParams.get('q')?.trim() || '';
    const zone = searchParams.get('zone') || '';
    const sort = searchParams.get('sort') || 'recent';

    const now = new Date();
    const legendThreshold = new Date();
    legendThreshold.setHours(legendThreshold.getHours() - LEGEND_THRESHOLD_HOURS);

    // build where clause for search/filter
    const baseWhere: Record<string, unknown> = { expiresAt: { gt: now } };
    if (query) {
      baseWhere.content = { contains: query, mode: 'insensitive' };
    }
    if (zone) {
      baseWhere.city = zone;
    }

    // determine sort order
    let orderBy: Record<string, string>;
    switch (sort) {
      case 'felt':
        orderBy = { feltCount: 'desc' };
        break;
      case 'dying':
        orderBy = { expiresAt: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Try with full select (including FeltThis.type). If the type column
    // doesn't exist yet (prisma db push not run), fall back to basic select.
    let feedPosts: any[];
    let legends: any[];
    let useFallback = false;

    const fullSelect = {
      id: true,
      content: true,
      city: true,
      feltCount: true,
      replyCount: true,
      createdAt: true,
      expiresAt: true,
      authorId: true,
      feltThis: {
        where: { userId: user.id },
        select: { id: true, type: true },
      },
    } as const;

    const fallbackSelect = {
      id: true,
      content: true,
      city: true,
      feltCount: true,
      replyCount: true,
      createdAt: true,
      expiresAt: true,
      authorId: true,
      feltThis: {
        where: { userId: user.id },
        select: { id: true },
      },
    } as const;

    // main feed
    const feedWhere = { ...baseWhere, createdAt: { gte: legendThreshold } };

    try {
      feedPosts = await prisma.post.findMany({
        where: feedWhere,
        orderBy,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: fullSelect,
      });
    } catch {
      // FeltThis.type column likely missing — fall back
      useFallback = true;
      feedPosts = await prisma.post.findMany({
        where: feedWhere,
        orderBy,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: fallbackSelect,
      });
    }

    const hasMore = feedPosts.length > limit;
    if (hasMore) feedPosts.pop();

    // trending / legends
    const trendingWhere: Record<string, unknown> = {
      expiresAt: { gt: now },
      createdAt: { lt: legendThreshold },
    };

    try {
      legends = await prisma.post.findMany({
        where: trendingWhere,
        orderBy: { feltCount: 'desc' },
        take: trendingLimit + 1,
        ...(trendingCursor ? { cursor: { id: trendingCursor }, skip: 1 } : {}),
        select: useFallback ? fallbackSelect : fullSelect,
      });
    } catch {
      legends = await prisma.post.findMany({
        where: trendingWhere,
        orderBy: { feltCount: 'desc' },
        take: trendingLimit + 1,
        ...(trendingCursor ? { cursor: { id: trendingCursor }, skip: 1 } : {}),
        select: fallbackSelect,
      });
      useFallback = true;
    }

    const trendingHasMore = legends.length > trendingLimit;
    if (trendingHasMore) legends.pop();

    // get reaction breakdowns
    const allPostIds = [...feedPosts, ...legends].map((p: any) => p.id);
    const breakdownMap: Record<string, Record<string, number>> = {};

    try {
      if (!useFallback && allPostIds.length > 0) {
        const counts = await prisma.feltThis.groupBy({
          by: ['postId', 'type'],
          where: { postId: { in: allPostIds } },
          _count: true,
        });
        for (const rc of counts) {
          if (!breakdownMap[rc.postId]) breakdownMap[rc.postId] = {};
          breakdownMap[rc.postId][rc.type] = rc._count;
        }
      }
    } catch {
      // type column missing — no breakdown available
    }

    const formatPost = (post: any) => ({
      id: post.id,
      content: post.content,
      city: post.city,
      feltCount: post.feltCount,
      replyCount: post.replyCount,
      createdAt: post.createdAt.toISOString(),
      expiresAt: post.expiresAt.toISOString(),
      hasFelt: post.feltThis.length > 0,
      userReaction: post.feltThis[0]?.type || null,
      reactionBreakdown: breakdownMap[post.id] || {},
      isOwn: post.authorId === user.id,
    });

    // compute trending scores: (felt*2 + replies*3) / age^1.2
    const formattedTrending = legends
      .map(formatPost)
      .sort((a: any, b: any) => {
        const ageA = Math.max(1, (now.getTime() - new Date(a.createdAt).getTime()) / 3600000);
        const ageB = Math.max(1, (now.getTime() - new Date(b.createdAt).getTime()) / 3600000);
        const scoreA = (a.feltCount * 2 + a.replyCount * 3) / Math.pow(ageA, 1.2);
        const scoreB = (b.feltCount * 2 + b.replyCount * 3) / Math.pow(ageB, 1.2);
        return scoreB - scoreA;
      });

    return NextResponse.json({
      posts: feedPosts.map(formatPost),
      trending: formattedTrending,
      hasMore,
      trendingHasMore,
    });
  } catch (err) {
    console.error('[GET /api/posts] Fatal error:', err);
    return NextResponse.json(
      { error: 'Failed to load feed. Please try again.' },
      { status: 500 }
    );
  }
}
