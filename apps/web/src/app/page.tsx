'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useRef, useState } from 'react';
import { MessageType } from '@chat/core';
import { addMessage } from '@/lib/storage';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const msgId = useRef(0);

  const logMessage = (text: string, sender: 'me' | 'other') => {
    msgId.current += 1;
    setMessages((prev) => [...prev, { id: msgId.current, text, sender }]);
  };

  const sendMessage = (text: string) => {
    logMessage(text, 'me');
    addMessage()
  };

  return <Chat messages={messages} onSend={sendMessage} />;
}
