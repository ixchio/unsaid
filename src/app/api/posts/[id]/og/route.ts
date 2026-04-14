import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Lightweight endpoint for OG image generation — returns minimal post data */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        content: true,
        city: true,
        feltCount: true,
        replyCount: true,
        expiresAt: true,
      },
    });

    if (!post) {
      return NextResponse.json({ alive: false, content: 'post not found.' });
    }

    const now = new Date();
    const alive = post.expiresAt > now;
    const minutesLeft = alive
      ? Math.max(0, Math.round((post.expiresAt.getTime() - now.getTime()) / 60000))
      : 0;

    return NextResponse.json({
      content: post.content,
      city: post.city,
      feltCount: post.feltCount,
      replyCount: post.replyCount,
      minutesLeft,
      alive,
    });
  } catch {
    return NextResponse.json({ alive: false, content: 'something went wrong.' });
  }
}
