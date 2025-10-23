import { ClientProvider } from '@/contexts/ClientContext';
import { ReactNode } from 'react';
import { P2PProvider } from './P2PContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
import { ToastProvider } from '@/contexts/ToastContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ClientProvider>
      <ConfirmProvider>
        <ToastProvider>
          <P2PProvider>{children}</P2PProvider>
        </ToastProvider>
      </ConfirmProvider>
    </ClientProvider>
  );
}
