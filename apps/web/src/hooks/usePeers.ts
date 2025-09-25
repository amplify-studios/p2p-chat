'use client';

import { useEffect, useState } from "react";
import { getSignalingClient } from "@/lib/signalingClient";
import type { PeerInfo, PeersMessage } from "@chat/sockets";
import { CredentialsType } from "@chat/core";
import { useDB } from "./useDB";
import { useAuth } from "./useAuth";

export interface Friend {
  id: string;
  username: string;
  online: boolean;
}

export function usePeers() {
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const { getAllDecr } = useDB();
  const { user, key } = useAuth();

  useEffect(() => {
    if (!key) {
      setPeers([]);
      setFriends([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const setup = async () => {
      try {
        const client = await getSignalingClient();

        const handlePeers = async (msg: PeersMessage) => {
          if (!isMounted) return;

          const peersList = msg.peers;
          if (!Array.isArray(peersList)) {
            console.warn("Received peers is not an array", peersList);
            setPeers([]);
            setFriends([]);
            setLoading(false);
            return;
          }

          setPeers(peersList);

          const creds = (await getAllDecr("credentials", key)) as CredentialsType[];

          const friendList: Friend[] = creds
            .filter((c) => c.userId !== user?.userId)
            .map((c) => ({
              id: c.userId,
              username: c.username,
              online: peersList.some((p) => p.id === c.userId),
            }));

          setFriends(friendList);
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
  }, [key, getAllDecr, user]);

  return { peers, friends, loading };
}
