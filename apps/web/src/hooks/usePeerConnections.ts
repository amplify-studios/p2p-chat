import { useEffect, useRef, useMemo } from 'react';
import { WebRTCConnection } from '@chat/sockets/webrtc';
import { useAuth } from './useAuth';
import { PeerInfo } from '@chat/sockets';
import useClient from './useClient';

export interface ConnectionsMap {
  [peerId: string]: WebRTCConnection;
}

export function usePeerConnections(peers: PeerInfo[]) {
  const { client } = useClient();
  const { user } = useAuth();
  const connectionsRef = useRef<ConnectionsMap>({});

  useEffect(() => {
    if (!client?.ws || !user) return;

    peers.forEach((peer) => {
      if (!client?.ws || !user) return;
      if (!connectionsRef.current[peer.id]) {
        const conn = new WebRTCConnection({
          ws: client.ws,
          myId: user.userId,
          peerId: peer.id,
          onLog: (msg) => console.log(`[WebRTC ${peer.username}]`, msg),
        });
        connectionsRef.current[peer.id] = conn;
      }
    });

    // Cleanup only on unmount
    return () => {
      Object.values(connectionsRef.current).forEach((conn) => conn.close());
      connectionsRef.current = {};
    };
  }, [peers, client, user]);

  // Memoize so the returned object reference is stable
  const connections = useMemo(() => ({ ...connectionsRef.current }), [connectionsRef.current]);
  return { connections };
}
