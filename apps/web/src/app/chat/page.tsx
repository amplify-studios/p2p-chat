'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    if (!db || !roomId || !user?.userId) return;
    setMessages([]);

    const fetchMessages = async () => {
      const allMessages = await db.getAll("messages");
      if (!allMessages) return;

      const filtered = allMessages.filter((msg) => msg.roomId === roomId);

      filtered.forEach((msg) => {
        const sender = msg.senderId === user.userId ? "me" : "other";
        msgId.current += 1;
        // TODO: here the message would be decrypted first
        setMessages((prev) => [
          ...prev,
          { id: msgId.current, text: msg.message, sender },
        ]);
      });
    };

    fetchMessages();
  }, [db, roomId, user?.userId]);

  const { rooms } = useRooms();

  if (!db || !rooms) return <Loading />;

  if (!roomId) {
    return (
      <h1 className="flex text-2xl items-center justify-center min-h-screen bg-gray-50">
        No room selected
      </h1>
    );
  }

  const room = rooms.find((room) => room.roomId === roomId);
  if (!room) {
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
      roomId,
      senderId: user?.userId as string,
      message: text,
      timestamp: Date.now()
    });
  };

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
