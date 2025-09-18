'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useRef, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import { Button } from '@/components/ui/button';
import Loading from '@/components/local/Loading';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const msgId = useRef(0);
  const db = useDB();
  
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
      senderId: "me",
      message: text
    });
  };

  const printMessages = async () => {
    const messages = await db?.getAll("messages");
    console.log(messages); 
  };

  return (<>
    <Chat messages={messages} onSend={sendMessage} />
    <Button
      onClick={printMessages}
    >
    Messages
    </Button>
  </>);
}
