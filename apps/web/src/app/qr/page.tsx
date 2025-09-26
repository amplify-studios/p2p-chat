"use client";

import QrScanner from "@/components/local/QrScanner";
import { useRouter } from "next/navigation";

export default function Qr() {
  // TODO: redirect to home if not mobile

  const router = useRouter();

  return (
    <QrScanner
      onScan={(data) => {
        alert(`scanned: ${data}`);
        router.push("/");
      }}
    />
  );
}
