'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, Suspense } from 'react';
import Sidebar from './Sidebar';
import { ToastProvider } from './ToastContext';
import { ConfirmProvider } from './ConfirmContext';
import { ClientProvider } from '@/hooks/useClient';
// import { DBProvider } from '@/hooks/useDB';

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
        <ConfirmProvider>
          <ToastProvider>
            <Sidebar>{children}</Sidebar>
          </ToastProvider>
        </ConfirmProvider>
        </ClientProvider>
    </Suspense>
  );
}
