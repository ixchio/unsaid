import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDeviceId } from '@/lib/auth';

export async function GET() {
  const deviceId = await getDeviceId();
  if (!deviceId) {
    return NextResponse.json({ error: 'Session not found' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { deviceId },
    select: { city: true },
  });

  return NextResponse.json({
    city: user?.city || null,
  });
}
