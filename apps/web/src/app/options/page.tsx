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
    if (!key) return;

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

  const blockUser = async () => {
    const confirmed = confirm('Are you sure you want to block this user?');
    if (!confirmed) return;
    if (!key) return;

    const otherUser = room.keys.find((k) => k.userId !== user?.userId);
    if (!otherUser) return;

    const userToBlock: BlockType = { userId: otherUser.userId, username: otherUser.username };
    await putEncr('blocks', userToBlock, key);
    await db.delete('rooms', room.roomId);

    router.push('/');
    refreshRooms();
  };

  return (
    <div className="p-6 max-w-md mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-center text-foreground">Chat Options</h1>

      <div className="flex flex-col gap-4">
        <Button
          className="w-full"
          variant="outline"
          onClick={blockUser}
        >
          Block This User
        </Button>

        <Button
        className="w-full"
        variant="destructive"
        onClick={deleteChat}
        >
        Delete Chat
        </Button>
      </div>
    </div>
  );
}
