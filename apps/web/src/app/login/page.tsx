'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PasswordField from '@/components/local/PasswordField';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { generateBase58Id } from '@chat/crypto';
import { useAuth } from '@/hooks/useAuth';

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

    if(!user) {
      const id = generateBase58Id(8);
      await db.put("credentials", {
        userId: id,
        public: new Uint8Array(), // TODO: Generate public/private keys
        private: new Uint8Array(),
        username,
      });
    }

    // TODO: register to the signaling server
    sessionStorage.setItem(username, password);
    router.push("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

        {error && <p className="text-red-600 mb-4">{error}</p>}

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
