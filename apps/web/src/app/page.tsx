'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useRef, useState } from 'react';
import { add } from '@chat/core';
import { getRandomBytes } from '@chat/crypto';

export default function Home() {
  const c = add(2, 4);
  console.log(getRandomBytes);
  console.log(c);
  const [messages, setMessages] = useState<Message[]>([]);
  const msgId = useRef(0);

  const logMessage = (text: string, sender: 'me' | 'other') => {
    msgId.current += 1;
    setMessages((prev) => [...prev, { id: msgId.current, text, sender }]);
  };

  const sendMessage = (text: string) => {
    logMessage(text, 'other');
  };

  return <Chat messages={messages} onSend={sendMessage} />;
}
