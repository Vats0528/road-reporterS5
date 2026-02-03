import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLE_PERMISSIONS, USER_ROLES, PERMISSIONS } from '../utils/constants';

/**
 * Hook personnalisé pour gérer les permissions utilisateur
 * Retourne les permissions basées sur le rôle de l'utilisateur
 */
export const usePermissions = () => {
  const { currentUser, userData } = useAuth();

  // Déterminer le rôle actuel
  const currentRole = useMemo(() => {
    if (!currentUser) {
      return USER_ROLES.VISITOR;
    }
    return userData?.role || USER_ROLES.USER;
  }, [currentUser, userData]);

  // Obtenir les permissions pour le rôle actuel
  const permissions = useMemo(() => {
    return ROLE_PERMISSIONS[currentRole] || ROLE_PERMISSIONS.visitor;
  }, [currentRole]);

  // Vérifier si l'utilisateur a une permission spécifique
  const hasPermission = (permission) => {
    return permissions[permission] === true;
  };

  // Vérifier si l'utilisateur peut modifier un signalement spécifique
  const canEditOwnReport = (report) => {
    if (!currentUser || !report) return false;
    
    // Les managers peuvent tout modifier
    if (currentRole === USER_ROLES.MANAGER) return true;
    
    // Les utilisateurs peuvent modifier leurs propres signalements (si non encore traités)
    if (currentRole === USER_ROLES.USER) {
      return report.userId === currentUser.uid && report.status === 'nouveau';
    }
    
    return false;
  };

  // Vérifier si l'utilisateur peut supprimer un signalement spécifique
  const canDeleteOwnReport = (report) => {
    if (!currentUser || !report) return false;
    
    // Les managers peuvent tout supprimer
    if (currentRole === USER_ROLES.MANAGER) return true;
    
    // Les utilisateurs peuvent supprimer leurs propres signalements (si non encore traités)
    if (currentRole === USER_ROLES.USER) {
      return report.userId === currentUser.uid && report.status === 'nouveau';
    }
    
    return false;
  };

  // Vérifier si c'est un visiteur (non connecté)
  const isVisitor = currentRole === USER_ROLES.VISITOR;

  // Vérifier si c'est un utilisateur connecté
  const isUser = currentRole === USER_ROLES.USER;

  // Vérifier si c'est un manager
  const isManager = currentRole === USER_ROLES.MANAGER;

  // Vérifier si l'utilisateur est authentifié
  const isAuthenticated = currentUser !== null;

  return {
    // Rôle actuel
    currentRole,
    
    // Toutes les permissions
    permissions,
    
    // Vérification de permission
    hasPermission,
    
    // Permissions spécifiques aux signalements
    canEditOwnReport,
    canDeleteOwnReport,
    
    // Raccourcis pour les rôles
    isVisitor,
    isUser,
    isManager,
    isAuthenticated,
    
    // Raccourcis pour les permissions courantes
    canViewMap: permissions.canViewMap,
    canViewReports: permissions.canViewReports,
    canViewStats: permissions.canViewStats,
    canCreateReport: permissions.canCreateReport,
    canEditReport: permissions.canEditReport,
    canDeleteReport: permissions.canDeleteReport,
    canChangeStatus: permissions.canChangeStatus,
    canAssignEntreprise: permissions.canAssignEntreprise,
    canManageUsers: permissions.canManageUsers,
    canExportData: permissions.canExportData,
    canAccessDashboard: permissions.canAccessDashboard,
    canAccessManagerPanel: permissions.canAccessManagerPanel
  };
};

export default usePermissions;
