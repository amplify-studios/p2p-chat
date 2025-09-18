"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PasswordField from "@/components/local/PasswordField";
import { useDB } from "@/hooks/useDB";
import Loading from "@/components/local/Loading";
import { generateUUID } from "@chat/crypto";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const db = useDB();
  if(!db) return <Loading />;

  const handleLogin = async () => {
    const id = generateUUID(); // TODO: check if there is one saved
    // db.put("credentials", {
    //   id: id,
    //   public: Buffer.from("", "hex"),
    //   private: Buffer.from("", "hex"),
    //   username: username
    // });
    sessionStorage.setItem(id, password);
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

