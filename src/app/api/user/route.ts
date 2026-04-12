import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Cascade delete: FeltThis → Posts → User (cascade is in schema)
  await prisma.user.delete({
    where: { id: user.id },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { city: true, createdAt: true },
  });

  const clerkUser = await currentUser();

  return NextResponse.json({
    city: user?.city || null,
    joinedAt: user?.createdAt?.toISOString() || null,
    email: clerkUser?.emailAddresses?.[0]?.emailAddress || null,
  });
}
