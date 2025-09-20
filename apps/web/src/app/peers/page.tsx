'use client';

import { useEffect, useState } from "react";
import { getSignalingClient } from "@/lib/signalingClient";
import type { PeerInfo } from "@chat/sockets";
import EmptyState from "@/components/local/EmptyState";


export default function Peers() {
  const [peers, setPeers] = useState<PeerInfo[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function setup() {
      try {
        const client = await getSignalingClient();

        const handlePeers = (peersList: any) => {
          if (!isMounted) return;
          if (Array.isArray(peersList)) {
            setPeers(peersList);
          } else {
            console.warn("Received peers is not an array", peersList);
            setPeers([]);
          }
        };

        client.on("peers", handlePeers);
        client.requestPeers();

        return () => {
          client.off("peers", handlePeers);
          isMounted = false;
        };
      } catch (err) {
        console.error("Signaling client not initialized:", err);
      }
    }

    setup();
  }, []);

  console.log(peers);
  if (!peers.length) return <EmptyState msg="No peers online" />;

  return (
    <ul>
      {peers.map((p) => (
        <li key={p.id}>{p.nickname} ({p.id})</li>
      ))}
    </ul>
  );
}
