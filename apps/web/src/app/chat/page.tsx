'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useEffect, useRef, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import { getSignalingClient } from '@/lib/signalingClient';
import EmptyState from '@/components/local/EmptyState';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const msgId = useRef(0);
  const db = useDB();
  const user = useAuth(true);
  const searchParams = useSearchParams();
  const roomId = searchParams?.get('id');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  const { rooms } = useRooms();
  const room = rooms.find((r) => r.roomId === roomId);

  useEffect(() => {
    if(!db) return;
    if(!roomId) return;
    if(!room || room.type !== 'single') return;
    if(!room.keys.at(0)?.userId) return;

    (async () => {
      const peerId = room.keys.at(0)?.userId as string;
      const signalingClient = await getSignalingClient();

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const channel = pc.createDataChannel('chat');
      channelRef.current = channel;

      channel.onopen = () => console.log('Data channel open!');
      channel.onmessage = (e) => {
        const text = e.data;
        msgId.current += 1;
        setMessages((prev) => [...prev, { id: msgId.current, text, sender: 'other' }]);
        // Save to DB
        db.put('messages', {
          roomId,
          senderId: peerId,
          message: text,
          timestamp: Date.now()
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signalingClient.sendCandidate(peerId, event.candidate);
        }
      };

      // Listen for signaling messages
      const handleOffer = async (msg: any) => {
        if (msg.from !== peerId) return;
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signalingClient.sendAnswer(peerId, answer);
      };

      const handleAnswer = async (msg: any) => {
        if (msg.from !== peerId) return;
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
      };

      const handleCandidate = async (msg: any) => {
        if (msg.from !== peerId) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      };

      signalingClient.on('offer', handleOffer);
      signalingClient.on('answer', handleAnswer);
      signalingClient.on('candidate', handleCandidate);

      // Create and send offer if we are the initiator
      const init = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signalingClient.sendOffer(peerId, offer);
      };
      init();

      return () => {
        pc.close();
        signalingClient.off?.('offer', handleOffer);
        signalingClient.off?.('answer', handleAnswer);
        signalingClient.off?.('candidate', handleCandidate);
      };
    })();

  }, [room, db]);

  useEffect(() => {
    if (!db || !roomId) return;

    (async () => {
      const allMessages = await db.getAll('messages');
      const roomMessages = allMessages
        .filter((m) => m.roomId === roomId)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((m, idx) => ({
          id: idx + 1,
          text: m.message,
          sender: m.senderId === user?.userId ? 'me' : 'other' as "me" | "other",
        }));

      msgId.current = roomMessages.length;
      setMessages(roomMessages);
    })();
  }, [db, roomId, user]);

  if (!db || !rooms || !user) return <Loading />;
  if (!roomId) return <EmptyState msg='No room selected' />

  if (!room) return <EmptyState msg='Room not found' />

  const logMessage = (text: string, sender: 'me' | 'other') => {
    msgId.current += 1;
    setMessages((prev) => [...prev, { id: msgId.current, text, sender }]);
  };

  const sendMessage = (text: string) => {
    logMessage(text, 'me');

    // Send via data channel if available
    if (channelRef.current && channelRef.current.readyState === 'open') {
      channelRef.current.send(text);
    }

    // Save locally
    db.put('messages', {
      roomId,
      senderId: user.userId,
      message: text,
      timestamp: Date.now()
    });
  };

  return (
    <div className="flex flex-col h-full min-h-screen">
      <Chat
        title={room?.name}
        messages={messages}
        href={`/options?id=${room?.roomId}`}
        onSend={sendMessage}
      />
    </div>
  );
}
