'use client';

import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/local/EmptyState';
import { refreshRooms } from '@/lib/utils';
import { BlockType } from '@chat/core';
import { useAuth } from '@/hooks/useAuth';
import { decryptMessageType } from '@chat/crypto';

export default function ChatOptionsPage() {
  const { db, putEncr } = useDB();
  const { user, key } = useAuth();
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

    if(!key) return;

    await db.delete('rooms', room.roomId);

    const tx = db.transaction("messages", "readwrite");
    const store = tx.objectStore("messages");

    let cursor = await store.openCursor();

    while(cursor) {
      const encrMsg = cursor.value;
      const message = decryptMessageType(encrMsg, key);

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

    if(!key) return;
    
    console.log(room.keys);
    const otherUser = room.keys.find((key) => key.username !== user?.username);
    if (!otherUser) return;

    const userToBlock: BlockType = {
      userId: otherUser?.userId
    }
    await putEncr('blocks', userToBlock, key);
    await db.delete('rooms', room.roomId);
    
    router.push('/');
    refreshRooms()
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center text-foreground">Options</h1>
      <ul className="space-y-2">
          <div className="flex flex-col items-center gap-5 justify-center">
              <div>
                  <Button onClick={deleteChat} className="w-20">
                    Delete chat
                  </Button>
              </div>
              <div>
                  <Button onClick={block} className="w-30">
                    Block this user
                  </Button>
              </div>
          </div>
      </ul>
    </div>
);
}
