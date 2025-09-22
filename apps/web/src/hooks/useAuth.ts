'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDB } from '@/hooks/useDB';
import { CredentialsType } from '@chat/core';

export function useAuth(redirectIfNoUser: boolean = true) {
  const [user, setUser] = useState<CredentialsType | null>(null);
  const db = useDB();
  const router = useRouter();

  useEffect(() => {
    if (!db) return;

    let cancelled = false;

    (async () => {
      const userCollection = await db.getAll('user');
      if (cancelled) return;

      if (!userCollection || userCollection.length === 0) {
        if (redirectIfNoUser) router.push('/login');
        setUser(null);
        return;
      }

      setUser(userCollection[0]);
    })();

    return () => {
      cancelled = true;
    };
  }, [db, router, redirectIfNoUser]);

  return user;
}
