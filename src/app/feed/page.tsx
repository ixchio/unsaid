import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getOrCreateUser } from '@/lib/auth';
import FeedClient from './FeedClient';

export const metadata: Metadata = {
  title: 'feed — survival mode',
  description: 'live anonymous posts from LPU campus. react to keep them alive. stay silent and they die.',
  robots: { index: false, follow: false },
};

export default async function FeedPage() {
  const user = await getOrCreateUser();

  if (!user) {
    redirect('/verify');
  }

  if (!user.city) {
    redirect('/verify');
  }

  return <FeedClient userCity={user.city} />;
}
