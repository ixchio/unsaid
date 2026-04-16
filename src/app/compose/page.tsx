import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getOrCreateUser } from '@/lib/auth';
import ComposeClient from './ComposeClient';

export const metadata: Metadata = {
  title: 'drop something',
  description: 'say the thing you didn\'t. anonymous. ephemeral. gone in 48 hours.',
  robots: { index: false, follow: false },
};

export default async function ComposePage() {
  const user = await getOrCreateUser();

  if (!user) {
    redirect('/verify');
  }

  if (!user.city) {
    redirect('/verify');
  }

  return <ComposeClient />;
}
