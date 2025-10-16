'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { WebRTCConnection } from '@chat/sockets/webrtc';
import { PeerInfo } from '@chat/sockets';
import { createECDHkey } from '@chat/crypto';
import { returnDecryptedMessage } from '@/lib/messaging';
import { useDB } from '@/hooks/useDB';
import { findRoomIdByPeer } from '@/lib/utils';
import { MessageType } from '@chat/core';
import { useClient } from '@/hooks/useClient';
import { useAuth } from '@/hooks/useAuth';
import { useBlocks } from '@/hooks/useBlocks';

interface P2PContextValue {
  connections: Record<string, WebRTCConnection>;
  createConnection: (
    peer: PeerInfo,
    ws: WebSocket,
    myId: string,
    onMessage?: (msg: string) => void,
    onLog?: (msg: string) => void
  ) => WebRTCConnection;
  getConnection: (peerId: string) => WebRTCConnection | undefined;
  sendMessage: (peerId: string, msg: string) => void;
  closeConnection: (peerId: string) => void;
  closeAllConnections: () => void;
  setOnMessage: (peerId: string, cb: (msg: string) => void) => void;
  connectToPeer: (friend: PeerInfo) => void;
}

const P2PContext = createContext<P2PContextValue | null>(null);
export const useP2P = () => {
  const ctx = useContext(P2PContext);
  if (!ctx) throw new Error('useP2P must be used inside <P2PProvider>');
  return ctx;
};

export const P2PProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const connectionsRef = useRef<Record<string, WebRTCConnection>>({});
  const { putEncr, getAllDecr } = useDB();
  const { client } = useClient();
  const { user, key } = useAuth();
  const { blocks } = useBlocks();

  const createConnection = useCallback(
    (
      peer: PeerInfo,
      ws: WebSocket,
      myId: string,
      onMessage?: (msg: string) => void,
      onLog?: (msg: string) => void
    ): WebRTCConnection => {
      let conn = connectionsRef.current[peer.id];
      if (conn) {
        if (onMessage) conn.setOnMessage(onMessage);
        if (onLog) conn.setOnLog(onLog);
        return conn;
      }

      conn = new WebRTCConnection({ ws, myId, peerId: peer.id, onMessage, onLog });
      connectionsRef.current[peer.id] = conn;
      return conn;
    },
    []
  );

  const setOnMessage = useCallback((peerId: string, cb: (msg: string) => void) => {
    const conn = connectionsRef.current[peerId];
    if (conn) conn.setOnMessage(cb);
  }, []);

  const getConnection = useCallback((peerId: string) => {
    return connectionsRef.current[peerId];
  }, []);

  const sendMessage = useCallback((peerId: string, msg: string) => {
    const conn = connectionsRef.current[peerId];
    if (conn) conn.send(msg);
    else console.warn(`[P2P] Tried to send message but no connection for ${peerId}`);
  }, []);

  const closeConnection = useCallback((peerId: string) => {
    const conn = connectionsRef.current[peerId];
    if (conn) conn.close();
    delete connectionsRef.current[peerId];
  }, []);

  const closeAllConnections = useCallback(() => {
    Object.values(connectionsRef.current).forEach((c) => c.close());
    connectionsRef.current = {};
  }, []);

  const connectToPeer = useCallback(
    (friend: PeerInfo) => {
      if (!client?.ws || !user || !key || !user.private) return;
      if (blocks.find((b) => b.userId === friend.id)) return;
      if (connectionsRef.current[friend.id]) return;

      const conn = createConnection(
        friend,
        client.ws,
        user.userId,
        async (encrMsg) => {
          try {
            const parsed = JSON.parse(encrMsg);
            const ecdh = createECDHkey();
            ecdh.setPrivateKey(Buffer.from(user.private!, 'hex'));
            const msg = returnDecryptedMessage(ecdh, parsed);
            const rooms = (await getAllDecr('rooms', key)) ?? [];
            const roomId = findRoomIdByPeer(rooms, friend.id);

            await putEncr(
              'messages',
              { roomId, senderId: friend.id, message: msg, timestamp: Date.now(), sent: true, read: false } as MessageType,
              key
            );
          } catch (err) {
            console.error('[P2P] Failed to handle incoming message', err);
          }
        },
        (log) => console.log(`[WebRTC] ${log}`)
      );

      console.log(`[P2P] Connected to ${friend.username}`);
    },
    [client?.ws, user, key, blocks, createConnection, getAllDecr, putEncr]
  );

  /** --- Cleanup on unmount --- */
  useEffect(() => {
    return () => {
      Object.values(connectionsRef.current).forEach((c) => c.close());
      connectionsRef.current = {};
    };
  }, []);

  return (
    <P2PContext.Provider
      value={{
        connections: connectionsRef.current,
        createConnection,
        getConnection,
        sendMessage,
        closeConnection,
        closeAllConnections,
        setOnMessage,
        connectToPeer,
      }}
    >
      {children}
    </P2PContext.Provider>
  );
};
