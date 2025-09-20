'use client';

import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const user = useAuth(true);
  if (!user) return <Loading />;

  return <h1>Logged in as {user.username} ({user.userId})</h1>;
}
