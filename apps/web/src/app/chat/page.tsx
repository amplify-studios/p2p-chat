'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import EmptyState from '@/components/local/EmptyState';
import { MessageType } from '@chat/core';
import { prepareSendMessagePackage } from '@/lib/messaging';
import { PeerInfo } from '@chat/sockets';
import { usePeerConnections } from '@/hooks/useConnectionsStore';

let currentMsgId = 0;

export default function P2PChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);

  const { db, getAllDecr, putEncr } = useDB();
  const { user, key } = useAuth();
  const searchParams = useSearchParams();
  const { rooms } = useRooms();

  const roomId = useMemo(() => searchParams?.get('id') ?? null, [searchParams]);
  const room = useMemo(() => rooms?.find((r) => r.roomId === roomId) ?? null, [rooms, roomId]);
  const otherUser = useMemo(
    () => room?.keys.find((k) => k.userId !== user?.userId) ?? null,
    [room, user?.userId]
  );

  // Load local messages for this room
  useEffect(() => {
    if (!db || !roomId || !key || !user?.userId) return;

    (async () => {
      try {
        const allMessages = (await getAllDecr('messages', key)) as MessageType[];
        const roomMessages = allMessages
          .filter((m) => m.roomId === roomId)
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(
            (m) =>
              ({
                id: ++currentMsgId,
                text: m.message,
                sender: m.senderId === user.userId ? 'me' : 'other',
              } as Message)
          );
        setMessages(roomMessages);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    })();
  }, [db, roomId, key, user?.userId, getAllDecr]);

  const connections = usePeerConnections(
    otherUser
      ? [
          {
            id: otherUser.userId,
            username: otherUser.username,
            pubkey: '', // not needed here
          } as PeerInfo,
        ]
      : []
  );

  const connection = useMemo(
    () => (otherUser ? connections[otherUser.userId] : undefined),
    [connections, otherUser]
  );

  // Track connection state
  useEffect(() => {
    if (!connection) {
      setConnected(false);
      return;
    }

    const interval = setInterval(() => {
      setConnected(connection.isConnected());
    }, 500);

    return () => clearInterval(interval);
  }, [connection]);

  // Send a new message
  const sendMessage = useCallback(
    async (message: string) => {
      if (!connection || !user?.userId || !otherUser || !roomId || !key) return;

      // Optimistic local update
      setMessages((prev) => [...prev, { id: ++currentMsgId, text: message, sender: 'me' }]);

      const encrText = prepareSendMessagePackage(otherUser.public, message);
      const text = JSON.stringify(encrText);

      const canSendImmediately = connection.isConnected();
      connection.send(text);

      // Store locally
      try {
        await putEncr(
          'messages',
          {
            roomId,
            senderId: user.userId,
            message,
            timestamp: Date.now(),
            sent: canSendImmediately,
          } as MessageType,
          key
        );
      } catch (err) {
        console.error('Failed to store message locally', err);
      }
    },
    [connection, user?.userId, otherUser, roomId, key, putEncr]
  );

  if (!db || !rooms || !user) return <Loading />;
  if (!roomId) return <EmptyState msg="No room selected" />;
  if (!room) return <EmptyState msg="Room not found" />;

  return (
    <div className="flex flex-col h-full min-h-screen">
      <Chat
        title={room.name}
        messages={messages}
        href={`/chat/options?id=${room.roomId}`}
        onSend={sendMessage}
        room={room}
        connected={connected}
      />
    </div>
  );
}
