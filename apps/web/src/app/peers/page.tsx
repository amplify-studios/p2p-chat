'use client';

import { useEffect, useState } from "react";
import { getSignalingClient } from "@/lib/signalingClient";
import type { PeerInfo, PeersMessage } from "@chat/sockets";
import EmptyState from "@/components/local/EmptyState";
import { useAuth } from "@/hooks/useAuth";

export default function Peers() {
  const user = useAuth(true);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-500">Loading peers...</p>
      </div>
    );
  }

  if (!peers.length) {
    return <EmptyState msg="No peers online" />;
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center text-foreground">Online Peers</h1>
      <ul className="space-y-2">
        {peers.map((p) => (
          <li
            key={p.id}
            className="flex justify-between items-center p-3 bg-card rounded shadow hover:bg-secondary transition"
          >
            <div>
              <p className="font-medium">{p.nickname || "Anonymous"}</p>
              <p className="text-sm text-gray-500">{p.id}</p>
            </div>
            <span className="text-sm text-green-500 font-semibold">● Online</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
