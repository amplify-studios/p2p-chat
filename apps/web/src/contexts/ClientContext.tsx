import { getSignalingClient } from '@/lib/signalingClient';
import { SignalingClient } from '@chat/sockets';
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, } from 'react';

type ClientContextType = {
  client: SignalingClient | null;
  status: 'idle' | 'connecting' | 'connected' | 'failed';
  reconnect: () => void;
};

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SignalingClient | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const connectingRef = useRef(false);

  const connect = useCallback(async () => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    setStatus('connecting');

    try {
      const signalingClient = await Promise.race([
        getSignalingClient(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout connecting to signaling server')), 5000),
        ),
      ]);

      setClient(signalingClient);
      setStatus('connected');
    } catch (err) {
      console.error('Failed to initialize signaling client:', err);
      setClient(null);
      setStatus('failed');
    } finally {
      connectingRef.current = false;
    }
  }, []);

  useEffect(() => {
    connect();
  }, [connect]);

  const reconnect = useCallback(() => {
    if (status === 'connecting') return;
    connect();
  }, [connect, status]);

  return (
    <ClientContext.Provider value={{ client, status, reconnect }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}
