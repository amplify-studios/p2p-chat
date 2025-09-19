'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useRef, useState } from 'react';
import { add } from '@chat/core';
import { createECDHkey, computeSecret, secretMatch, generateAESKey, AESencrypt, AESdecrypt } from '@chat/crypto';


export default function Home() {
  const message = 'Hello World';

  const user_keys = createECDHkey();
  const other_keys = createECDHkey();

  const user_secret = computeSecret(user_keys, other_keys.getPublicKey('hex'));
  const other_secret = computeSecret(other_keys, user_keys.getPublicKey('hex'));
  console.log(secretMatch(user_secret, other_secret));

  const user_aes_key = generateAESKey(user_secret);
  const encrypted = AESencrypt(user_aes_key, message);

  const other_aes_key = generateAESKey(other_secret);
  const decrypted = AESdecrypt(other_aes_key, encrypted.encryptedMessage, encrypted.authTag);

  console.log(decrypted);

  const [messages, setMessages] = useState<Message[]>([]);
  const msgId = useRef(0);

  const logMessage = (text: string, sender: 'me' | 'other') => {
    msgId.current += 1;
    setMessages((prev) => [...prev, { id: msgId.current, text, sender }]);
  };

  const sendMessage = (text: string) => {
    logMessage(text, 'me');
  };

  logMessage(decrypted, 'other');

  return <Chat messages={messages} onSend={sendMessage} />;
}
