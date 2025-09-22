'use client';

import { useEffect, useState } from "react";
import { getSignalingClient } from "@/lib/signalingClient";
import type { PeerInfo, PeersMessage } from "@chat/sockets";

export function usePeers() {
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      try {
        const client = await getSignalingClient();

        const handlePeers = (msg: PeersMessage) => {
          if (!isMounted) return;

          const peersList = msg.peers;
          if (Array.isArray(peersList)) {
            setPeers(peersList);
          } else {
            console.warn("Received peers is not an array", peersList);
            setPeers([]);
          }
          setLoading(false);
        };

        client.on("peers", handlePeers);
        client.requestPeers();

        return () => {
          client.off("peers", handlePeers);
          isMounted = false;
        };
      } catch (err) {
        console.error("Signaling client not initialized:", err);
        setLoading(false);
      }
    };

    setup();
  }, []);

  return { peers, loading };
}

