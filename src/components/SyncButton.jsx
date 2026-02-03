import React, { useState } from 'react';
import { RefreshCw, Check, AlertCircle, Cloud, CloudOff } from 'lucide-react';

/**
 * Composant bouton de synchronisation réutilisable
 * Affiche l'état de synchronisation avec Firebase
 */
export default function SyncButton({ 
  onSync, 
  className = '',
  variant = 'primary', // 'primary' | 'secondary' | 'minimal'
  size = 'md', // 'sm' | 'md' | 'lg'
  showLabel = true,
  label = 'Synchroniser',
  syncingLabel = 'Sync...',
  successLabel = 'Synchronisé !',
  errorLabel = 'Erreur'
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error'
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const handleSync = async () => {
    if (syncing) return;

    setSyncing(true);
    setSyncStatus('syncing');

    try {
      if (onSync) {
        await onSync();
      }
      setSyncStatus('success');
      setLastSyncTime(new Date());
      
      // Revenir à l'état idle après 2 secondes
      setTimeout(() => {
        setSyncStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Erreur de synchronisation:', error);
      setSyncStatus('error');
      
      // Revenir à l'état idle après 3 secondes
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    } finally {
      setSyncing(false);
    }
  };

  // Styles selon la variante
  const variantStyles = {
    primary: {
      idle: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25',
      syncing: 'bg-orange-500 text-white cursor-not-allowed',
      success: 'bg-emerald-500 text-white',
      error: 'bg-red-500 text-white'
    },
    secondary: {
      idle: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300',
      syncing: 'bg-slate-100 text-slate-500 cursor-not-allowed',
      success: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
      error: 'bg-red-100 text-red-700 border border-red-300'
    },
    minimal: {
      idle: 'hover:bg-slate-100 text-slate-600',
      syncing: 'text-slate-400 cursor-not-allowed',
      success: 'text-emerald-600',
      error: 'text-red-600'
    }
  };

  // Styles selon la taille
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  // Icône selon le statut
  const getIcon = () => {
    const iconClass = iconSizes[size];
    
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className={`${iconClass} animate-spin`} />;
      case 'success':
        return <Check className={iconClass} />;
      case 'error':
        return <AlertCircle className={iconClass} />;
      default:
        return <RefreshCw className={iconClass} />;
    }
  };

  // Label selon le statut
  const getLabel = () => {
    switch (syncStatus) {
      case 'syncing':
        return syncingLabel;
      case 'success':
        return successLabel;
      case 'error':
        return errorLabel;
      default:
        return label;
    }
  };

  // Formater la dernière synchronisation
  const formatLastSync = () => {
    if (!lastSyncTime) return null;
    
    const now = new Date();
    const diff = Math.floor((now - lastSyncTime) / 1000);
    
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    return lastSyncTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={syncing}
        className={`
          inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200
          ${sizeStyles[size]}
          ${variantStyles[variant][syncStatus]}
          ${className}
        `}
        title={lastSyncTime ? `Dernière sync: ${formatLastSync()}` : 'Synchroniser avec Firebase'}
      >
        {getIcon()}
        {showLabel && <span>{getLabel()}</span>}
      </button>
      
      {/* Indicateur de dernière synchronisation (optionnel) */}
      {lastSyncTime && syncStatus === 'idle' && (
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Cloud className="h-3 w-3" />
          {formatLastSync()}
        </span>
      )}
    </div>
  );
}

/**
 * Indicateur de statut de connexion Firebase
 */
export function ConnectionStatus({ isOnline = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {isOnline ? (
        <>
          <Cloud className="h-4 w-4 text-emerald-500" />
          <span className="text-emerald-600 font-medium">Connecté</span>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4 text-red-500" />
          <span className="text-red-600 font-medium">Hors ligne</span>
        </>
      )}
    </div>
  );
}

/**
 * Bouton de synchronisation compact pour la barre de navigation
 */
export function NavSyncButton({ onSync, className = '' }) {
  const [syncing, setSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      if (onSync) await onSync();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className={`
        p-2 rounded-lg transition-all duration-200
        ${showSuccess 
          ? 'bg-emerald-100 text-emerald-600' 
          : 'hover:bg-slate-100 text-slate-600'
        }
        ${syncing ? 'cursor-not-allowed opacity-50' : ''}
        ${className}
      `}
      title="Synchroniser"
    >
      {showSuccess ? (
        <Check className="h-5 w-5" />
      ) : (
        <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
      )}
    </button>
  );
}
