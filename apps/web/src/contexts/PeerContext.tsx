'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { WebRTCConnection } from '@chat/sockets/webrtc';
import { PeerInfo } from '@chat/sockets';

interface PeerContextValue {
  connections: Record<string, WebRTCConnection>;
  createConnection: (
    peer: PeerInfo,
    ws: WebSocket,
    myId: string,
    onMessage?: (msg: string) => void,
    onLog?: (msg: string) => void
  ) => WebRTCConnection;
  getConnection: (peerId: string) => WebRTCConnection | null;
  sendMessage: (peerId: string, msg: string) => void;
  closeConnection: (peerId: string) => void;
  closeAllConnections: () => void;
  setOnMessage: (peerId: string, callback: (msg: string) => void) => void;
}

const PeerContext = createContext<PeerContextValue | null>(null);

export const usePeerConnections = () => {
  const ctx = useContext(PeerContext);
  if (!ctx) throw new Error('usePeerConnections must be used inside <PeerProvider>');
  return ctx;
};

export const PeerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connections, setConnections] = useState<Record<string, WebRTCConnection>>({});

  const createConnection = useCallback(
    (
      peer: PeerInfo,
      ws: WebSocket,
      myId: string,
      onMessage?: (msg: string) => void,
      onLog?: (msg: string) => void
    ) => {
      let conn: WebRTCConnection;

      setConnections((prev) => {
        // If already exists, reuse it and update handlers
        if (prev[peer.id]) {
          conn = prev[peer.id];
          if (onMessage) conn.setOnMessage(onMessage);
          if (onLog) conn.setOnLog(onLog);
          return prev;
        }

        // Otherwise, create new connection
        conn = new WebRTCConnection({
          ws,
          myId,
          peerId: peer.id,
          onMessage,
          onLog,
        });

        return { ...prev, [peer.id]: conn };
      });

      // Return the connection (new or existing)
      return conn!;
    },
    []
  );

  const getConnection = useCallback(
    (peerId: string) => connections[peerId] ?? null,
    [connections]
  );

  const setOnMessage = useCallback(
    (peerId: string, callback: (msg: string) => void) => {
      const conn = connections[peerId];
      if (conn) conn.setOnMessage(callback);
      else console.warn(`[peerContext] Tried to setOnMessage but no connection for ${peerId}`);
    },
    [connections]
  );

  const sendMessage = useCallback(
    (peerId: string, msg: string) => {
      const conn = connections[peerId];
      if (conn) conn.send(msg);
      else console.warn(`[peerContext] Tried to send message but no connection for ${peerId}`);
    },
    [connections]
  );

  const closeConnection = useCallback((peerId: string) => {
    setConnections((prev) => {
      const conn = prev[peerId];
      if (conn) conn.close();
      const copy = { ...prev };
      delete copy[peerId];
      return copy;
    });
  }, []);

  const closeAllConnections = useCallback(() => {
    Object.values(connections).forEach((c) => c.close());
    setConnections({});
  }, [connections]);

  return (
    <PeerContext.Provider
      value={{
        connections,
        createConnection,
        getConnection,
        sendMessage,
        closeConnection,
        closeAllConnections,
        setOnMessage,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};
