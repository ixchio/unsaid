import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getAblyServer } from '@/lib/ably';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: postId } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check if post exists and is not expired
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Check if already felt
  const existing = await prisma.feltThis.findUnique({
    where: {
      postId_userId: {
        postId,
        userId: user.id,
      },
    },
  });

  if (existing) {
    // Un-felt: remove the felt and decrement count
    await prisma.$transaction([
      prisma.feltThis.delete({
        where: { id: existing.id },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { feltCount: { decrement: 1 } },
      }),
    ]);

    const updated = await prisma.post.findUnique({
      where: { id: postId },
      select: { feltCount: true },
    });

    const feltCount = updated?.feltCount ?? 0;

    // Broadcast to all viewers
    const ably = getAblyServer();
    if (ably) {
      const channel = ably.channels.get(`felt:${postId}`);
      channel.publish('update', { feltCount }).catch(() => {});
    }

    return NextResponse.json({ felt: false, feltCount });
  } else {
    // Felt: create the felt and increment count
    await prisma.$transaction([
      prisma.feltThis.create({
        data: {
          postId,
          userId: user.id,
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { feltCount: { increment: 1 } },
      }),
    ]);

    const updated = await prisma.post.findUnique({
      where: { id: postId },
      select: { feltCount: true },
    });

    const feltCount = updated?.feltCount ?? 0;

    // Broadcast to all viewers
    const ably = getAblyServer();
    if (ably) {
      const channel = ably.channels.get(`felt:${postId}`);
      channel.publish('update', { feltCount }).catch(() => {});
    }

    return NextResponse.json({ felt: true, feltCount });
  }
}
