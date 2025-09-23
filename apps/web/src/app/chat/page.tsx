'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useEffect, useRef, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import { prepareSendMessagePackage, returnDecryptedMessage } from '@/lib/messaging';
import EmptyState from '@/components/local/EmptyState';
import { MessageType } from '@chat/core';

// TODO: Remove
import { createECDHkey, generateAESKey } from '@chat/crypto';
import { getSignalingClient } from '@/lib/signalingClient';

import crypto from 'crypto';

import { AESdecrypt, AESencrypt } from '@chat/crypto';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const msgId = useRef(0);
  const db = useDB();
  const user = useAuth(true);
  const userECDH = createECDHkey();
  const searchParams = useSearchParams();
  const roomId = searchParams?.get('id');

  const { rooms } = useRooms();
  const room = rooms.find((r) => r.roomId === roomId);

  useEffect(() => {
    if (!db || !roomId) return;

    if (!user?.private) return;
    // userECDH.setPrivateKey(user.private);

    (async () => {
      const allMessages = await db.getAll('messages');
      const roomMessages = allMessages
        .filter((m) => m.roomId === roomId)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((m, idx) => ({
          id: idx + 1,
          text: m.message,
          sender: m.senderId === user?.userId ? 'me' : 'other' as "me" | "other",
        }));

      msgId.current = roomMessages.length;
      setMessages(roomMessages);
    })();
  }, [db, roomId, user]);

  if (!db || !rooms || !user) return <Loading />;
  if (!roomId) return <EmptyState msg='No room selected' />
  if (!room) return <EmptyState msg='Room not found' />

  const logMessage = (text: string, sender: 'me' | 'other') => {
    msgId.current += 1;
    setMessages((prev) => [...prev, { id: msgId.current, text, sender }]);
  };

  const sendMessage = (text: string) => {
    logMessage(text, 'me');

    // TODO: Get the other user's key
    const otherUserKey = createECDHkey();
    userECDH.setPrivateKey(otherUserKey.getPrivateKey())

    // TODO: Send message
    const sendData = prepareSendMessagePackage(otherUserKey.getPublicKey().toString('hex'), text);
    console.log(sendData);
    // getSignalingClient().then((c) => {

    //   // c.sendMessage(roomId, sendData.encryptedMessage, sendData.authTag, sendData.ephemeralPublicKey);
    // });
    logMessage(returnDecryptedMessage( userECDH , sendData), 'other');

    // Save locally
    db.put('messages', {
      roomId,
      senderId: user.userId,
      message: text,
      timestamp: Date.now()
    } as MessageType);
  };

  return (
    <div className="flex flex-col h-full min-h-screen">
      <Chat
        title={room?.name}
        messages={messages}
        href={`/options?id=${room?.roomId}`}
        onSend={sendMessage}
      />
    </div>
  );
}
