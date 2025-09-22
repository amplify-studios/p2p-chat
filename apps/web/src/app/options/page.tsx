'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useRef, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import { Button } from '@/components/ui/button';

export default function ChatOptionsPage() {
  const db = useDB();
  const user = useAuth(true);
  const { rooms } = useRooms();
  const searchParams = useSearchParams();
  const roomId = searchParams?.get('id');
  const router = useRouter();
  
  if (!db || !rooms) return <Loading />;
  
  console.log(rooms);

  if (!roomId) {
    return (
      <h1 className="flex text-2xl items-center justify-center min-h-screen bg-gray-50">
        No room selected
      </h1>
    );
  }

  const room = rooms.find((room) => room.roomId === roomId);
  if (!room) {
    return (
      <h1 className="flex text-2xl items-center justify-center min-h-screen bg-gray-50">
        Room not found
      </h1>
    );
  }
  const deleteRoom = async () => {
    await db.delete('rooms', room.roomId);
    router.push('/');
    location.reload();
    console.log(rooms.toString);
  };
  return (
    <div>
      <h1>Options for chat: {roomId}</h1>
      <Button onClick={deleteRoom} className="w-20">
        Delete
      </Button>
    </div>
  );
}
