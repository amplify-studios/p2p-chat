import { getSignalingClient } from '@/lib/signalingClient';
import { SignalingClient } from '@chat/sockets';
import { useEffect, useState, useCallback } from 'react';

export default function useClient() {
  const [client, setClient] = useState<SignalingClient | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");

  const connect = useCallback(async () => {
    setStatus("connecting");

    try {
      const signalingClient = await Promise.race([
        getSignalingClient(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout connecting to signaling server")), 5000)
        ),
      ]);

      setClient(signalingClient as SignalingClient);
      if (signalingClient) setStatus("connected");
    } catch (err) {
      console.error("Failed to initialize signaling client:", err);
      setClient(null);
      setStatus("failed");
    }
  }, []);

  // Initial connection
  useEffect(() => {
    connect();
  }, [connect]);

  // Expose a reconnect method
  const reconnect = useCallback(() => {
    if (status === "connecting") return;
    connect();
  }, [connect, status]);

  return { client, status, reconnect };
}
