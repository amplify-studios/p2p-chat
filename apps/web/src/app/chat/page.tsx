'use client';

import { Chat, Message } from '@/components/local/Chat';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import { prepareSendMessagePackage, returnDecryptedMessage } from '@/lib/messaging';
import EmptyState from '@/components/local/EmptyState';
import { MessageType } from '@chat/core';

// TODO: Remove
import crypto from 'crypto';
import { createECDHkey } from '@chat/crypto';
import { getSignalingClient } from '@/lib/signalingClient';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const msgId = useRef(0);

  const { db, getAllDecr, putEncr } = useDB();
  const { user, key } = useAuth();
  const searchParams = useSearchParams();

  // stable roomId derived from searchParams
  const roomId = useMemo(() => searchParams?.get('id') ?? null, [searchParams]);

  const { rooms } = useRooms();
  const room = useMemo(() => rooms?.find((r) => r.roomId === roomId) ?? null, [rooms, roomId]);

  const otherUserPublic = room?.keys.find((k) => k.userId !== user?.userId)?.public;
  const otherUserPublicKey: string = useMemo(() => {
    return otherUserPublic?.toString() ?? '';
    // if (!otherUserPublic) return new Uint8Array();
    // return new Uint8Array(Buffer.from(otherUserPublic, 'hex'));
  }, [otherUserPublic]);

  // Keep ECDH instances stable across renders
  const userECDHRef = useRef<crypto.ECDH | null>(null);
  useEffect(() => {
    if (!user?.private) return;
    if (!userECDHRef.current) userECDHRef.current = createECDHkey();
    userECDHRef.current.setPrivateKey(user.private, 'hex');
  }, [user?.private]);

  // Load messages once when relevant primitives change
  useEffect(() => {
    let mounted = true;
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
            sender: m.senderId === user.userId ? 'me' : ('other' as 'me' | 'other'),
          }));

        if (!mounted) return;

        // Avoid setting state if nothing changed (shallow content check)
        setMessages((prev) => {
          if (
            prev.length === roomMessages.length &&
            prev.every(
              (p, i) => p.text === roomMessages[i].text && p.sender === roomMessages[i].sender,
            )
          ) {
            return prev;
          }
          return roomMessages;
        });
      } catch (err) {
        console.error('failed loading messages', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [db, roomId, key, user?.userId]);

  const logMessage = useCallback((text: string, sender: 'me' | 'other') => {
    msgId.current += 1;
    setMessages((prev) => [...prev, { id: msgId.current, text, sender }]);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!key || !user?.userId) return;
      logMessage(text, 'me');

      // prepareSendMessagePackage expects a Uint8Array
      const sendData = prepareSendMessagePackage(otherUserPublicKey, text);
      console.log('sendData', sendData);

      // persist locally
      await putEncr(
        'messages',
        {
          roomId,
          senderId: user.userId,
          message: text,
          timestamp: Date.now(),
        } as MessageType,
        key,
      );
    },
    [key, otherUserPublicKey, roomId, user?.userId, putEncr, logMessage],
  );

  useEffect(() => {
    console.log('ChatPage render debug', {
      roomId,
      userId: user?.userId,
      keyExists: !!key,
      dbExists: !!db,
      roomsLen: rooms?.length,
      otherUserPublicKeyLen: otherUserPublicKey.length,
      messagesLen: messages.length,
      userPublicKey: user?.public,
      otherUserPublic: otherUserPublicKey,
    });
  }, [roomId, user, !!key, !!db, rooms?.length, otherUserPublicKey, messages.length]);

  if (!db || !rooms || !user) return <Loading />;
  if (!roomId) return <EmptyState msg="No room selected" />;
  if (!room) return <EmptyState msg="Room not found" />;

  return (
    <div className="flex flex-col h-full min-h-screen">
      <Chat
        title={room.name}
        messages={messages}
        href={`/options?id=${room.roomId}`}
        onSend={sendMessage}
      />
    </div>
  );
}
