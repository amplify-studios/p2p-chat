'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, Suspense } from 'react';
import Sidebar from './Sidebar';
import { ToastProvider } from './ToastContext';
import { ConfirmProvider } from './ConfirmContext';
import { IndexDBProvider } from './IndexDBContext';

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
      <IndexDBProvider>
        <ConfirmProvider>
          <ToastProvider>
            <Sidebar>{children}</Sidebar>
          </ToastProvider>
        </ConfirmProvider>
      </IndexDBProvider>
    </Suspense>
  );
}
