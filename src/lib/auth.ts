import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const COOKIE_NAME = 'unsaid_id';

/**
 * Read the anonymous device ID from the cookie.
 * Returns null if the cookie hasn't been set yet (middleware handles creation).
 */
export async function getDeviceId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Get or create the anonymous DB user for the current device.
 * Returns null if no cookie is set.
 */
export async function getOrCreateUser(fingerprint?: string) {
  const deviceId = await getDeviceId();
  if (!deviceId) return null;

  let user;

  // 1. If fingerprint is provided, check if we already know this browser
  if (fingerprint) {
    user = await prisma.user.findFirst({
      where: { fingerprint },
    });
  }

  // 2. If no fingerprint match found, lookup by the cookie deviceId
  if (!user) {
    user = await prisma.user.findUnique({
      where: { deviceId },
    });
  }

  // 3. Create the user if totally new
  if (!user) {
    user = await prisma.user.create({
      data: { deviceId, fingerprint },
    });
  } else if (!user.fingerprint && fingerprint) {
    // Connect new fingerprint to existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: { fingerprint },
    });
  }

  return user;
}
