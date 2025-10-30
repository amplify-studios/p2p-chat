'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PasswordField from '@/components/local/PasswordField';
import { useDB } from '@/contexts/DBContext';
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
import { CredentialsType } from '@chat/core';
import { eraseDB, PASSWORD_KEY } from '@/lib/storage';
import { useConfirm } from '@/contexts/ConfirmContext';
import { Lightbulb } from 'lucide-react';

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
  const [attempts, setAttempts] = useState(0);

  const router = useRouter();
  const { encryptedUser, setUser } = useAuth();
  const { db, putEncr } = useDB();
  const confirm = useConfirm();

  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') ?? '/';

  const [existingUser, setExistingUser] = useState<
    null | CredentialsType | EncryptedCredentialsType
  >(null);

  const sanitizeRedirect = (r: string | null) => {
    if (!r) return '/';
    try {
      const decoded = decodeURIComponent(r);
      if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
    } catch (e) {
      // fallback if decodeURIComponent fails
    }
    return '/';
  };

  const handleEnterKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      console.log('Enter key pressed');
      handleLogin();
    }
  };

  const redirect = sanitizeRedirect(rawRedirect);

  useEffect(() => {
    const saved = sessionStorage.getItem('loginAttempts');
    if (saved) setAttempts(Number(saved));
  }, []);

  useEffect(() => {
    if (!encryptedUser) return;

    const storedPass = sessionStorage.getItem(PASSWORD_KEY);
    if (storedPass) {
      //router.replace(redirect);
    } else {
      setExistingUser(encryptedUser);
    }
  }, [encryptedUser, router]);

  if (!db) return <Loading />;

  const handleLogin = async () => {
    if (attempts >= 3) return;

    setError('');
    const requireUsername = !existingUser;

    if (!existingUser) {
      // --- New user registration ---
      const validationError = validateForm(username, password, requireUsername);
      if (validationError) {
        setError(validationError);
        return;
      }

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

      setUser(user);
    } else {
      // --- Existing user unlock ---
      const aeskey = generateAESKey(new TextEncoder().encode(hash(password)));

      //const argonResult = await deriveEncryptionKey(password, aeskey);
      //const key = argonResult.key;

      let decrUser: CredentialsType;

      try {
        decrUser = decryptCredentialsType(existingUser as EncryptedCredentialsType, aeskey);
      } catch (err: unknown) {
        setError('Incorrect password');
        const next = attempts + 1;
        setAttempts(next);
        sessionStorage.setItem('loginAttempts', String(next));

        if (next >= 3) {
          await eraseDB();
          sessionStorage.removeItem('loginAttempts');
          setExistingUser(null);
        }
        return;
      }

      sessionStorage.setItem(PASSWORD_KEY, hash(password));
      sessionStorage.removeItem('loginAttempts');
      setUsername(decrUser.username);

      setUser(decrUser);
    }

    try {
      await Promise.resolve();
      router.replace(redirect);
      setTimeout(() => {
        if (typeof window.location.pathname !== redirect) {
          window.location.href = redirect;
        }
      }, 100);
    } catch (err) {
      console.error('Navigation attempt failed', err);
    }
  };

  const isLocked = attempts >= 3;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="bg-card p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-foreground">
          {existingUser ? 'Login' : 'Register'}
        </h1>

        {error && <p className="text-destructive mb-4">{error}</p>}
        {attempts > 0 && attempts < 3 && (
          <p className="text-muted-foreground mb-2">{3 - attempts} attempt(s) remaining</p>
        )}
        {isLocked && <p className="text-muted-foreground mb-2">Erasing data...</p>}

        {!existingUser && (
          <Input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mb-4"
            disabled={isLocked}
            onKeyDown={handleEnterKey}
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
          handleEnterKey={handleEnterKey}
        />

        <Button onClick={handleLogin} className="w-full" disabled={isLocked}>
          {existingUser ? 'Login' : 'Register'}
        </Button>

        {existingUser && (
          <p
            className="w-full flex text-xs text-muted-foreground mt-2 hover:underline hover:cursor-pointer"
            onClick={async () => {
              const confirmed = await confirm({
                title: 'Forgot your password?',
                message:
                  'Unfortunately, there is no way for us to reset your password, since all data is local to your machine. Would you like to erase your data and create a new account?',
                confirmText: 'Erase',
                cancelText: 'Cancel',
              });

              if (confirmed) {
                await eraseDB();
                sessionStorage.removeItem('loginAttempts');
                setExistingUser(null);
                setUser(null);
              }
            }}
          >
            Forgot password?
          </p>
        )}
      </div>
      <Button
        variant={"secondary"}
        onClick={() => { router.push("/intro") }}
        className='absolute bottom-4 right-4'
      >
        <Lightbulb /> Learn more
      </Button>
    </div>
  );
}
