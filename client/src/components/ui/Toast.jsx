import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

const ToastContext = createContext(null);

// Short confirmation messages in the bottom-right corner, announced to screen readers.
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const show = useCallback((message, { tone = 'success', duration = 4000 } = {}) => {
    clearTimeout(timer.current);
    setToast({ message, tone, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), duration);
  }, []);

  const value = useMemo(() => ({ show }), [show]);
  const Icon = toast?.tone === 'error' ? CircleAlert : CircleCheck;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-[60]"
      >
        {toast && (
          <div
            key={toast.key}
            className={cn(
              'flex max-w-sm items-center gap-3 rounded-ctl px-4 py-3 text-[14px] text-white shadow-pop',
              toast.tone === 'error' ? 'bg-pin-700' : 'bg-charcoal',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
