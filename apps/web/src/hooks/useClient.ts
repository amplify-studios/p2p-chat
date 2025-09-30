import { getSignalingClient } from '@/lib/signalingClient';
import { SignalingClient } from '@chat/sockets';
import { useEffect, useState } from 'react';

export default function useClient() {
  const [client, setClient] = useState<SignalingClient | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");

  useEffect(() => {
    let isMounted = true;

    const fetchClient = async () => {
      setStatus("connecting");

      try {
        const signalingClient = await Promise.race([
          getSignalingClient(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout connecting to signaling server")), 5000)
          ),
        ]);

        if (!isMounted) return;

        setClient(signalingClient as SignalingClient);
        if(signalingClient) setStatus("connected");
      } catch (err) {
        console.error("Failed to initialize signaling client:", err);
        if (isMounted) {
          setClient(null);
          setStatus("failed");
        }
      }
    };

    fetchClient();

    return () => {
      isMounted = false;
    };
  }, []);

  return { client, status };
}
