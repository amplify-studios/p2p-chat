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
import { WebRTCConnection } from '@chat/sockets/webrtc';
import useClient from '@/hooks/useClient';
import { prepareSendMessagePackage, returnDecryptedMessage } from '@/lib/messaging';
import { createECDHkey } from '@chat/crypto';

export default function P2PChatPage() {
  const connectionRef = useRef<WebRTCConnection | null>(null);
  const msgId = useRef(0);

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);

  const { db, getAllDecr, putEncr } = useDB();
  const { user, key } = useAuth();
  const searchParams = useSearchParams();
  const { rooms } = useRooms();
  const { client, status } = useClient();

  const roomId = useMemo(() => searchParams?.get('id') ?? null, [searchParams]);
  const room = useMemo(() => rooms?.find((r) => r.roomId === roomId) ?? null, [rooms, roomId]);
  const otherUser = useMemo(
    () => room?.keys.find((k) => k.userId !== user?.userId) ?? null,
    [room, user?.userId],
  );

  const amOfferer = useMemo(() => {
    if (!user?.userId || !otherUser?.userId) return false;
    return user.userId < otherUser.userId;
  }, [user?.userId, otherUser?.userId]);

  const userECDH = useMemo(() => {
    if (!user?.private) return null;
    const e = createECDHkey();
    e.setPrivateKey(Buffer.from(user.private, 'hex'));
    return e;
  }, [user?.private]);

  // Load local messages
  useEffect(() => {
    if (!db || !roomId || !key || !user?.userId) return;

    (async () => {
      try {
        const allMessages = (await getAllDecr('messages', key)) as MessageType[];
        const roomMessages = allMessages
          .filter((m) => m.roomId === roomId)
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(
            (m, idx) =>
              ({
                id: idx + 1,
                text: m.message,
                sender: m.senderId === user.userId ? 'me' : 'other',
              } as Message),
          );

        msgId.current = roomMessages.length;
        setMessages(roomMessages);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    })();
  }, [db, roomId, key, user?.userId, getAllDecr]);

  // Connect to signaling server
  useEffect(() => {
    if (!client || status !== 'connected') return;
    if (client.ws) setWs(client.ws);
  }, [client, status]);

  // ✅ Track connection state safely and efficiently
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const tryAttach = () => {
      const conn = connectionRef.current;
      if (!conn || !conn.dataChannel) return false;

      const dc = conn.dataChannel;
      const update = () => setConnected(dc.readyState === 'open');

      dc.addEventListener('open', update);
      dc.addEventListener('close', update);

      // initial update
      update();

      cleanup = () => {
        dc.removeEventListener('open', update);
        dc.removeEventListener('close', update);
      };

      return true;
    };

    // Try to attach immediately, or retry until channel exists
    if (!tryAttach()) {
      const interval = setInterval(() => {
        if (tryAttach()) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, []); // Runs once; no dependency-based re-creation

  // WebRTC connection & message handling
  useEffect(() => {
    if (!ws || !otherUser?.userId || !user?.userId || !userECDH) return;

    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const setupConnection = async () => {
      if (!mounted) return;

      try {
        connectionRef.current?.close();
        connectionRef.current = null;

        const conn = new WebRTCConnection({
          ws,
          peerId: otherUser.userId,
          myId: user.userId,
          onMessage: async (encrMsg) => {
            if (!mounted || !encrMsg) return;

            let parsed: any;
            try {
              parsed = JSON.parse(encrMsg);
            } catch {
              return;
            }

            const msg = returnDecryptedMessage(userECDH, parsed);
            msgId.current += 1;
            setMessages((prev) => [...prev, { id: msgId.current, text: msg, sender: 'other' }]);

            if (!key) return;
            putEncr(
              'messages',
              {
                roomId,
                senderId: otherUser.userId,
                message: msg,
                timestamp: Date.now(),
              } as MessageType,
              key,
            );
          },
          onLog: (m) => console.log('[WebRTC]', m),
        });

        connectionRef.current = conn;
        console.log('WebRTC connection established');
      } catch (err) {
        console.error('WebRTC setup failed, retrying in 3s...', err);
        retryTimer = setTimeout(setupConnection, 3000);
      }
    };

    setupConnection();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      connectionRef.current?.close();
      connectionRef.current = null;
    };
  }, [ws, user?.userId, otherUser?.userId, key, roomId, amOfferer]);

  // Local message logger
  const logMessage = useCallback((text: string, sender: 'me' | 'other') => {
    msgId.current += 1;
    setMessages((prev) => [...prev, { id: msgId.current, text, sender }]);
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (message: string) => {
      if (!key || !user?.userId || !otherUser) return;

      logMessage(message, 'me');

      const encrText = prepareSendMessagePackage(otherUser.public, message);
      const text = JSON.stringify(encrText);

      const conn = connectionRef.current;
      if (!conn) {
        (async () => {
          try {
            if (!ws) return;
            const newConn = new WebRTCConnection({
              ws,
              peerId: otherUser.userId,
              myId: user.userId,
              onMessage: async (encrMsg) => {
                let parsed: any;
                try {
                  parsed = JSON.parse(encrMsg);
                } catch {
                  return;
                }
                const msg = returnDecryptedMessage(userECDH!, parsed);
                msgId.current += 1;
                setMessages((prev) => [
                  ...prev,
                  { id: msgId.current, text: msg, sender: 'other' },
                ]);
              },
              onLog: (m) => console.log('[WebRTC]', m),
            });
            connectionRef.current = newConn;
            newConn.send(text);
          } catch (err) {
            console.error('Failed to create connection on demand', err);
          }
        })();
      } else {
        conn.send(text);
      }

      try {
        await putEncr(
          'messages',
          {
            roomId,
            senderId: user.userId,
            message: message,
            timestamp: Date.now(),
          } as MessageType,
          key,
        );
      } catch (err) {
        console.error('Failed to store message locally', err);
      }
    },
    [key, roomId, user?.userId, otherUser, putEncr, ws, userECDH, amOfferer, logMessage],
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
