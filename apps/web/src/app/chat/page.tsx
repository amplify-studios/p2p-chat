'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import EmptyState from '@/components/local/EmptyState';
import { MessageType } from '@chat/core';
import { prepareSendMessagePackage, returnDecryptedMessage } from '@/lib/messaging';
import {
  createConnection,
  getConnection,
  setOnMessage,
} from '@/lib/peerStore';
import useClient from '@/hooks/useClient';
import { createECDHkey } from '@chat/crypto';

let currentMsgId = 0;

export default function P2PChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);

  const { db, getAllDecr, putEncr } = useDB();
  const { user, key } = useAuth();
  const { client } = useClient();
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

  // Ensure connection exists (created in Sidebar or here)
  useEffect(() => {
    if (!client?.ws || !user || !otherUser) return;

    createConnection(
      { id: otherUser.userId, username: otherUser.username, pubkey: '' },
      client.ws,
      user.userId,
      undefined,
      (log) => console.log(`[WebRTC ${otherUser.username}] ${log}`)
    );
  }, [client?.ws, user, otherUser]);

  // Get existing connection
  const connection = useMemo(
    () => (otherUser ? getConnection(otherUser.userId) : undefined),
    [otherUser]
  );

  // Listen for incoming messages
  useEffect(() => {
    if (!connection || !user || !otherUser || !roomId || !key) return;

    setOnMessage(otherUser.userId, async (encrMsg: string) => {
      if (!encrMsg) return;

      let parsed: any;
      try {
        parsed = JSON.parse(encrMsg);
      } catch {
        console.warn('Invalid message JSON');
        return;
      }

      // Decrypt message
      const userECDH = createECDHkey();
      if (!user?.private) return;
      userECDH.setPrivateKey(Buffer.from(user.private, 'hex'));
      const msg = returnDecryptedMessage(userECDH, parsed);

      // Update local state
      setMessages((prev) => [
        ...prev,
        { id: ++currentMsgId, text: msg, sender: 'other' },
      ]);

      // Save locally
      try {
        await putEncr(
          'messages',
          {
            roomId,
            senderId: otherUser.userId,
            message: msg,
            timestamp: Date.now(),
            sent: true,
          } as MessageType,
          key
        );
      } catch (err) {
        console.error('Failed to store incoming message', err);
      }
    });
  }, [connection, user, otherUser, roomId, key, putEncr]);

  // Track connection status
  useEffect(() => {
    if (!connection) {
      setConnected(false);
      return;
    }
    const interval = setInterval(() => setConnected(connection.isConnected()), 500);
    return () => clearInterval(interval);
  }, [connection]);

  // Send message
  const sendMessage = useCallback(
    async (message: string) => {
      if (!connection || !user?.userId || !otherUser || !roomId || !key) return;

      // Optimistic local update
      setMessages((prev) => [...prev, { id: ++currentMsgId, text: message, sender: 'me' }]);

      const encrText = prepareSendMessagePackage(otherUser.public, message);
      const text = JSON.stringify(encrText);

      const canSendImmediately = connection.isConnected();
      connection.send(text);

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
