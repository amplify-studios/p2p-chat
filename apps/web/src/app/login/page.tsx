'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PasswordField from '@/components/local/PasswordField';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { createECDHkey, generateBase58Id } from '@chat/crypto';
import { useAuth } from '@/hooks/useAuth';
import { initSignalingClient } from '@/lib/signalingClient';
import { SignalingClient } from '@chat/sockets';

const validateForm = (username: string, password: string): string | null => {
  if (!username.trim()) return "Provide a username";
  if (!password.trim()) return "Provide a password";
  if (password.trim().length < 8) return "Provide a stronger password";
  return null;
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const user = useAuth();

  const db = useDB();
  if (!db) return <Loading />;

  const handleLogin = async () => {
    setError("");

    const validationError = validateForm(username, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!user) {
      const id = generateBase58Id(8);
      const keys = createECDHkey();
      await db.put("user", {
        userId: id,
        public: keys.getPublicKey(),
        private: keys.getPrivateKey(),
        username,
      });
      const client = new SignalingClient(
        id,
        username,
        keys.getPublicKey().toString()
      );
      initSignalingClient(client); // Only instance of the class

      await client.connect("ws://localhost:8080");
    }

    sessionStorage.setItem(username, password);
    router.push("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="bg-card p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-foreground">
          Login
        </h1>

        {error && <p className="text-destructive mb-4">{error}</p>}

        <Input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4"
        />

        <PasswordField
          id="password"
          name="password"
          placeholder="Password"
          value={password}
          showStrength={true}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
        />

        <Button onClick={handleLogin} className="w-full">
          Login
        </Button>
      </div>
    </div>
  );
}
