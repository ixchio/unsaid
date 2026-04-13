import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser } from '@/lib/auth';
import { getAllLocationNames, CITY_SWITCH_COOLDOWN_HOURS } from '@/lib/constants';
import arcjet, { detectBot, tokenBucket } from '@arcjet/next';

const aj = arcjet({
  key: process.env.ARCJET_KEY || "dummy-key-for-builds",
  characteristics: ['ip.src'], 
  rules: [
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE"], // Allow basic search engines
    }),
    tokenBucket({
      mode: "LIVE",
      refillRate: 5,   // 5 requests per minute
      interval: 60,
      capacity: 5,     // burst limit
    }),
  ],
});

export async function POST(request: Request) {
  const req = request as any; // Next.js App Router typings bypass
  const decision = await aj.protect(req, { requested: 1 });

  if (decision.isDenied()) {
    return NextResponse.json({ error: 'Too Many Requests or Bot Detected' }, { status: 429 });
  }

  const body = await request.json();
  const { city, fingerprint } = body;

  const user = await getOrCreateUser(fingerprint);
  if (!user) {
    return NextResponse.json({ error: 'Session not found' }, { status: 401 });
  }

  const validLocations = getAllLocationNames();
  if (!city || !validLocations.includes(city)) {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
  }

  // Check 12-hour cooldown before allowing change
  if (user.city && user.cityChangedAt && user.city !== city) {
    const hoursSinceLastChange = (Date.now() - user.cityChangedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastChange < CITY_SWITCH_COOLDOWN_HOURS) {
      const remainingTime = Math.ceil(CITY_SWITCH_COOLDOWN_HOURS - hoursSinceLastChange);
      return NextResponse.json(
        { error: `You can change your city again in ${remainingTime} hour(s)` }, 
        { status: 429 }
      );
    }
  }

  const isChangingCity = user.city !== city;

  await prisma.user.update({
    where: { id: user.id },
    data: { 
      city,
      ...(isChangingCity ? { cityChangedAt: new Date() } : {})
    },
  });

  return NextResponse.json({ ok: true });
}
