'use client';

import QrScanner from '@/components/local/QrScanner';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function Qr() {
  // TODO: redirect to home if not mobile

  const router = useRouter();

  return (<>
    <QrScanner onScan={function(data: string): void {
      router.push(data);
      } } />
  </>);
}
