import { useEffect, useState } from 'react';
import { useDB } from '@/contexts/DBContext';
import { generateBase58Id } from '@chat/crypto';
import { InviteMessage, AckMessage } from '@chat/sockets';
import { CredentialsType, InviteType, RoomType } from '@chat/core';
import { refreshRooms } from '@/lib/utils';
import { useAuth } from './useAuth';
import { useClient } from '@/contexts/ClientContext';
import { useRouter } from 'next/navigation';
import { useRooms } from './useRooms';

export function useInvites() {
  const { db, putEncr, getAllDecr } = useDB();
  const [invites, setInvites] = useState<InviteType[]>([]);
  const { user, key } = useAuth();
  const { client } = useClient();
  const router = useRouter();
  const { rooms } = useRooms();

  useEffect(() => {
    if (!db || !key || !client) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const handleRoomInvite = async (msg: InviteMessage) => {
        const newInvite: InviteType = {
          inviteId: msg.from,
          from: msg.from,
          name: msg.name,
          type: msg.roomType,
          public: msg.pubkey,
        };

        await putEncr('invites', newInvite, key);
        setInvites((prev) => [...prev, newInvite]);

        console.log(`Received room invite from ${msg.from} with name ${msg.name}`);
      };

      client.on('invite', handleRoomInvite);

      const storedInvites = (await getAllDecr('invites', key)) as InviteType[];
      if (storedInvites) {
        const normalized = storedInvites.map((i: InviteType) => ({
          inviteId: i.inviteId ?? generateBase58Id(),
          from: i.from ?? '',
          name: i.name ?? 'Anonymous',
          type: i.type,
          public: i.public,
        }));
        setInvites(normalized);
      }

      cleanup = () => {
        client.off('invite', handleRoomInvite);
      };
    };

    setup();

    return () => cleanup?.();
  }, [db, key, client]);

  const acceptInvite = async (invite: InviteType) => {
    if (!db || !key || !user || !client) return;
    const existingRoom = rooms.find((r) => r.keys.find((k) => k.userId === invite.from));

    if (!existingRoom) {
      // Generate the room
      const roomId = generateBase58Id();
  
      const creds = {
        userId: invite.from,
        public: invite.public,
        username: invite.name,
      } as CredentialsType;
  
      const room: RoomType = {
        roomId,
        name: invite.name,
        type: invite.type,
        keys: [
          {
            userId: user.userId,
            public: user.public,
            username: user.username,
          },
          creds,
        ],
      };
  
      // Save room
      await putEncr('rooms', room, key);
  
      await putEncr('credentials', creds, key);

      // Delete the invite
      await db.delete('invites', invite.inviteId);
      setInvites((prev) => prev.filter((i) => i.inviteId !== invite.inviteId));
      refreshRooms();

      // Send Ack back to inviter
      const ack = {
        from: user.userId,
        to: invite.from,
        room: {
          ...room,
          name: room.type === 'single' ? user.username || user.userId : room.name,
        },
      } as AckMessage;
      client.sendAck(invite.from, ack);
      console.log('ACK sent');

      router.push(`/chat?id=${room.roomId}`);
      return;
    }

    // Delete the invite
    await db.delete('invites', invite.inviteId);
    setInvites((prev) => prev.filter((i) => i.inviteId !== invite.inviteId));
    refreshRooms();

    // Send Ack back to inviter
    const ack = {
      from: user.userId,
      to: invite.from,
      room: {
        ...existingRoom,
        name: existingRoom.type === 'single' ? user.username || user.userId : existingRoom.name,
      },
    } as AckMessage;
    client.sendAck(invite.from, ack);
    console.log('ACK sent');

    router.push(`/chat?id=${existingRoom.roomId}`);
    console.log('Already in room with this user, redirected to existing room');
    return;
  };

  const declineInvite = async (invite: InviteType) => {
    if (!db) return;

    await db.delete('invites', invite.inviteId);
    setInvites((prev) => prev.filter((i) => i.inviteId !== invite.inviteId));
  };

  return { invites, acceptInvite, declineInvite };
}
