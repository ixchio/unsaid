import { redirect } from 'next/navigation';
import { getOrCreateUser } from '@/lib/user';
import ComposeClient from './ComposeClient';

export default async function ComposePage() {
  const user = await getOrCreateUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.city) {
    redirect('/verify');
  }

  return <ComposeClient />;
}
