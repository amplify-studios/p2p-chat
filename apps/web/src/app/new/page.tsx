'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { generateUUID } from '@chat/crypto';
import { RoomType } from '@chat/core';
import { useAuth } from '@/hooks/useAuth';

export default function NewRoom() {
  const user = useAuth(true);

  const db = useDB();
  const router = useRouter();

  const [name, setName] = useState('');
  const [type, setType] = useState<'single' | 'group'>('single');
  const [keys, setKeys] = useState<string[]>([]);
  const [otherUserId, setOtherUserId] = useState('');
  const [error, setError] = useState('');

  if (!db) return <Loading />;

  const handleCreateRoom = async () => {
    setError('');

    if (!name) {
      setError('Room name is required');
      return;
    }

    if (type === 'single' && !otherUserId) {
      setError('User ID is required for single chat');
      return;
    }

    const roomId = generateUUID();
    const room: RoomType = {
      roomId,
      name,
      type,
      keys: keys.length > 0 ? keys : [],
    };

    if (type === 'single') {
      room.keys.push(otherUserId);
    }

    await db.put('rooms', room);
    router.push(`/chat?id=${roomId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Create New Room</h1>

        {error && <p className="text-red-600 mb-4">{error}</p>}

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
