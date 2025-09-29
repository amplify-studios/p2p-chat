'use client';

import { createContext, useContext, useState, useCallback, JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: number;
  message: string;
  duration: number;
  position: ToastPosition;
  type: ToastType;
}

interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastType,
    duration?: number,
    position?: ToastPosition,
  ) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      duration = 3000,
      position: ToastPosition = 'bottom-right',
    ) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, duration, position, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [],
  );

  const icons: Record<ToastType, JSX.Element> = {
    info: <Info className="w-4 h-4 text-blue-500" />,
    success: <CheckCircle className="w-4 h-4 text-green-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    error: <XCircle className="w-4 h-4 text-red-500" />,
  };

  const styles: Record<ToastType, string> = {
    info: 'border-blue-500 bg-blue-50 text-blue-800',
    success: 'border-green-500 bg-green-50 text-green-800',
    warning: 'border-yellow-500 bg-yellow-50 text-yellow-800',
    error: 'border-red-500 bg-red-50 text-red-800',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {['top-right', 'top-left', 'bottom-right', 'bottom-left'].map((pos) => (
        <div
          key={pos}
          className={`fixed z-50 p-4 space-y-2 pointer-events-none
            ${pos.includes('top') ? 'top-4' : 'bottom-4'}
            ${pos.includes('right') ? 'right-4' : 'left-4'}
          `}
        >
          <AnimatePresence>
            {toasts
              .filter((t) => t.position === pos)
              .map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border shadow-md pointer-events-auto ${styles[t.type]}`}
                >
                  {icons[t.type]}
                  <span className="text-sm font-medium">{t.message}</span>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return ctx;
}
