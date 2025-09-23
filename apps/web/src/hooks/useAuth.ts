'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDB } from '@/hooks/useDB';
import { CredentialsType } from '@chat/core';
import { decryptCredentialsType, EncryptedCredentialsType, generateAESKey } from '@chat/crypto';
import { PASSWORD_KEY } from '@/lib/storage';

export function useAuth() {
  const [user, setUser] = useState<CredentialsType | null>(null);
  const [encryptedUser, setEncryptedUser] = useState<EncryptedCredentialsType | null>(null);
  const [key, setKey] = useState<Uint8Array | null>(null);
  const { db } = useDB();
  const router = useRouter();

  useEffect(() => {
    if (!db) return;

    let cancelled = false;

    (async () => {
      const users = await db.getAll('user');
      if (cancelled) return;

      if (!users || users.length === 0) {
        setUser(null);
        setEncryptedUser(null);
        setKey(null);
        router.push('/login');
        return;
      }

      const currentUser = users[0];
      setEncryptedUser(currentUser);

      const storedHash = sessionStorage.getItem(PASSWORD_KEY);
      if (!storedHash) {
        // Unlock mode: user exists but no password in sessionStorage
        setUser(null);
        setKey(null);
        router.push('/login');
        return;
      }

      const aesKey = generateAESKey(new TextEncoder().encode(storedHash));
      if (!aesKey) {
        setUser(null);
        setKey(null);
        router.push('/login');
        return;
      }

      const decrypted = decryptCredentialsType(currentUser, aesKey);
      if (!decrypted) {
        setUser(null);
        setKey(aesKey);
        router.push('/login');
        return;
      }

      if (!cancelled) {
        setUser(decrypted);
        setKey(aesKey);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, router]);

  return { user, encryptedUser, key };
}
