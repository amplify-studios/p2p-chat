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
      const users = await db.getAll('credentials');
      if (cancelled) return;

      if (!users || users.length === 0) {
        if (redirectIfNoUser) router.push('/login');
        setUser(null);
        return;
      }

      // NOTE: Since we store all credentials in the same collection our user is always first
      setUser(users[0]);
    })();

    return () => {
      cancelled = true;
    };
  }, [db, router, redirectIfNoUser]);

  return user;
}
