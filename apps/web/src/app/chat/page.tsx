'use client';

import { Chat, Message } from '@/components/local/Chat';
import { useEffect, useRef, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';
import { getSignalingClient } from '@/lib/signalingClient';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const msgId = useRef(0);
  const db = useDB();
  const user = useAuth(true);
  const searchParams = useSearchParams();
  const roomId = searchParams?.get('id');
  // Refs for peer connection and data channel
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  const { rooms } = useRooms();
  const room = rooms.find((r) => r.roomId === roomId);

  // Initialize peer connection and signaling
  useEffect(() => {
    if(!db) return;
    if(!roomId) return;
    if(!room || room.type !== 'single') return;
    if(!room.keys.at(0)?.userId) return;

    const peerId = room.keys.at(0)?.userId as string;
    const signalingClient = getSignalingClient();

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
  }, [room, db]);

    if (!db || !rooms || !user) return <Loading />;
    if (!roomId) return <h1 className="flex text-2xl items-center justify-center min-h-screen bg-gray-50">No room selected</h1>;

    if (!room) return <h1 className="flex text-2xl items-center justify-center min-h-screen bg-gray-50">Room not found</h1>;

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
