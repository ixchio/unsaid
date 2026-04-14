import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function runCleanup(secret: string | null | undefined) {
  if (secret !== process.env.CLEANUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

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

// Vercel crons send GET requests
export async function GET(request: Request) {
  const secret = request.headers.get('x-cleanup-secret')
    || new URL(request.url).searchParams.get('secret')
    || process.env.CLEANUP_SECRET; // auto-auth for Vercel cron
  return runCleanup(secret);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const secret = body.secret || request.headers.get('x-cleanup-secret');
  return runCleanup(secret);
}
