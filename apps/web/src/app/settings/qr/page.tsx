'use client';

import QrScanner from '@/components/local/QrScanner';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function Qr() {
  const router = useRouter();
  const { showToast } = useToast();

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-4">
      <div className="h-125 w-full max-w-md aspect-square bg-black rounded-lg overflow-hidden shadow-lg">
        <QrScanner
          onScan={(data) => {
            try {
              const url = new URL(data);

              if (url.origin === window.location.origin) {
                router.push(url.pathname + url.search + url.hash);
              } else {
                showToast('Invalid QR code: not from this site', 'error');
              }
            } catch {
              showToast('Invalid QR code', 'error');
            }
          }}
        />
      </div>
      <Button variant="secondary" onClick={() => router.push('/settings')}>
        Cancel
      </Button>
    </div>
  );
}
