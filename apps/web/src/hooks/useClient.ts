import { getSignalingClient } from '@/lib/signalingClient';
import { SignalingClient } from '@chat/sockets';
import { useEffect, useState } from 'react';

export default function useClient() {
  const [client, setClient] = useState<SignalingClient | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchClient = async () => {
      try {
        const signalingClient = await getSignalingClient();
        if (isMounted) setClient(signalingClient);
      } catch (err) {
        console.error('Failed to initialize signaling client:', err);
      }
    };

    fetchClient();

    return () => {
      isMounted = false;
    };
  }, []);

  return { client };
}
