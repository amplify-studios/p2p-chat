'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
}

interface ChatProps {
  messages: Message[];
  onSend: (msg: string) => void;
  isTyping?: boolean;
}

export function Chat({ messages, onSend, isTyping = false }: ChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isTyping]);

  return (
    <Card className="w-full max-w-md h-[500px] flex flex-col">
      <CardHeader>
        <h2 className="text-lg font-bold">Chat</h2>
      </CardHeader>

      <CardContent
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 p-2 bg-gray-50 dark:bg-gray-900"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`px-3 py-2 max-w-[70%] ${
                msg.sender === 'me'
                  ? 'bg-blue-500 text-white rounded-t-lg rounded-l-lg rounded-br-none'
                  : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded-t-lg rounded-r-lg rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="px-3 py-2 max-w-[70%] bg-gray-200 dark:bg-gray-700 text-black dark:text-white italic rounded-t-lg rounded-r-lg rounded-bl-none">
              typing...
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex space-x-2">
        <Input
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
        />
        <Button onClick={sendMessage}>Send</Button>
      </CardFooter>
    </Card>
  );
}
