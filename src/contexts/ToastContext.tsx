import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Toast, ToastType } from '@/types';

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newToast = { ...toast, id, duration: toast.duration ?? 5000 };
    setToasts(prev => [...prev.slice(-4), newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 z-[9998] flex flex-col gap-2 sm:left-auto">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const colors: Record<ToastType, string> = {
    success: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    error: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    info: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    warning: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
  };

  const iconColors: Record<ToastType, string> = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    info: 'text-blue-500',
    warning: 'text-amber-500',
  };

  return (
    <div
      className={`relative w-full max-w-md rounded-xl border-l-4 p-4 shadow-lg backdrop-blur-lg sm:min-w-[320px] ${colors[toast.type]} animate-in slide-in-from-right-8 fade-in duration-400`}
      style={{ animation: 'slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >
      <div className="flex items-start gap-3">
        <span className={iconColors[toast.type]}>
          {toast.type === 'success' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          {toast.type === 'error' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
          {toast.type === 'info' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          {toast.type === 'warning' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
        </span>
        <div className="flex-1">
          <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100">{toast.title}</h4>
          {toast.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30 rounded-b-xl"
        style={{
          width: '100%',
          animation: `shrink ${toast.duration}ms linear forwards`,
        }}
      />
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
