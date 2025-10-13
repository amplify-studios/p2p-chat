// IMPORTANT: THIS SHOULD NOT BE USED
// This hook works but the lib/peerStore.ts file should be used instead

import { useEffect } from 'react';
import { WebRTCConnection } from '@chat/sockets/webrtc';
import { PeerInfo } from '@chat/sockets';
import { useClient } from './useClient';
import { useAuth } from './useAuth';

export interface ConnectionsMap {
  [peerId: string]: WebRTCConnection;
}

let globalConnections: ConnectionsMap = {}; // singleton across app

export function usePeerConnections(peers: PeerInfo[], onMessage?: (peerId: string, msg: string) => void) {
  const { client } = useClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!client?.ws || !user) return;

    peers.forEach((peer) => {
      if (!client?.ws || !user) return;
      if (!globalConnections[peer.id]) {
        globalConnections[peer.id] = new WebRTCConnection({
          ws: client.ws,
          myId: user.userId,
          peerId: peer.id,
          onMessage: (msg) => {
            if (onMessage && msg) onMessage(peer.id, msg);
          },
          onLog: (msg) => console.log(`[WebRTC ${peer.username}]`, msg),
        });
      } else if (onMessage) {
        globalConnections[peer.id].setOnMessage((msg) => {
          if (msg) onMessage(peer.id, msg);
        });
      }
    });

    // Cleanup on unmount — but only remove connections if no other component uses them
    return () => {
      // optional: only close connections here if needed
      // we could implement a refcount mechanism to know if a connection is still in use
    };
  }, [client?.ws, user?.userId, peers, onMessage]);

  return globalConnections;
}

