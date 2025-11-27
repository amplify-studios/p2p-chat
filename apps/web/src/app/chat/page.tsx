'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDB } from '@/contexts/DBContext';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import EmptyState from '@/components/local/EmptyState';
import { MessageType, MessageTypeType } from '@chat/core';
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

  // Ensure we have a connection object
  useEffect(() => {
    if (!otherUser) return;

    let mounted = true;

    (async () => {
      try {
        let conn = getConnection(otherUser.userId);

        if (!conn) {
          // create a new connection and wait for it
          console.log('[P2PChat] No existing connection — creating one...');
          conn = await connectToPeer({
            id: otherUser.userId,
            pubkey: otherUser.public,
            username: otherUser.username,
          });

          if (!conn) {
            console.warn('[P2PChat] connectToPeer returned no connection');
            return;
          }
        } else {
          console.log('[P2PChat] Reusing existing connection');
        }

        if (!mounted) return;
        setConnection(conn);

        // If data channel already open, we can mark connected
        try {
          const isOpen = typeof conn.isConnected === 'function' ? conn.isConnected() : false;
          if (isOpen) setConnected(true);
          // If not open, attempt to attach an onopen handler if available
          // many WebRTC wrappers expose dataChannel or onOpen callbacks
          try {
            if ((conn as any).onOpen && typeof (conn as any).onOpen === 'function') {
              (conn as any).onOpen(() => {
                setConnected(true);
              });
            } else if ((conn as any).dataChannel) {
              (conn as any).dataChannel.onopen = () => setConnected(true);
            }
          } catch (e) {
            // non-fatal if wrapper doesn't expose these
          }
        } catch (e) {
          console.warn('[P2PChat] cannot determine initial connection state', e);
        }
      } catch (err) {
        console.error('[P2PChat] Failed to get/create connection', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [otherUser, getConnection, connectToPeer]);

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
                type: m.type,
                filename: m.filename,
                sender: m.senderId === user.userId ? 'me' : 'other',
                read: m.read,
              }) as Message,
          );
        setMessages(roomMessages);

        const unseenMessages = allMessages.filter((m) => m.roomId === roomId && m.read === false);
        for (const msg of unseenMessages) {
          try {
            await updateEncr('messages', key, msg.id, (decr) => ({ ...decr, read: true }));
          } catch (err) {
            console.error('[P2PChat] Failed to mark message read', err);
          }
        }

        // If connection already exists and is open, notify peer we've entered
        if (connection && typeof connection.isConnected === 'function' && connection.isConnected()) {
          try {
            connection.send(JSON.stringify({ type: 'entered', roomId }));
          } catch (e) {
            console.warn('[P2PChat] failed to send entered event', e);
          }
        }
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    })();
  }, [db, roomId, key, user?.userId, getAllDecr, updateEncr, connection]);

  // 3) Message handler registration (single source of truth)
  useEffect(() => {
    if (!connection || !user || !otherUser || !roomId || !key) return;

    const handler = async (encrMsg: string) => {
      if (!encrMsg) return;

      let parsed: any;
      try {
        parsed = JSON.parse(encrMsg);
      } catch {
        console.warn('Invalid message JSON');
        return;
      }

      if (parsed.type === 'opened') {
        console.log(`[P2PChat] ${otherUser.username} opened the chat.`);
        try {
          const allMessages = (await getAllDecr('messages', key)) as MessageType[];
          const msgsToUpdate = allMessages.filter(
            (m) => m.roomId === roomId && m.senderId === user.userId && !m.read,
          );

          for (const m of msgsToUpdate) {
            try {
              await putEncr('messages', { ...m, read: true } as MessageType, key);
            } catch (err) {
              console.error('[P2PChat] Failed to update message read state', err);
            }
          }

          setMessages((prev) => prev.map((msg) => (msg.sender === 'me' && !msg.read ? { ...msg, read: true } : msg)));
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

      if (parsed.type === 'entered') {
        console.log(`[P2PChat] ${otherUser.username} entered the chat.`);
        setUserLeft(false);

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
                  type: m.type,
                  filename: m.filename,
                  sender: m.senderId === user.userId ? 'me' : 'other',
                  read: m.read,
                }) as Message,
            );

          if (roomMessages.length > 0 && roomMessages[roomMessages.length - 1].sender !== 'me') {
            if (connection.isConnected()) connection.send(JSON.stringify({ type: 'opened', roomId }));
          } else {
            if (connection.isConnected()) connection.send(JSON.stringify({ type: 'requestSeen', roomId }));
          }
        } catch (err) {
          console.error('[P2PChat] Failed to handle entered', err);
        }
        return;
      }

      if (parsed.type === 'requestSeen') {
        console.log(`[P2PChat] ${otherUser.username} requested seen.`);
        const allMessages = (await getAllDecr('messages', key)) as MessageType[];
        const unseenMessages = allMessages.filter((m) => m.roomId === roomId && m.read === false);
        if (connection.isConnected() && unseenMessages.length === 0) {
          connection.send(JSON.stringify({ type: 'opened', roomId }));
        }
        return;
      }

      try {
        const userECDH = createECDHkey();
        if (!user?.private) return;
        userECDH.setPrivateKey(Buffer.from(user.private, 'hex'));
        const decrypted = returnDecryptedMessage(userECDH, parsed);
        const m = JSON.parse(decrypted);

        // UI update
        setMessages((prev) => [
          ...prev,
          { id: ++currentMsgId, text: m.content, type: m.type, filename: m.filename, sender: 'other', read: false },
        ]);
        setSeen(false);

        // Save locally
        try {
          await putEncr(
            'messages',
            {
              roomId,
              senderId: otherUser.userId,
              message: m.content as string,
              type: m.type as MessageTypeType,
              filename: m.filename as string,
              timestamp: Date.now(),
              sent: true,
              read: true,
            } as MessageType,
            key,
          );

          // Notify peer we opened (if connected)
          if (connection.isConnected()) {
            connection.send(JSON.stringify({ type: 'opened', roomId }));
          }
        } catch (err) {
          console.error('Failed to store incoming message', err);
        }
      } catch (err) {
        console.error('[P2PChat] Failed to decrypt/handle incoming message', err);
      }
    };

    setOnMessage(otherUser.userId, handler);

    // If the data channel is open right now, send entered event
    try {
      if (connection.isConnected()) {
        connection.send(JSON.stringify({ type: 'entered', roomId }));
      } else {
        // if not open, attach onOpen if available
        try {
          if ((connection as any).onOpen && typeof (connection as any).onOpen === 'function') {
            (connection as any).onOpen(() => {
              connection.send(JSON.stringify({ type: 'entered', roomId }));
            });
          } else if ((connection as any).dataChannel) {
            (connection as any).dataChannel.onopen = () => {
              connection.send(JSON.stringify({ type: 'entered', roomId }));
            };
          }
        } catch (e) {
          
        }
      }
    } catch (e) {
      console.warn('[P2PChat] Failed to send entered event immediately', e);
    }

    return () => {
      try {
        // remove message handler
        setOnMessage(otherUser.userId, () => {});
      } catch (e) {
        console.warn('[P2PChat] Failed to remove message handler', e);
      }

      try {
        if (connection && connection.isConnected()) {
          connection.send(JSON.stringify({ type: 'closed', roomId }));
        }
      } catch (e) {
        // ignore send errors during unmount
      }
    };
  }, [connection, user, otherUser, roomId, key, putEncr, getAllDecr, setOnMessage, putEncr]);

  // 4) Track connection status (poll safely)
  useEffect(() => {
    if (!connection) {
      setConnected(false);
      return;
    }
    let mounted = true;
    const interval = setInterval(() => {
      try {
        const isConnected = typeof connection.isConnected === 'function' ? connection.isConnected() : false;
        if (mounted) setConnected(isConnected);
      } catch (e) {
        if (mounted) setConnected(false);
      }
    }, 500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [connection]);

  // 5) Send message (ensures connection exists and is ready)
  const sendMessage = useCallback(
    async (message: string, type: MessageTypeType, filename?: string) => {
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
      setMessages((prev) => [...prev, { id: ++currentMsgId, text: message, type, filename, sender: 'me', read: false }]);

      const encrText = prepareSendMessagePackage(otherUser.public, { content: message, type, filename });
      const payload = JSON.stringify(encrText);

      // Ensure the connection is ready to send
      const trySend = async () => {
        if (conn?.isConnected()) {
          conn.send(payload);
          return true;
        }

        // Wait and retry
        await new Promise((res) => setTimeout(res, 300));
        if (conn?.isConnected()) {
          conn.send(payload);
          return true;
        }

        let sent = false;
        try {
          if ((conn as any).onOpen && typeof (conn as any).onOpen === 'function') {
            (conn as any).onOpen(() => {
              try {
                (conn as any).send(payload);
                sent = true;
              } catch (_) {}
            });
            await new Promise((r) => setTimeout(r, 500));
            return sent;
          } else if ((conn as any).dataChannel) {
            (conn as any).dataChannel.onopen = () => {
              try {
                (conn as any).send(payload);
                sent = true;
              } catch (_) {}
            };
            await new Promise((r) => setTimeout(r, 500));
            return sent;
          }
        } catch (e) {
          
        }

        console.warn('[sendMessage] Connection failed to become ready');
        return false;
      };

      const sentOk = await trySend();

      // Always save locally, even if message isn’t sent yet
      try {
        await putEncr(
          'messages',
          {
            roomId,
            senderId: user.userId,
            message,
            type,
            timestamp: Date.now(),
            sent: sentOk,
            read: true,
          } as MessageType,
          key,
        );
      } catch (err) {
        console.error('[sendMessage] Failed to store message locally', err);
      }

      if (userLeft) setSeen(false);
    },
    [connection, connectToPeer, user, otherUser, roomId, key, putEncr, userLeft],
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