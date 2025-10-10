'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { EllipsisVertical, Send, User, Users, Smile, ArrowDown } from 'lucide-react';
import EmptyState from './EmptyState';
import { RoomType } from '@chat/core/types';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

export interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
}

interface ChatProps {
  title?: string;
  messages: Message[];
  onSend: (msg: string) => void;
  href: string;
  isTyping?: boolean;
  connected: boolean;
  room: RoomType;
}

export function Chat({
  title,
  messages,
  onSend,
  href,
  connected = false,
  isTyping = false,
  room,
}: ChatProps) {
  const [input, setInput] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);

  const sendMessage = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  // Detect if user scrolled up
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    setIsAtBottom(nearBottom);
  };

  // Scroll to bottom only if user is at bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (isAtBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  // Add scroll listener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setIsAtBottom(true);
  };

  return (
    <div className="flex flex-col w-full bg-background relative" style={{ height: '94vh' }}>
      {/* --- Top Bar --- */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="flex flex-row items-center gap-2">
          {room.type === 'single' ? <User /> : <Users />}
          <h2 className="text-lg font-bold truncate">{title}</h2>
          {connected && <span className="text-green-500">●</span>}
        </div>
        <Link href={href}>
          <EllipsisVertical className="w-5 h-5" />
        </Link>
      </div>

      {/* --- Scrollable Messages --- */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-900"
      >
        {messages.length === 0 && <EmptyState msg="Start the conversation!" />}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`px-3 py-2 max-w-[70%] break-words ${
                msg.sender === 'me'
                  ? 'bg-primary text-white rounded-t-lg rounded-l-lg rounded-br-none'
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
      </div>

      {/* --- Floating Scroll Button --- */}
      {!isAtBottom && (
        <Button
          variant={"secondary"}
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 p-2 rounded-full shadow-lg"
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
      )}

      {/* --- Bottom Bar --- */}
      <div className="sticky bottom-0 z-10 flex items-center gap-2 px-4 py-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        {/* Emoji Button + Picker Popup */}
        <div className="relative" ref={emojiRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEmojiOpen((prev) => !prev)}
            className="rounded-full"
            aria-label="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </Button>

          {emojiOpen && (
            <div className="absolute bottom-full mb-2 left-0 z-50 bg-white dark:bg-gray-800 shadow-lg border rounded-2xl overflow-hidden">
              <Picker
                data={data}
                onEmojiSelect={(emoji: any) => {
                  setInput((prev) => prev + emoji.native);
                }}
                theme="light"
              />
            </div>
          )}
        </div>

        {/* Text Input */}
        <Input
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />

        {/* Send Button */}
        <Button onClick={sendMessage}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
