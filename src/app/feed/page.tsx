import { redirect } from 'next/navigation';
import { getOrCreateUser } from '@/lib/user';
import FeedClient from './FeedClient';

export default async function FeedPage() {
  const user = await getOrCreateUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.city) {
    redirect('/verify');
  }

  return <FeedClient userCity={user.city} />;
}
