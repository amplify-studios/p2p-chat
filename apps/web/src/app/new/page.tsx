'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { generateBase58Id } from '@chat/crypto';
import { CredentialsType, RoomType } from '@chat/core';
import { useAuth } from '@/hooks/useAuth';

export default function NewRoom() {
  const user = useAuth(true);
  const db = useDB();
  const router = useRouter();

  const [name, setName] = useState('');
  const [type, setType] = useState<'single' | 'group'>('single');
  const [keys, setKeys] = useState<CredentialsType[]>([]);
  const [otherUserId, setOtherUserId] = useState('');
  const [error, setError] = useState('');

  if (!db) return <Loading />;

  const validate = () => {
    if (!name.trim()) return 'Room name is required';
    if (type === 'single' && !otherUserId.trim()) return 'User ID is required for single chat';
    return '';
  };

  const handleCreateRoom = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');

    const roomId = generateBase58Id();
    const room: RoomType = {
      roomId,
      name,
      type,
      keys: keys.length > 0 ? keys : [],
    };

    if (type === 'single') {
      // TODO: exchange credentials with the signaling server
      // room.keys.push(...);
    }

    await db.put('rooms', room);

    // Notify Sidebar about the update
    localStorage.setItem("rooms_updated", Date.now().toString());
    window.dispatchEvent(new StorageEvent("storage", { key: "rooms_updated" }));

    // Reset form
    setName('');
    setOtherUserId('');
    setType('single');

    router.push(`/chat?id=${roomId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="bg-card p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-foreground">
          Create New Room
        </h1>

        {error && <p className="text-destructive mb-4">{error}</p>}

        <Input
          type="text"
          placeholder="Room Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4"
        />

        <div className="mb-4 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="type"
              value="single"
              checked={type === 'single'}
              onChange={() => setType('single')}
            />
            Single
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="type"
              value="group"
              checked={type === 'group'}
              onChange={() => setType('group')}
            />
            Group
          </label>
        </div>

        {type === 'single' && (
          <Input
            type="text"
            placeholder="Other User ID"
            value={otherUserId}
            onChange={(e) => setOtherUserId(e.target.value)}
            className="mb-4"
          />
        )}

        <Button onClick={handleCreateRoom} className="w-full">
          Create Room
        </Button>
      </div>
    </div>
  );
}
