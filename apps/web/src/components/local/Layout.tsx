'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, Suspense } from 'react';
import Sidebar from './Sidebar';
import { ConfirmProvider } from './ConfirmContext';
import Providers from '@/contexts/Providers';

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
      <Providers>
      <Sidebar>{children}</Sidebar>
      </Providers>
    </Suspense>
  );
}
