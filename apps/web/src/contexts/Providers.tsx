import { ClientProvider } from "@/hooks/useClient";
import { ReactNode } from "react";
import { P2PProvider } from "./P2PContext";
import { ConfirmProvider } from "@/components/local/ConfirmContext";
import { ToastProvider } from "@/components/local/ToastContext";

export default function Providers({children}: {children: ReactNode}) {
  return (
    <ClientProvider>
    <ConfirmProvider>
    <ToastProvider>
    <P2PProvider>

      {children}

    </P2PProvider>
    </ToastProvider>
    </ConfirmProvider>
    </ClientProvider>
  );
}
