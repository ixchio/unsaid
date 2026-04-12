import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getAllLocationNames } from '@/lib/constants';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const city = body.city;

  const validLocations = getAllLocationNames();
  if (!city || !validLocations.includes(city)) {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
  }

  // Upsert: create user if not exists, update city if exists
  await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId, city },
    update: { city },
  });

  return NextResponse.json({ ok: true });
}
