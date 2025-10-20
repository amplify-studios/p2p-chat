'use client';


import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { WebRTCConnection } from '@chat/sockets/webrtc';
import { PeerInfo } from '@chat/sockets';

interface ConnectionsMap {
  [peerId: string]: WebRTCConnection;
}

interface ConnectionState {
  [peerId: string]: {
    status: 'connecting' | 'connected' | 'failed' | 'disconnected';
    lastAttempt: number;
    retryCount: number;
    isInitiator: boolean;
  };
}


interface PeerStoreContextType {
  getConnection: (peerId: string) => WebRTCConnection | undefined;
  createConnection: (
    peer: PeerInfo,
    ws: WebSocket,
    myId: string,
    onMessage?: (msg: string) => void,
    onLog?: (msg: string) => void
  ) => WebRTCConnection;
  setOnMessage: (peerId: string, callback: (msg: string) => void) => void;
  setOnLog: (peerId: string, callback: (msg: string) => void) => void;
  sendMessage: (peerId: string, msg: string) => void;
  getAllConnections: () => ConnectionsMap;
  closeConnection: (peerId: string) => void;
  closeAllConnections: () => void;
}


const PeerStoreContext = createContext<PeerStoreContextType | undefined>(undefined);



export function usePeerStore() {
  const context = useContext(PeerStoreContext);
  if (context === undefined) {
    throw new Error('usePeerStore must be used within a PeerStoreProvider');
  }
  return context;
}

interface PeerStoreProviderProps {
  children: ReactNode;
}

// const connectionsRef: ConnectionsMap = {};

export function PeerStoreProvider({ children }: PeerStoreProviderProps) {
  const connectionsRef = useRef<ConnectionsMap>({});
  const connectionStatesRef = useRef<ConnectionState>({});
  const retryTimeoutsRef = useRef<{ [peerId: string]: NodeJS.Timeout }>({});



  const getConnection = (peerId: string) => {
    return connectionsRef.current[peerId];
  }

  const createConnection = (
  peer: PeerInfo,
  ws: WebSocket,
  myId: string,
  onMessage?: (msg: string) => void,
  onLog?: (msg: string) => void
): WebRTCConnection => {
  if (!connectionsRef.current[peer.id]) {
    connectionsRef.current[peer.id] = new WebRTCConnection({
      ws,
      myId,
      peerId: peer.id,
      onMessage,
      onLog,
    });
  } else if (onMessage) {
    connectionsRef.current[peer.id].setOnMessage(onMessage);
  } else if (onLog) {
    connectionsRef.current[peer.id].setOnLog(onLog);
  }
  return connectionsRef.current[peer.id];
}

const setOnMessage = (peerId: string, callback: (msg: string) => void) => {
  connectionsRef.current[peerId]?.setOnMessage(callback);
}

const setOnLog = (peerId: string, callback: (msg: string) => void) => {
  connectionsRef.current[peerId]?.setOnLog(callback);
}

const sendMessage = (peerId: string, msg: string) => {
  const conn = connectionsRef.current[peerId];
  if (conn) conn.send(msg);
  else console.warn(`[peerStore] Tried to send message but no connection for ${peerId}`);
}

const getAllConnections = () => {
  return { ...connectionsRef.current };
}

const closeConnection = (peerId: string) => {
  if (connectionsRef.current[peerId]) {
    connectionsRef.current[peerId].close();
    delete connectionsRef.current[peerId];
  }
}

const closeAllConnections = () => {
  Object.values(connectionsRef.current).forEach((c) => c.close());
  for (const id in connectionsRef.current) delete connectionsRef.current[id];
}

  const ensureBidirectionalConnection = (
    peer: PeerInfo,
    ws: WebSocket,
    myId: string,
    onMessage?: (msg: string) => void,
    onLog?: (msg: string) => void
  ): WebRTCConnection => {
    const now = Date.now();
    const state = connectionStatesRef.current[peer.id];

    if (!state) {
      connectionStatesRef.current[peer.id] = {
        status: 'connecting',
        lastAttempt: now,
        retryCount: 0,
        isInitiator: true,
      };
    }

    let connection = connectionsRef.current[peer.id];
    if (!connection) {
      
      const delay = 2000;

      setTimeout(() => {
        connection = new WebRTCConnection({
          ws,
          myId,
          peerId: peer.id,
          onMessage,
          onLog,
        });
        connectionsRef.current[peer.id] = connection;

        const monitorConnection = () => {
          const isConnected = connection!.isConnected();
          const newStatus = isConnected ? 'connected' : 'connecting';

          if (connectionStatesRef.current[peer.id]?.status !== newStatus) {
            console.log(`[peerStore] Connection state for ${peer.username}: ${newStatus}`);
            updateConnectionState(peer.id, newStatus);

            if (newStatus === 'connected') {
              clearRetryTimeout(peer.id);
            }
          }

          if (!isConnected) {
            setTimeout(monitorConnection, delay);
          }
        };

        monitorConnection();
      }, delay);
    } else {

      if (onMessage) {
        connection.setOnMessage(onMessage);
      }
      if (onLog) {
        connection.setOnLog(onLog);
      }
    }

    return connection || connectionsRef.current[peer.id];
  };

  const clearRetryTimeout = (peerId: string) => {
    if (retryTimeoutsRef.current[peerId]) {
      clearTimeout(retryTimeoutsRef.current[peerId]);
      delete retryTimeoutsRef.current[peerId];
    }
  };


  const updateConnectionState = (peerId: string, status: 'connecting' | 'connected' | 'failed' | 'disconnected') => {
    if (connectionStatesRef.current[peerId]) {
      connectionStatesRef.current[peerId].status = status;
      connectionStatesRef.current[peerId].lastAttempt = Date.now();
    }
  };

const value: PeerStoreContextType = {
    getConnection,
    createConnection,
    setOnMessage,
    setOnLog,
    sendMessage,
    getAllConnections,
    closeConnection,
    closeAllConnections,
  };

  return (
    <PeerStoreContext.Provider value={value}>
      {children}
    </PeerStoreContext.Provider>
  );

}