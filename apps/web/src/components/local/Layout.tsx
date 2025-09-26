'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { ToastProvider } from './ToastContext';

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') return children;

  return (
    <ToastProvider>
      <Sidebar>
        {children}
      </Sidebar>
    </ToastProvider>
  );
}
