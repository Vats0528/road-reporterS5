import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// Context pour les toasts
const ToastContext = createContext(null);

/**
 * Hook pour utiliser les toasts
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Provider pour le système de toasts
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    // Marquer comme "exiting" pour l'animation
    setToasts(prev => 
      prev.map(t => t.id === id ? { ...t, exiting: true } : t)
    );

    // Supprimer après l'animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 200);
  }, []);

  const success = useCallback((message, duration) => {
    return addToast(message, 'success', duration);
  }, [addToast]);

  const error = useCallback((message, duration) => {
    return addToast(message, 'error', duration);
  }, [addToast]);

  const warning = useCallback((message, duration) => {
    return addToast(message, 'warning', duration);
  }, [addToast]);

  const info = useCallback((message, duration) => {
    return addToast(message, 'info', duration);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, dismissToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

/**
 * Container pour afficher les toasts
 */
function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <Toast 
          key={toast.id} 
          {...toast} 
          onDismiss={() => onDismiss(toast.id)} 
        />
      ))}
    </div>
  );
}

/**
 * Composant Toast individuel
 */
function Toast({ message, type, exiting, onDismiss }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
    info: <Info className="w-5 h-5 flex-shrink-0" />
  };

  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500'
  };

  return (
    <div 
      className={`
        pointer-events-auto
        px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 
        text-white transform transition-all duration-300 ease-out
        ${colors[type]}
        ${exiting ? 'toast-exit' : 'animate-slide-up'}
      `}
      role="alert"
    >
      {icons[type]}
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onDismiss}
        className="p-1 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Composant de feedback de chargement
 */
export function LoadingOverlay({ message = "Chargement..." }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 animate-slide-up">
        <div className="spinner"></div>
        <p className="text-slate-700 font-medium">{message}</p>
      </div>
    </div>
  );
}

/**
 * Composant skeleton pour le chargement
 */
export function Skeleton({ className = '', variant = 'text' }) {
  const variants = {
    text: 'h-4 w-full',
    title: 'h-6 w-3/4',
    avatar: 'h-12 w-12 rounded-full',
    button: 'h-10 w-24 rounded-lg',
    card: 'h-32 w-full rounded-xl',
    image: 'h-48 w-full rounded-lg'
  };

  return (
    <div className={`skeleton ${variants[variant]} ${className}`} />
  );
}

/**
 * État vide
 */
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  actionLabel,
  className = '' 
}) {
  return (
    <div className={`empty-state ${className}`}>
      {Icon && <Icon className="empty-state-icon" />}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && actionLabel && (
        <button onClick={action} className="btn-primary mt-6">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Confirmation dialog
 */
export function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger" 
}) {
  if (!isOpen) return null;

  const confirmColors = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-amber-500 hover:bg-amber-600',
    success: 'bg-emerald-500 hover:bg-emerald-600',
    info: 'bg-blue-500 hover:bg-blue-600'
  };

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 text-white font-semibold px-4 py-2 rounded-lg transition-colors ${confirmColors[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}

export default ToastProvider;
