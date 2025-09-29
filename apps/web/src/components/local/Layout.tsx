'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { ToastProvider } from './ToastContext';
import { ConfirmProvider } from './ConfirmContext';

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') return (
    <ConfirmProvider>
      {children}
    </ConfirmProvider>
  );

  return (
    <ConfirmProvider>
      <ToastProvider>
        <Sidebar>{children}</Sidebar>
      </ToastProvider>
    </ConfirmProvider>
  );
}
