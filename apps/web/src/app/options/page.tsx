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
  useAuth();
  const { rooms } = useRooms();
  const searchParams = useSearchParams();
  const roomId = searchParams?.get('id');
  const router = useRouter();
  
  if (!db || !rooms) return <Loading />;

  if (!roomId) return <EmptyState msg='No room selected' />;

  const room = rooms.find((room) => room.roomId === roomId);
  if (!room) return <EmptyState msg='Room not found' />;

  const deleteChat = async () => {
    const confirmed = confirm('Are you sure you want to delete this room? This action cannot be undone.');
    if (!confirmed) return;

    await db.delete('rooms', room.roomId);

    const tx = db.transaction("messages", "readwrite");
    const store = tx.objectStore("messages");

    let cursor = await store.openCursor();

    while(cursor) {
      const message = cursor.value;
      if (message.roomId === roomId) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await tx.done;

    router.push('/');
    refreshRooms();
  };

  const block = async () => {
    const confirmed = confirm('Are you sure you want to block this user?');
    if (!confirmed) return;

    

    console.log("User blocked");
    router.push('/');
  }

  return (
    <div className='flex flex-col gap-2 items-start'>
      <h1>Options for chat: {roomId}</h1>
      <Button onClick={deleteChat} className="w-20">
        Delete
      </Button>
      <Button onClick={block} className="w-30">
        Block this user
      </Button>
    </div>
  );
}
