'use client';

import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/local/EmptyState';
import { refreshRooms } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { decryptMessageType } from '@chat/crypto';
import { useBlocks } from '@/hooks/useBlocks';
import { useConfirm } from '@/components/local/ConfirmContext';
import { ChevronLeft, LogOut, Trash, User } from 'lucide-react';
import { useToast } from '@/components/local/ToastContext';

export default function ChatOptionsPage() {
  const { db, putEncr } = useDB();
  const { user, key } = useAuth();
  const { rooms } = useRooms();
  const searchParams = useSearchParams();
  const roomId = searchParams?.get('id');
  const router = useRouter();
  const { block } = useBlocks();
  const confirm = useConfirm();
  const { showToast } = useToast();

  if (!db || !rooms) return <Loading />;

  if (!roomId) return <EmptyState msg="No room selected" />;

  const room = rooms.find((room) => room.roomId === roomId);
  if (!room) return <EmptyState msg="Room not found" />;

  const deleteChat = async () => {
    const confirmed = await confirm({
      title: 'Delete Room?',
      message: 'Are you sure you want to delete this room? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;
    if (!key) return;

    if(room.type === 'group') {
      room.keys = []
    }
    await db.delete('rooms', room.roomId);

    eraseMessages(room.roomId);

    router.push('/');
    refreshRooms();
  };

  const blockUser = async () => {
    const confirmed = await confirm({
      title: 'Block User?',
      message: 'Are you sure you want to block this user?',
      confirmText: 'Block',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;
    if (!key) return;

    const otherUser = room.keys.find((k) => k.userId !== user?.userId);
    if (!otherUser) return;
    block(otherUser);
    await db.delete('rooms', room.roomId);

    router.push('/');
    refreshRooms();
  };

  const eraseMessages = async (roomId: string) => {
    if(!key) return;
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');

    let cursor = await store.openCursor();
    while (cursor) {
      const encrMsg = cursor.value;
      const message = decryptMessageType(encrMsg, key);

      if (message.roomId === roomId) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await tx.done;
  }

  const leaveGroup = async () => {
    const confirmed = await confirm({
      title: 'Leave Group?',
      message: 'Are you sure you want to leave this group?',
      confirmText: 'Leave',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;
    if (!key) return;

    room.keys = room.keys.filter((k) => k.userId !== user?.userId);
    await putEncr('rooms', room, key);

    await db.delete('rooms', room.roomId);

    router.push('/');
    refreshRooms();

    console.log(room);
  }

  return (
    <div className="p-6 max-w-md mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2 w-full">
        <Button 
          variant="ghost"
          onClick={() => router.push(`/chat?id=${roomId}`)}
        >
          <ChevronLeft />
        </Button>
        <h1 className="text-2xl font-bold text-foreground flex-1 text-center">
          Chat Options
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        {room.type == 'single' && (
          <>
            <Button className="w-full" variant="outline" onClick={blockUser}>
              Block This User
            </Button>

            <Button className="w-full" variant="outline" onClick={async () => { 
              eraseMessages(room.roomId) 
              showToast("Messages erased", "info");
            }}>
              Erase All Messages
            </Button>

            <Button className="w-full" variant="destructive" onClick={deleteChat}>
              <Trash />Delete Chat
            </Button>
          </>
        )}
        {room.type == 'group' && (
          <div className="rounded">
            <h2 className="text-lg font-semibold mb-2 text-foreground">Participants</h2>
            <div className="max-h-100 overflow-y-auto mb-4 border p-2 rounded">
              {room.keys.map((k) => (
                <div key={k.userId} className="p-2 border-b last:border-0 flex items-center justify-start gap-2">
                  <div className="font-medium text-foreground flex flex-row gap-2">
                    <User />{k.username}
                  </div>
                  {/*<CircleMinus />*/}
                  {/* <p className="text-sm text-muted-foreground break-all">{k.userId}</p> */}
                </div>
              ))}
            </div>
            <Button className="mt-5 w-full" variant="destructive" onClick={leaveGroup}>
              <LogOut />Leave group
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
