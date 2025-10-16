'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, Suspense } from 'react';
import Sidebar from './Sidebar';
import { ToastProvider } from './ToastContext';
import { ConfirmProvider } from './ConfirmContext';
import { ClientProvider } from '@/hooks/useClient';
import { PeerProvider } from '@/contexts/PeerContext';

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login')
    return (
      <Suspense>
        <ConfirmProvider>{children}</ConfirmProvider>
      </Suspense>
    );

  return (
    <Suspense>
      <ClientProvider>
        <PeerProvider>
          <ConfirmProvider>
            <ToastProvider>
              <Sidebar>{children}</Sidebar>
            </ToastProvider>
          </ConfirmProvider>
        </PeerProvider>
      </ClientProvider>
    </Suspense>
  );
}
