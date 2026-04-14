import { redirect } from 'next/navigation';
import { getOrCreateUser } from '@/lib/auth';
import FeedClient from './FeedClient';

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
