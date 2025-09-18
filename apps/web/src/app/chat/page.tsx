'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useRef, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const msgId = useRef(0);
  const db = useDB();
  const user = useAuth(true);
  const searchParams = useSearchParams();
  const roomId = searchParams?.get('id') ?? 'default-room';

  if(!db) {
    return <Loading />;
  }

  const logMessage = (text: string, sender: 'me' | 'other') => {
    msgId.current += 1;
    setMessages((prev) => [...prev, { id: msgId.current, text, sender }]);
  };

  const sendMessage = (text: string) => {
    logMessage(text, 'me');
    db.put("messages", {
      roomId: "room",
      senderId: user?.userId as string,
      message: text
    });
  };

  return (
    <Chat title={roomId} messages={messages} onSend={sendMessage} />
  );
}
