'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useRef, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const msgId = useRef(0);
  const db = useDB();
  const user = useAuth(true);
  const searchParams = useSearchParams();
  const roomId = searchParams?.get('id');

  const { rooms } = useRooms();

  if (!db || !rooms) return <Loading />;

  if (!roomId) {
    return (
      <h1 className="flex text-2xl items-center justify-center min-h-screen bg-gray-50">
        No room selected
      </h1>
    );
  }

  const roomExists = rooms.some((room) => room.roomId === roomId);
  if (!roomExists) {
    return (
      <h1 className="flex text-2xl items-center justify-center min-h-screen bg-gray-50">
        Room not found
      </h1>
    );
  }

  const logMessage = (text: string, sender: 'me' | 'other') => {
    msgId.current += 1;
    setMessages((prev) => [...prev, { id: msgId.current, text, sender }]);
  };

  const sendMessage = (text: string) => {
    logMessage(text, 'me');
    db.put('messages', {
      roomId, // use the actual roomId from URL
      senderId: user?.userId as string,
      message: text,
    });
  };

  return <Chat title={roomId} messages={messages} onSend={sendMessage} />;
}
