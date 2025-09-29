import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function ResponsiveQr({ qrValue }: { qrValue: string }) {
  const [size, setSize] = useState(400);

  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 500) {
        setSize(300);
      } else {
        setSize(400);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return <QRCodeCanvas value={qrValue} size={size} />;
}
