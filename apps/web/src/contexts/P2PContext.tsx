import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { p2pManager } from '@/lib/P2PManager';
import { PeerInfo, WebRTCConnection } from '@chat/sockets';
import { useClient } from './ClientContext';
import { useAuth } from '@/hooks/useAuth';
import { useBlocks } from '@/hooks/useBlocks';
import { useDB } from './DBContext';
import { usePathname } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';

interface P2PContextValue {
  getConnection: (peerId: string) => WebRTCConnection | undefined;
  isReady: (peerId: string) => boolean;
  sendMessage: (peerId: string, msg: string) => void;
  connectToPeer: (peer: PeerInfo) => Promise<WebRTCConnection | undefined>;
  closeConnection: (peerId: string) => void;
  setOnMessage: (id: string, onMessage: (msg: string) => void) => void;
  closeAll: () => void;
}

const P2PContext = createContext<P2PContextValue | null>(null);

export const useP2P = () => {
  const ctx = useContext(P2PContext);
  if (!ctx) throw new Error('useP2P must be used inside <P2PProvider>');
  return ctx;
};

export const P2PProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { client } = useClient();
  const { user, key } = useAuth();
  const { blocks } = useBlocks();
  const { putEncr, getAllDecr } = useDB();
  const pathname = usePathname();
  const { activeRoomId } = useRooms();

  const connectToPeerWrapper = useCallback(
    async (peer: PeerInfo) => {
      if (!client?.ws || !user || !key) return undefined;
      return p2pManager.connectToPeer(
        peer,
        client.ws,
        user.userId,
        key,
        getAllDecr,
        putEncr,
        blocks,
        undefined,
        pathname,
        activeRoomId,
        user
      );
    },
    [client?.ws, user, key, getAllDecr, putEncr, blocks]
  );
  return (
    <P2PContext.Provider
      value={{
        getConnection: p2pManager.getConnection.bind(p2pManager),
        isReady: p2pManager.isReady.bind(p2pManager),
        sendMessage: p2pManager.sendMessage.bind(p2pManager),
        connectToPeer: connectToPeerWrapper,
        closeConnection: p2pManager.closeConnection.bind(p2pManager),
        setOnMessage: p2pManager.setOnMessage.bind(p2pManager),
        closeAll: p2pManager.closeAll.bind(p2pManager),
      }}
    >
      {children}
    </P2PContext.Provider>
  );
};
