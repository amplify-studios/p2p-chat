'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDB } from '@/hooks/useDB';
import { CredentialsType } from '@chat/core';
import { generateAESKey } from '@chat/crypto';

export function useAuth() {
  const [user, setUser] = useState<CredentialsType | null>(null);
  const [key, setKey] = useState<Uint8Array | null>(null);
  const db = useDB();
  const router = useRouter();

  useEffect(() => {
    if (!db) return;

    let cancelled = false;

    (async () => {
      const userCollection = await db.getAll('user');
      if (cancelled) return;

      if (!userCollection || userCollection.length === 0) {
        router.push('/login');
        setUser(null);
        return;
      }

      setUser(userCollection[0]);
    })();

    if(!user) return;
    const pass = sessionStorage.getItem(user?.username);
    if(!pass) {
      router.push('/login');
      setKey(null);
      return;
    }

    const aesKey = generateAESKey(new TextEncoder().encode(pass));
    setKey(aesKey);

    return () => {
      cancelled = true;
    };
  }, [db, router]);

  return { user, key };
}
