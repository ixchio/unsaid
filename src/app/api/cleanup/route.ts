import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  // Verify cleanup secret
  const body = await request.json().catch(() => ({}));
  const secret = body.secret || request.headers.get('x-cleanup-secret');

  if (secret !== process.env.CLEANUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Delete expired posts (cascade deletes felt_this too)
  const result = await prisma.post.deleteMany({
    where: {
      expiresAt: { lte: now },
    },
  });

  return NextResponse.json({
    deleted: result.count,
    timestamp: now.toISOString(),
  });
}
