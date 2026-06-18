// app/(omenland)/omenland/page.tsx (new file)
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import OmenlandClient from './OmenlandClient';

export default async function OmenlandPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  return <OmenlandClient user={user} />;
}