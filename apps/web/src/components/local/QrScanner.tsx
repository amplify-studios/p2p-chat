'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (data: string) => void;
}

export default function QrScanner({ onScan }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-scanner');
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          onScan(decodedText);
          stopScannerSafely();
        },
        (error) => {
          // console.warn("QR scan error:", error);
          alert(`QR scan error: ${error}`);
        },
      )
      .then(() => {
        startedRef.current = true; // mark as started
      })
      .catch((err) => {
        console.error('Failed to start scanner:', err);
      });

    const stopScannerSafely = async () => {
      if (scannerRef.current && startedRef.current) {
        try {
          await scannerRef.current.stop();
          startedRef.current = false;
        } catch (err) {
          console.warn('Failed to stop scanner:', err);
        }
      }
    };

    return () => {
      stopScannerSafely(); // cleanup only if started
    };
  }, [onScan]);

  return <div id="qr-scanner" style={{ width: '100%', height: '100%' }} />;
}
