import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

/**
 * Ensure the Clerk user has a corresponding DB record.
 * Returns the DB user or null if not authenticated.
 */
export async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) return null;

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { clerkId: userId },
    });
  }

  return user;
}

/**
 * Get the current user's display name from Clerk (for internal use only).
 */
export async function getClerkDisplayName(): Promise<string | null> {
  const user = await currentUser();
  return user?.firstName || user?.username || null;
}
