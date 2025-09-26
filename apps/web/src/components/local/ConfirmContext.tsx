"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx.confirm;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<
    ((value: boolean) => void) | null
  >(null);

  const confirm = (opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      setResolver(() => resolve);
    });
  };

  const handleClose = (result: boolean) => {
    setOptions(null);
    if (resolver) resolver(result);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {options && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg w-full max-w-sm"
          >
            {options.title && (
              <h2 className="text-lg font-bold mb-2">{options.title}</h2>
            )}
            <p className="mb-4">{options.message}</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
              >
                {options.cancelText || "Cancel"}
              </Button>
              <Button
                variant="default"
                onClick={() => handleClose(true)}
              >
                {options.confirmText || "Confirm"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
