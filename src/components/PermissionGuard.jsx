import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Lock, AlertTriangle } from 'lucide-react';

/**
 * Composant pour protéger le contenu basé sur les permissions
 * @param {string} permission - La permission requise (ex: 'canCreateReport')
 * @param {ReactNode} children - Le contenu à afficher si autorisé
 * @param {ReactNode} fallback - Contenu alternatif si non autorisé (optionnel)
 * @param {boolean} showMessage - Afficher un message d'erreur si non autorisé
 */
export const RequirePermission = ({ 
  permission, 
  children, 
  fallback = null,
  showMessage = false 
}) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    if (showMessage) {
      return (
        <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <Lock className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-600 text-sm font-medium">
            Vous n'avez pas la permission d'accéder à cette fonctionnalité
          </span>
        </div>
      );
    }
    return fallback;
  }

  return children;
};

/**
 * Composant pour protéger une route basée sur l'authentification
 */
export const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    // Rediriger vers la page de connexion en sauvegardant l'URL actuelle
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

/**
 * Composant pour protéger une route basée sur le rôle manager
 */
export const ManagerRoute = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();
  const { isManager, canAccessManagerPanel } = usePermissions();
  const location = useLocation();

  // Debug logs
  React.useEffect(() => {
    console.log('🔐 ManagerRoute Debug:', {
      loading,
      currentUser: currentUser?.email,
      userData,
      isManager,
      canAccessManagerPanel
    });
  }, [loading, currentUser, userData, isManager, canAccessManagerPanel]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isManager || !canAccessManagerPanel) {
    console.error('❌ Accès refusé au Manager Panel:', {
      isManager,
      canAccessManagerPanel,
      role: userData?.role,
      uid: currentUser?.uid
    });
    
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Accès refusé
          </h2>
          <p className="text-slate-600 mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder au panneau de gestion.
            Seuls les managers peuvent accéder à cette page.
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Rôle détecté: <code className="bg-slate-100 px-2 py-1 rounded">{userData?.role || 'non défini'}</code>
          </p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  return children;
};

/**
 * Composant pour protéger une route basée sur une permission spécifique
 */
export const PermissionRoute = ({ permission, children, redirectTo = '/' }) => {
  const { currentUser, loading } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasPermission(permission)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

/**
 * Composant pour afficher différent contenu selon le rôle
 */
export const RoleBasedContent = ({ 
  visitorContent = null, 
  userContent = null, 
  managerContent = null 
}) => {
  const { isVisitor, isUser, isManager } = usePermissions();

  if (isManager && managerContent) {
    return managerContent;
  }

  if (isUser && userContent) {
    return userContent;
  }

  if (isVisitor && visitorContent) {
    return visitorContent;
  }

  return null;
};

/**
 * HOC pour envelopper un composant avec une vérification de permission
 */
export const withPermission = (WrappedComponent, permission) => {
  return function PermissionWrapper(props) {
    const { hasPermission } = usePermissions();

    if (!hasPermission(permission)) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
};

export default {
  RequirePermission,
  ProtectedRoute,
  ManagerRoute,
  PermissionRoute,
  RoleBasedContent,
  withPermission
};
