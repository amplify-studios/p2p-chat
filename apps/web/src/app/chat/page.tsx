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
import { createPeerConnection, WebRTCConnection } from '@chat/sockets/webrtc';
import useClient from '@/hooks/useClient';

export default function P2PChatPage() {
  const connectionRef = useRef<WebRTCConnection | null>(null);
  const msgId = useRef(0);
  const retryTimer = useRef<NodeJS.Timeout | null>(null);

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const { db, getAllDecr, putEncr } = useDB();
  const { user, key } = useAuth();
  const searchParams = useSearchParams();
  const { rooms } = useRooms();
  const { client, status } = useClient();

  const roomId = useMemo(() => searchParams?.get('id') ?? null, [searchParams]);
  const room = useMemo(
    () => rooms?.find((r) => r.roomId === roomId) ?? null,
    [rooms, roomId]
  );

  const otherUser = useMemo(
    () => room?.keys.find((k) => k.userId !== user?.userId) ?? null,
    [room, user?.userId]
  );

  // ---- Load messages ----
  useEffect(() => {
    if (!db || !roomId || !key || !user?.userId) return;

    (async () => {
      try {
        const allMessages = (await getAllDecr('messages', key)) as MessageType[];
        const roomMessages = allMessages
          .filter((m) => m.roomId === roomId)
          .sort((a, b) => a.timestamp - b.timestamp)
          .map((m, idx) => ({
            id: idx + 1,
            text: m.message,
            sender: m.senderId === user.userId ? 'me' : 'other',
          } as Message));

        msgId.current = roomMessages.length;
        setMessages(roomMessages);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    })();
  }, [db, roomId, key, user?.userId]);

  // ---- Watch client ----
  useEffect(() => {
    if (!client || status !== 'connected') return;
    if (client.ws) setWs(client.ws);
  }, [client, status]);

  // ---- Setup WebRTC and auto-reconnect ----
  useEffect(() => {
    if (!ws || !otherUser?.userId || !user?.userId) return;

    let mounted = true;

    const cleanConnection = () => {
      if (connectionRef.current) {
        connectionRef.current.close();
        connectionRef.current = null;
      }
    };

    const setupConnection = async () => {
      if (!mounted) return;

      cleanConnection();

      try {
        const conn = await createPeerConnection({
          ws,
          peerId: otherUser.userId,
          onMessage: (msg) => {
            if (!mounted || !connectionRef.current || !msg) return;

            msgId.current += 1;
            setMessages((prev) => [
              ...prev,
              { id: msgId.current, text: msg, sender: 'other' },
            ]);

            if (!key) return;
            putEncr(
              'messages',
              {
                roomId,
                senderId: otherUser.userId,
                message: msg,
                timestamp: Date.now(),
              } as MessageType,
              key
            );
          },
          onLog: (m) => console.log('[WebRTC]', m),
        });

        // Wait for data channel to open
        if (conn.dataChannel?.readyState !== 'open') {
          conn.dataChannel?.addEventListener('open', () => {
            console.log('Data channel is open');
          });
        }

        connectionRef.current = conn;
        console.log('WebRTC connection established');
      } catch (err) {
        console.error('WebRTC setup failed, retrying in 3s...', err);
        retryTimer.current = setTimeout(setupConnection, 3000);
      }
    };

    setupConnection();

    return () => {
      mounted = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      cleanConnection();
    };
  }, [ws, user?.userId, otherUser?.userId, key]);

  // ---- Log message locally ----
  const logMessage = useCallback((text: string, sender: 'me' | 'other') => {
    msgId.current += 1;
    setMessages((prev) => [...prev, { id: msgId.current, text, sender }]);
  }, []);

  // ---- Send message through WebRTC safely ----
  const sendMessage = useCallback(
    async (text: string) => {
      if (!key || !user?.userId || !otherUser) return;
      logMessage(text, 'me');

      try {
        const conn = connectionRef.current;
        if (!conn) return;
        if (conn.dataChannel?.readyState !== 'open') {
          console.warn('Data channel not open, message not sent');
          return;
        }
        conn.send(text);

        await putEncr(
          'messages',
          {
            roomId,
            senderId: user.userId,
            message: text,
            timestamp: Date.now(),
          } as MessageType,
          key
        );
      } catch (err) {
        console.error('Failed to send message via WebRTC', err);
      }
    },
    [key, roomId, user?.userId, otherUser, putEncr, logMessage]
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
      />
    </div>
  );
}
