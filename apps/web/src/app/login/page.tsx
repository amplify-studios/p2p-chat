'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PasswordField from '@/components/local/PasswordField';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import {
  EncryptedCredentialsType,
  createECDHkey,
  decryptCredentialsType,
  generateAESKey,
  generateBase58Id,
  hash,
} from '@chat/crypto';
import { useAuth } from '@/hooks/useAuth';
import { initSignalingClient } from '@/lib/signalingClient';
import { SignalingClient } from '@chat/sockets';
import { CredentialsType } from '@chat/core';
import { PASSWORD_KEY } from '@/lib/storage';

const validateForm = (
  username: string,
  password: string,
  requireUsername: boolean,
): string | null => {
  if (requireUsername && !username.trim()) return 'Provide a username';
  if (!password.trim()) return 'Provide a password';
  if (password.trim().length < 8) return 'Provide a stronger password';
  return null;
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { encryptedUser } = useAuth();
  const { db, putEncr } = useDB();

  const [existingUser, setExistingUser] = useState<
    null | CredentialsType | EncryptedCredentialsType
  >(null);

  useEffect(() => {
    if (!encryptedUser) return;

    const storedPass = sessionStorage.getItem(PASSWORD_KEY);
    if (storedPass) {
      router.push('/');
    } else {
      setExistingUser(encryptedUser);
    }
  }, [encryptedUser, router]);

  if (!db) return <Loading />;

  const handleLogin = async () => {
    setError('');
    const requireUsername = !existingUser;
    const validationError = validateForm(username, password, requireUsername);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!existingUser) {
      // --- New user ---
      const id = generateBase58Id(8);
      const keys = createECDHkey();

      const user: CredentialsType = {
        userId: id,
        public: keys.getPublicKey().toString('hex'),
        private: keys.getPrivateKey().toString('hex'),
        username,
      };
      const hashedPass = hash(password);
      sessionStorage.setItem(PASSWORD_KEY, hashedPass);

      const encr = await putEncr(
        'user',
        user,
        generateAESKey(new TextEncoder().encode(hashedPass)),
      );
      if (!encr) {
        setError('Failed to store credentials');
        return;
      }

      const client = new SignalingClient(id, username, user.public);
      initSignalingClient(client);
      await client.connect('ws://localhost:8080');
    } else {
      // --- Existing user unlock ---
      const storedHash = sessionStorage.getItem(PASSWORD_KEY);
      if (storedHash && storedHash !== hash(password)) {
        setError('Incorrect password');
        return;
      }

      const aesKey = generateAESKey(new TextEncoder().encode(hash(password)));
      let decrUser: CredentialsType;

      try {
        decrUser = decryptCredentialsType(existingUser as EncryptedCredentialsType, aesKey);
      } catch (err: unknown) {
        console.error('Could not decrypt credentials: ', err);
        setError('Incorrect password');
        return;
      }
      sessionStorage.setItem(PASSWORD_KEY, hash(password));
      setUsername(decrUser.username);

      const client = new SignalingClient(decrUser.userId, decrUser.username, decrUser.public);
      initSignalingClient(client);
      await client.connect('ws://localhost:8080');
    }

    router.push('/');
  };

  console.log(existingUser);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="bg-card p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-foreground">
          {existingUser ? 'Unlock' : 'Login'}
        </h1>

        {error && <p className="text-destructive mb-4">{error}</p>}

        {!existingUser && (
          <Input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mb-4"
          />
        )}

        <PasswordField
          id="password"
          name="password"
          placeholder="Password"
          value={password}
          showStrength={!existingUser}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
        />

        <Button onClick={handleLogin} className="w-full">
          {existingUser ? 'Unlock' : 'Login'}
        </Button>
      </div>
    </div>
  );
}
