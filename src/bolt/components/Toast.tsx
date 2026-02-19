import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import type { Notification } from '../types/pass';

interface ToastProps {
  notification: Notification;
  onDismiss: () => void;
}

export default function Toast({ notification, onDismiss }: ToastProps) {
  const isSuccess = notification.type === 'success';

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onDismiss]);

  return (
    <div
      className={`
        rounded-xl border px-4 py-3 shadow-sm animate-slide-in
        ${
          isSuccess
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {isSuccess ? (
          <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{notification.message}</p>
          {notification.fieldErrors && notification.fieldErrors.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {notification.fieldErrors.map((err, i) => (
                <li key={i} className="text-xs text-red-600">
                  <span className="font-medium">{err.field}:</span> {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={`
            p-1 rounded-md transition-colors flex-shrink-0
            ${
              isSuccess
                ? 'hover:bg-emerald-100 text-emerald-400 hover:text-emerald-600'
                : 'hover:bg-red-100 text-red-400 hover:text-red-600'
            }
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
