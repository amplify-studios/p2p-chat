'use client';

import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';

export default function NewRoom() {
  const user = useAuth(true);
  if (!user) return <Loading />;

  return <h1>TODO: Create a new room (connection with a user)</h1>;
}
