'use client';

import QrScanner from '@/components/local/QrScanner';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function Qr() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-4">
      <div className="h-125 w-full max-w-md aspect-square bg-black rounded-lg overflow-hidden shadow-lg">
        <QrScanner onScan={(data) => router.push(data)} />
      </div>
      <Button
        variant="secondary"
        onClick={() => router.push("/settings")}
      >
        Cancel
      </Button>
    </div>
  );
}
