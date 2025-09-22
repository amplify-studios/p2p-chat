'use client';

import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/local/EmptyState';
import { refreshRooms } from '@/lib/utils';

export default function ChatOptionsPage() {
  const db = useDB();
  useAuth(true);
  const { rooms } = useRooms();
  const searchParams = useSearchParams();
  const roomId = searchParams?.get('id');
  const router = useRouter();
  
  if (!db || !rooms) return <Loading />;

  if (!roomId) return <EmptyState msg='No room selected' />;

  const room = rooms.find((room) => room.roomId === roomId);
  if (!room) return <EmptyState msg='Room not found' />;

  const deleteRoom = async () => {
    await db.delete('rooms', room.roomId);
    router.push('/');
    refreshRooms();
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
