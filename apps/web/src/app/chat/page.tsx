'use client';

import { Chat, Message } from '@/components/local/Chat';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useDB } from '@/contexts/DBContext';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import EmptyState from '@/components/local/EmptyState';
import { MessageType } from '@chat/core';
import { prepareSendMessagePackage, returnDecryptedMessage } from '@/lib/messaging';
import { createECDHkey } from '@chat/crypto';
import { WebRTCConnection } from '@chat/sockets';
import { useP2P } from '@/contexts/P2PContext';
import { findRoomIdByPeer } from '@/lib/utils';
import { sendLocalNotification } from '@chat/notifications';

let currentMsgId = 0;

export default function P2PChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState<WebRTCConnection | undefined>(undefined);
  const [seen, setSeen] = useState(false);
  const [userLeft, setUserLeft] = useState(false);
  const { db, getAllDecr, putEncr, updateEncr } = useDB();
  const { user, key } = useAuth();
  const searchParams = useSearchParams();
  const { rooms } = useRooms();
  const { getConnection, setOnMessage, connectToPeer } = useP2P();

  const roomId = useMemo(() => searchParams?.get('id') ?? null, [searchParams]);
  const room = useMemo(() => rooms?.find((r) => r.roomId === roomId) ?? null, [rooms, roomId]);
  const otherUser = useMemo(
    () => room?.keys.find((k) => k.userId !== user?.userId) ?? null,
    [room, user?.userId],
  );

  useEffect(() => {
    if (!otherUser) return;
    const conn = getConnection(otherUser.userId);
    setConnection(conn);
  }, [otherUser, getConnection]);

  // Load local messages for this room
  useEffect(() => {
    if (!db || !roomId || !key || !user?.userId || !connection) return;

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
                read: m.read,
              }) as Message,
          );
        setMessages(roomMessages);

        const unseenMessages = allMessages.filter((m) => m.roomId === roomId && m.read === false);
        unseenMessages.forEach(async (msg) => {
          await updateEncr('messages', key, msg.id, (decr) => {
            return { ...decr, read: true };
          });
        });
        console.log("connection.isConnected()", connection.isConnected());
        if (connection.isConnected()) {
          const payload = JSON.stringify({ type: 'opened', roomId });
          connection.send(payload);
        }
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    })();
  }, [db, roomId, key, user?.userId, getAllDecr, updateEncr, connection]);

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

      if (parsed.type === 'opened') {
        setUserLeft(false);
        console.log(`[P2PChat] ${otherUser.username} opened the chat.`);

        try {
          const allMessages = (await getAllDecr('messages', key)) as MessageType[];
          const msgsToUpdate = allMessages.filter(
            (m) => m.roomId === roomId && m.senderId === user.userId && !m.read,
          );
          
          for (const m of msgsToUpdate) {
            try {
              await putEncr(
                'messages',
                {
                  ...m,
                  read: true,
                } as MessageType,
                key,
              );
            } catch (err) {
              console.error('[P2PChat] Failed to update message read state', err);
            }
          }

          setMessages((prev) => 
            prev.map((msg) => 
              msg.sender === 'me' && !msg.read ? { ...msg, read: true } : msg
            )
          );
          setSeen(true);
          
        } catch (err) {
          console.error('[P2PChat] Failed to fetch messages to mark as read', err);
        }
        return;
      }

      if (parsed.type === 'closed') {
        console.log(`[P2PChat] ${otherUser.username} left the chat.`);
        setUserLeft(true);
        return;
      }

      // Decrypt message
      const userECDH = createECDHkey();
      if (!user?.private) return;
      userECDH.setPrivateKey(Buffer.from(user.private, 'hex'));
      const msg = returnDecryptedMessage(userECDH, parsed);

      setMessages((prev) => [...prev, { id: ++currentMsgId, text: msg, sender: 'other', read: false }]);
      setSeen(false); 

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
            read: true,
          } as MessageType,
          key,
        );

        if (connection.isConnected()) {
          const payload = JSON.stringify({ type: 'opened', roomId });
          connection.send(payload);
        }
      } catch (err) {
        console.error('Failed to store incoming message', err);
      }
    });

    return () => {
      setOnMessage(otherUser.userId, async (encrMsg: string) => {
        try {
          const parsed = JSON.parse(encrMsg);
          
          if (parsed.type === 'opened') {
            console.log(`[P2PChat] ${otherUser.username} opened the chat.`);

            try {
              const allMessages = (await getAllDecr('messages', key)) as MessageType[];
              const msgsToUpdate = allMessages.filter(
                (m) => m.roomId === roomId && m.senderId === user.userId && !m.read,
              );
              for (const m of msgsToUpdate) {
                try {
                  await putEncr(
                    'messages',
                    {
                      ...m,
                      read: true,
                    } as MessageType,
                    key,
                  );
                } catch (err) {
                  console.error('[P2PChat] Failed to update message read state', err);
                }
              }
            } catch (err) {
              console.error('[P2PChat] Failed to fetch messages to mark as read', err);
            }
            return;
          }

          if (parsed.type === 'closed') {
            console.log(`[P2PChat] ${otherUser.username} left the chat.`);
            return;
          }

          const ecdh = createECDHkey();

          if (!user?.private) {
            console.error('[P2PManager] No private key found');
            return;
          }
          ecdh.setPrivateKey(Buffer.from(user.private, 'hex'));

          const msg = returnDecryptedMessage(ecdh, parsed);
          const rooms = (await getAllDecr('rooms', key)) ?? [];
          const currentRoomId = findRoomIdByPeer(rooms, otherUser.userId);

          // console.log(`[P2PManager] path: ${pathname}, roomId: ${roomId}, activeRoomId: ${activeRoomId}`);
          await putEncr(
            'messages',
            {
              roomId: currentRoomId,
              senderId: otherUser.userId,
              message: msg,
              timestamp: Date.now(),
              sent: true,
              read: false,
            } as MessageType,
            key,
          );

          // Show notification only if not in the active chat
          // if (pathname !== '/chat' || activeRoomId !== roomId) {
          sendLocalNotification(`${otherUser.username ?? 'Anonymous'}`, msg);
          // }
        } catch (err) {
          console.error('[P2PManager] Failed to handle incoming message', err);
        }
      });
      if (connection.isConnected()) {
        const payload = JSON.stringify({ type: 'closed', roomId });
        connection.send(payload);
      }
    };
  }, [connection, user, otherUser, roomId, key, putEncr]);

  // Track connection status
  useEffect(() => {
    if (!connection) {
      setConnected(false);
      return;
    }
    const interval = setInterval(() => {
      const isConnected = connection.isConnected();
      setConnected(isConnected);
    }, 500);
    return () => clearInterval(interval);
  }, [connection]);

  // Send message
  const sendMessage = useCallback(
    async (message: string) => {
      if (!user?.userId || !otherUser?.userId || !roomId || !key) {
        console.warn('[sendMessage] Missing required data, aborting send');
        return;
      }

      // Ensure a connection exists and is ready
      let conn = connection;
      if (!conn) {
        console.log('[sendMessage] Connection missing, creating one...');
        try {
          conn = await connectToPeer({
            id: otherUser.userId,
            pubkey: otherUser.public,
            username: otherUser.username,
          });
          if (!conn) {
            console.warn('[sendMessage] Failed to create connection');
            return;
          }
          setConnection(conn);
        } catch (err) {
          console.error('[sendMessage] Error creating connection', err);
          return;
        }
      }

      // Optimistic UI update
      setMessages((prev) => [...prev, { id: ++currentMsgId, text: message, sender: 'me', read: false }]); 
      //setSeen(false);

      const encrText = prepareSendMessagePackage(otherUser.public, message);
      const payload = JSON.stringify(encrText);

      // Ensure the connection is ready to send
      const trySend = async () => {
        if (conn?.isConnected()) {
          console.log('[sendMessage] Sending message...');
          conn.send(payload);
        } else {
          console.log('[sendMessage] Connection not yet ready, waiting...');
          // Wait for connection to stabilize (Chromium fix)
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (conn?.isConnected()) {
            conn.send(payload);
          } else {
            console.warn('[sendMessage] Connection failed to become ready');
          }
        }
      };

      await trySend();

      // Always save locally, even if message isn’t sent yet
      try {
        await putEncr(
          'messages',
          {
            roomId,
            senderId: user.userId,
            message,
            timestamp: Date.now(),
            sent: conn?.isConnected() ?? false,
            read: true,
          } as MessageType,
          key,
        );
      } catch (err) {
        console.error('[sendMessage] Failed to store message locally', err);
      }

      if (userLeft) {
        setSeen(false);
      }
    },
    [connection, connectToPeer, user, otherUser, roomId, key, putEncr],
  );

  if (!db || !rooms || !user) return <Loading />;
  if (!roomId) return <EmptyState msg="No room selected" />;
  if (!room) return <EmptyState msg="Room not found" />;

  return (
    <div className="flex flex-col">
      <Chat
        title={room.name}
        messages={messages}
        href={`/chat/options?id=${room.roomId}`}
        onSend={sendMessage}
        room={room}
        connected={connected}
        seen={seen}
      />
    </div>
  );
}