'use client';

import { useEffect, useRef, useState } from 'react';
import { WebRTCConnection } from '@chat/sockets/webrtc';
import { useDB } from '@/hooks/useDB';
import { returnDecryptedMessage } from '@/lib/messaging';
import { MessageType } from '@chat/core';
import { useAuth } from './useAuth';
import { PeerInfo } from '@chat/sockets';
import { createECDHkey } from '@chat/crypto';
import { ConnectionsMap } from './usePeerConnections';

export interface ReceivedMessage {
  id: number;
  roomId: string;
  text: string;
  sender: 'me' | 'other';
}

let currentMsgId = 0;

/**
 * Hook to listen for incoming messages from multiple peers.
 * Ideal for a sidebar showing notifications from all friends.
 */
export function useP2PMessageReceiver(
  peers: PeerInfo[],
  connections: ConnectionsMap,
  peerId?: string
) {
  const { putEncr } = useDB();
  const { key, user } = useAuth();
  const [messages, setMessages] = useState<ReceivedMessage[]>([]);
  const userECDH = useRef<any>(null);

  if (!userECDH.current && user?.private) {
    const e = createECDHkey();
    e.setPrivateKey(Buffer.from(user.private, 'hex'));
    userECDH.current = e;
  }

  useEffect(() => {
    if (!key || !user || !userECDH.current) return;

    const handlers: { [peerId: string]: (msg: string) => void } = {};

    peers.forEach((peer) => {
      if(peerId && peer.id === peerId) {
        const conn = connections[peer.id];
        if (!conn) return;

        const handleMessage = async (encrMsg: string) => {
          if (!encrMsg) return;

          let parsed: any;
          try {
            parsed = JSON.parse(encrMsg);
          } catch {
            return;
          }

          const msg = returnDecryptedMessage(userECDH.current, parsed);

          try {
            await putEncr(
              'messages',
              {
                roomId: peer.id,
                senderId: peer.id,
                message: msg,
                timestamp: Date.now(),
                sent: true,
              } as MessageType,
              key,
            );
          } catch (err) {
            console.error('Failed to store incoming message', err);
          }

          setMessages((prev) => [
            ...prev,
            { id: ++currentMsgId, roomId: peer.id, text: msg, sender: 'other' },
          ]);
        };

        handlers[peer.id] = handleMessage;
        conn.setOnMessage(handleMessage);
      } 
    });

    return () => {
      peers.forEach((peer) => {
        const conn = connections[peer.id];
        if (conn) conn.setOnMessage(undefined);
      });
    };
  }, [key, user, peers, connections, putEncr]);

  return { messages, setMessages };
}
