'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import EmptyState from '@/components/local/EmptyState';
import { MessageType } from '@chat/core';
import { WebRTCConnection } from '@chat/sockets/webrtc';
import useClient from '@/hooks/useClient';
import { prepareSendMessagePackage, returnDecryptedMessage } from '@/lib/messaging';
import { createECDHkey } from '@chat/crypto';

let currentMsgId = 0;

export default function P2PChatPage() {
  const connectionRef = useRef<WebRTCConnection | null>(null);

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);

  const { db, getAllDecr, putEncr } = useDB();
  const { user, key } = useAuth();
  const searchParams = useSearchParams();
  const { rooms } = useRooms();
  const { client, status } = useClient();

  const roomId = useMemo(() => searchParams?.get('id') ?? null, [searchParams]);
  const room = useMemo(() => rooms?.find((r) => r.roomId === roomId) ?? null, [rooms, roomId]);
  const otherUser = useMemo(
    () => room?.keys.find((k) => k.userId !== user?.userId) ?? null,
    [room, user?.userId],
  );

  const userECDH = useMemo(() => {
    if (!user?.private) return null;
    const e = createECDHkey();
    e.setPrivateKey(Buffer.from(user.private, 'hex'));
    return e;
  }, [user?.private]);

  // Load local messages
  useEffect(() => {
    if (!db || !roomId || !key || !user?.userId) return;

    (async () => {
      try {
        const allMessages = (await getAllDecr('messages', key)) as MessageType[];
        const roomMessages = allMessages
          .filter((m) => m.roomId === roomId)
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(
            (m) =>
              ({
                id: ++currentMsgId, // Assign a unique local ID
                text: m.message,
                sender: m.senderId === user.userId ? 'me' : 'other',
              } as Message),
          );

        setMessages(roomMessages);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    })();
  }, [db, roomId, key, user?.userId, getAllDecr]);

  // Connect to signaling server
  useEffect(() => {
    if (!client || status !== 'connected') return;
    if (client.ws) setWs(client.ws);
  }, [client, status]);

  // Track connection state using the new isConnected method
  useEffect(() => {
    const conn = connectionRef.current;
    if (!conn) {
      setConnected(false);
      return;
    }

    let lastState: boolean | null = null;

    const pollConnection = () => {
        const isOpen = conn.isConnected();

        if (isOpen !== lastState) {
            lastState = isOpen;
            setConnected(isOpen);
        }
    };

    const interval = setInterval(pollConnection, 500);
    pollConnection(); // Initial check

    return () => clearInterval(interval);
  }, [setConnected]);

  // WebRTC connection setup & message handling
  useEffect(() => {
    if (!ws || !otherUser?.userId || !user?.userId || !userECDH || !roomId || !key) return;

    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const setupConnection = async () => {
      if (!mounted) return;

      try {
        // Close previous connection before creating a new one
        connectionRef.current?.close();
        connectionRef.current = null;

        const conn = new WebRTCConnection({
          ws,
          peerId: otherUser.userId,
          myId: user.userId,
          onMessage: async (encrMsg) => {
            if (!mounted || !encrMsg) return;

            let parsed: any;
            try {
              parsed = JSON.parse(encrMsg);
            } catch {
              return;
            }

            const msg = returnDecryptedMessage(userECDH, parsed);
            
            // Use the current value of the key and putEncr without relying on closure
            putEncr(
              'messages',
              {
                roomId,
                senderId: otherUser.userId,
                message: msg,
                timestamp: Date.now(),
                sent: true,
              } as MessageType,
              key,
            );

            setMessages((prev) => [...prev, { id: ++currentMsgId, text: msg, sender: 'other' }]);
          },
          onLog: (m) => console.log('[WebRTC]', m),
        });

        connectionRef.current = conn;
        console.log('WebRTC connection established');
      } catch (err) {
        console.error('WebRTC setup failed, retrying in 3s...', err);
        retryTimer = setTimeout(setupConnection, 3000);
      }
    };

    setupConnection();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      // Clean up the connection created in this run
      connectionRef.current?.close();
      connectionRef.current = null;
      setConnected(false);
    };
  }, [ws, user?.userId, otherUser?.userId, roomId, userECDH, key]); 

  // Core logic to find and send unsent messages
  const processUnsentMessages = useCallback(async () => {
    const conn = connectionRef.current;
    if (!connected || !db || !roomId || !key || !user?.userId || !conn || !conn.isConnected() || !otherUser) {
        return;
    }

    try {
      const allMessages = (await getAllDecr('messages', key)) as MessageType[];
      const unsentMessages = allMessages.filter(
        (m) => m.roomId === roomId && m.senderId === user.userId && m.sent === false
      ).sort((a, b) => a.timestamp - b.timestamp);
      
      if (unsentMessages.length === 0) return;

      console.log(`[Resend Poll] Attempting to re-send ${unsentMessages.length} unsent messages...`);

      for (const msg of unsentMessages) {
        
        const encrText = prepareSendMessagePackage(otherUser.public, msg.message);
        const text = JSON.stringify(encrText);

        conn.send(text);

        await putEncr(
          'messages',
          {
            ...msg,
            sent: true,
          } as MessageType,
          key,
        );
      }
    } catch (err) {
      console.error('[Resend Poll] Failed to re-send unsent messages', err);
    }
  }, [connected, db, roomId, key, user?.userId, otherUser, getAllDecr, putEncr]);

  useEffect(() => {
    if (connected) {
        processUnsentMessages();
    }
    
    if (connected) {
        const interval = setInterval(() => {
            processUnsentMessages();
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }
  }, [connected, processUnsentMessages]);


  // Local message logger
  const logMessage = useCallback((text: string, sender: 'me' | 'other') => {
    setMessages((prev) => [...prev, { id: ++currentMsgId, text, sender }]);
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (message: string) => {
      if (!key || !user?.userId || !otherUser || !roomId) return;

      logMessage(message, 'me');

      const encrText = prepareSendMessagePackage(otherUser.public, message);
      const text = JSON.stringify(encrText);

      const conn = connectionRef.current;
      
      const canSendImmediately = conn && conn.isConnected();
      
      if (conn) {
        // Send the message. The WebRTCConnection class will internally queue it if the channel is not open.
        conn.send(text);
      } else {
        console.warn('WebRTCConnection not ready, message will be stored as unsent.');
      }
      
      const sentStatus = conn ? canSendImmediately : false;

      // Store message locally
      try {
        await putEncr(
          'messages',
          {
            roomId,
            senderId: user.userId,
            message: message,
            timestamp: Date.now(),
            sent: sentStatus,
          } as MessageType,
          key,
        );
        
        if (!sentStatus) {
            console.log("Message stored as unsent. Will retry when connected.");
        }
        
      } catch (err) {
        console.error('Failed to store message locally', err);
      }
      
    },
    [key, roomId, user?.userId, otherUser, putEncr, logMessage],
  );

  if (!db || !rooms || !user) return <Loading />;
  if (!roomId) return <EmptyState msg="No room selected" />;
  if (!room) return <EmptyState msg="Room not found" />;

  return (
    <div className="flex flex-col h-full min-h-screen">
      <Chat
        title={room.name}
        messages={messages}
        href={`/chat/options?id=${room.roomId}`}
        onSend={sendMessage}
        room={room}
        connected={connected}
      />
    </div>
  );
}
