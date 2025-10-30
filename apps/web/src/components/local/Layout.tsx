'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, Suspense } from 'react';
import Sidebar from './Sidebar';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
import Providers from '@/contexts/Providers';

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const noSidebarPaths = [
    "/login",
    "/intro"
  ];

  if (noSidebarPaths.some((p) => p === pathname))
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
