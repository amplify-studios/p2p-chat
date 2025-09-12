"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Message {
  id: number;
  text: string;
  sender: "me" | "other";
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, text: input, sender: "me" },
    ]);
    setInput("");

    // Simulate other user typing
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: prev.length + 1, text: "Reply to: " + input, sender: "other" },
      ]);
      setIsTyping(false);
    }, 1000);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
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
            className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`px-3 py-2 rounded-lg max-w-[70%] ${
                msg.sender === "me"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg max-w-[70%] bg-gray-200 dark:bg-gray-700 text-black dark:text-white italic">
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
            if (e.key === "Enter") sendMessage();
          }}
        />
        <Button onClick={sendMessage}>Send</Button>
      </CardFooter>
    </Card>
  );
}

