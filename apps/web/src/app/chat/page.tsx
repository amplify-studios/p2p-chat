'use client';

import { Chat, Message } from '@/components/local/Chat';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import { prepareSendMessagePackage, returnDecryptedMessage } from '@/lib/messaging';
import EmptyState from '@/components/local/EmptyState';
import { CredentialsType, MessageType } from '@chat/core';
import { createECDHkey } from '@chat/crypto';
import crypto from 'crypto';
import { getSignalingClient } from '@/lib/signalingClient';
import { connectToPeer } from '@chat/sockets';
import { sendMessage as webrtcSendMessage } from '@chat/sockets/webrtc';
import { setupPeerConnection, startConnection } from '@chat/sockets/webrtc2';

// TODO: Remove

type SignalMessage =
  | { sdp: RTCSessionDescriptionInit }
  | { candidate: RTCIceCandidateInit };

export default function ChatPage() {
  let prevDebug: any;
  let debug: any;
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const socketRef = useRef<WebSocket | null>(null);


  const [messages, setMessages] = useState<Message[]>([]);
  const msgId = useRef(0);

  const { db, getAllDecr, putEncr } = useDB();
  const { user, key } = useAuth();
  const searchParams = useSearchParams();

  // stable roomId derived from searchParams
  const roomId = useMemo(() => searchParams?.get('id') ?? null, [searchParams]);

  const { rooms } = useRooms();
  const room = useMemo(() => rooms?.find((r) => r.roomId === roomId) ?? null, [rooms, roomId]);
  
  const otherUser: CredentialsType | null = useMemo(() => {
    const info = room?.keys.find((k) => k.userId !== user?.userId) ?? null;
    if (!info) {
      return null;
    } else {
      return {
        userId: info.userId,
        public: info.public,
        username: info.username,
      };
    }
  }, [room]);

  // Keep ECDH instances stable across renders
  const userECDHRef = useRef<crypto.ECDH | null>(null);
  useEffect(() => {
    if (!user?.private) return;
    if (!userECDHRef.current) userECDHRef.current = createECDHkey();
    userECDHRef.current.setPrivateKey(user.private, 'hex');
  }, [user?.private]);

  // const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  // const [peerConnection, setPeerConnection] = useState<RTCPeerConnection>();
  
  // Load messages once when relevant primitives change
  useEffect(() => {
    let mounted = true;
    // if (!db || !roomId || !key || !user?.userId) return;
    if (!db || !roomId || !key || !user?.userId) return;
    
    (async () => {
      try {
        const allMessages = (await getAllDecr('messages', key)) as MessageType[];
        const roomMessages = allMessages
          .filter((m) => m.roomId === roomId)
          .sort((a, b) => a.timestamp - b.timestamp)
          .map((m, idx) => ({
            id: idx + 1,
            text: m.message,
            sender: m.senderId === user.userId ? 'me' : ('other' as 'me' | 'other'),
          }));

        if (!mounted) return;

        msgId.current = roomMessages.length;
        // Avoid setting state if nothing changed (shallow content check)
        setMessages((prev) => {
          if (
            prev.length === roomMessages.length &&
            prev.every(
              (p, i) => p.text === roomMessages[i].text && p.sender === roomMessages[i].sender,
            )
          ) {
            return prev;
          }
          return roomMessages;
        });
      } catch (err) {
        console.error('failed loading messages', err);
      }
      
      // if (peerConnectionRef.current) return;
      
      // try {
      //   const client = await getSignalingClient();
      //   const pc = await connectToPeer(client, otherUser.userId, (msg) => {
      //     console.log("📩 Message from peer:", msg);
      //     if (!mounted) return;
      //     console.log("📩 Message from peer:", msg);
      //     // msgId.current += 1;
      //     // setMessages((prev) => [
      //     //   ...prev,
      //     //   { id: msgId.current, text: msg, sender: "other" },
      //     // ]);

      //   });

      //   if (mounted) peerConnectionRef.current = pc;

      // } catch (err) {
      //   console.error('Failed to connect to peer', err);
      // }
    })();
    


    return () => {
      mounted = false;
      // peerConnectionRef.current?.close();
      // peerConnectionRef.current = null;
    };
  // }, [db, roomId, key, user?.userId]);
  }, [db, roomId, key, user?.userId]);

  // useEffect(() => {
  //   let mounted = true;

  //   if (!otherUser?.userId) return;

  //   (async () => {
  //     if (peerConnectionRef.current) return;
      
  //     try {
  //       const client = await getSignalingClient();
  //       const pc = await connectToPeer(client, otherUser.userId, (msg) => {
  //         console.log("📩 Message from peer:", msg);
  //         if (!mounted) return;
  //         console.log("📩 Message from peer:", msg);
  //         // msgId.current += 1;
  //         // setMessages((prev) => [
  //         //   ...prev,
  //         //   { id: msgId.current, text: msg, sender: "other" },
  //         // ]);

  //       });

  //       if (mounted) peerConnectionRef.current = pc;

  //     } catch (err) {
  //       console.error('Failed to connect to peer', err);
  //     }
  //   })();

  //   return () => {
  //     mounted = false;
  //     peerConnectionRef.current?.close();
  //     peerConnectionRef.current = null;
  //   };
  // }, [otherUser?.userId]);
// -----------------------------------------------------------------------------

useEffect(() => {
  (async () => {
    const peerdata = setupPeerConnection();
    await startConnection(peerdata.pcRef, peerdata.socketRef);
    dcRef.current = peerdata.dcRef.current;
    pcRef.current = peerdata.pcRef.current;
    socketRef.current = peerdata.socketRef.current;
  });
}, [dcRef, pcRef, socketRef]);


// -----------------------------------------------------------------------------


  const logMessage = useCallback((text: string, sender: 'me' | 'other') => {
    msgId.current += 1;
    setMessages((prev) => [...prev, { id: msgId.current, text, sender }]);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!key || !user?.userId) return;
      logMessage(text, "me");

      
      // const channel = (peerConnectionRef.current as any)?.chatChannel as
      //   | RTCDataChannel
      //   | undefined;
      
      // if (channel && channel.readyState === "open") {
        if (!otherUser) return;
        try {
          const sendData = prepareSendMessagePackage(otherUser.public, text);
          console.log('sendData', sendData);
          if (!dcRef.current || dcRef.current.readyState !== "open") return;
          dcRef.current.send(text);
          // webrtcSendMessage(otherUser.userId, sendData);
      } catch (err) {
        console.error('Failed to send message over WebRTC', err);
      }
      // } else {
        // console.warn("DataChannel not open yet");
      // }

      if (otherUser) {
        await putEncr(
          "messages",
          {
            roomId,
            senderId: user.userId,
            message: text,
            timestamp: Date.now(),
          } as MessageType,
          key
        );
      }
    },
    [key, roomId, user?.userId, otherUser, putEncr, logMessage]
  );

  // function deepDiff(obj1, obj2) {
  // const diffs = {};

  // function findDiff(o1, o2, path = "") {
  //     for (const key of new Set([...Object.keys(o1 || {}), ...Object.keys(o2 || {})])) {
  //       const fullPath = path ? `${path}.${key}` : key;

  //       if (typeof o1?.[key] === "object" && typeof o2?.[key] === "object") {
  //         findDiff(o1[key], o2[key], fullPath);
  //       } else if (o1?.[key] !== o2?.[key]) {
  //         diffs[fullPath] = { from: o1?.[key], to: o2?.[key] };
  //       }
  //     }
  //   }

  //   findDiff(obj1, obj2);
  //   return diffs;
  // }


  useEffect(() => {
    debug = {
      roomId,
      room: room,
      userId: user?.userId,
      keyExists: !!key,
      dbExists: !!db,
      roomsLen: rooms?.length,
      // otherUserPublicKeyLen: otherUser?.public.length,
      messagesLen: messages.length,
      userPublicKey: user?.public,
      // otherUser: otherUser,
    };

    // console.log(deepDiff(prevDebug, debug));
    if (prevDebug != debug) {
      console.log('ChatPage render debug', debug);
      prevDebug = debug;
    }else{
      console.log('ChatPage render debug same');
    }
  }, [roomId, user, !!key, !!db, rooms?.length, messages.length]);
  // }, [roomId, user, !!key, !!db, rooms?.length, otherUser, messages.length]);

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
      />
    </div>
  );
}

ChatPage.whyDidYouRender = true;