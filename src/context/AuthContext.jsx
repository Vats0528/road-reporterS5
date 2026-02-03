import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { observeAuthState, loginUser, logoutUser, registerUser, getUserData } from '../services/authService';
import { ROLE_PERMISSIONS, USER_ROLES } from '../utils/constants';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(({ user, userData }) => {
      setCurrentUser(user);
      setUserData(userData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const result = await loginUser(email, password);
    if (result.user) {
      setCurrentUser(result.user);
      setUserData(result.userData);
    }
    return result;
  };

  const register = async (email, password, displayName, role = 'user') => {
    const result = await registerUser(email, password, displayName, role);
    if (result.user) {
      setCurrentUser(result.user);
      // Mettre à jour userData avec le nouveau rôle
      setUserData({
        uid: result.user.uid,
        email: result.user.email,
        displayName: displayName,
        role: role
      });
    }
    return result;
  };

  const logout = async () => {
    const result = await logoutUser();
    if (!result.error) {
      setCurrentUser(null);
      setUserData(null);
    }
    return result;
  };

  // Rafraîchir les données utilisateur depuis Firestore
  const refreshUserData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const freshData = await getUserData(currentUser.uid);
      if (freshData) {
        setUserData(freshData);
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des données utilisateur:', error);
    }
  }, [currentUser]);

  // Obtenir le rôle actuel de l'utilisateur
  const getCurrentRole = () => {
    if (!currentUser) return USER_ROLES.VISITOR;
    return userData?.role || USER_ROLES.USER;
  };

  // Vérifier si l'utilisateur est un manager
  const isManager = () => {
    return userData?.role === USER_ROLES.MANAGER;
  };

  // Vérifier si l'utilisateur est authentifié
  const isAuthenticated = () => {
    return currentUser !== null;
  };

  // Vérifier si l'utilisateur est un visiteur (non connecté)
  const isVisitor = () => {
    return currentUser === null;
  };

  // Obtenir les permissions de l'utilisateur actuel
  const getPermissions = useMemo(() => {
    const role = getCurrentRole();
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.visitor;
  }, [currentUser, userData]);

  // Vérifier si l'utilisateur a une permission spécifique
  const hasPermission = (permission) => {
    return getPermissions[permission] === true;
  };

  // Vérifier si l'utilisateur peut effectuer une action sur un signalement spécifique
  const canActOnReport = (report, action) => {
    if (!report) return false;
    
    const role = getCurrentRole();
    
    // Les managers ont tous les droits
    if (role === USER_ROLES.MANAGER) return true;
    
    // Pour les utilisateurs normaux
    if (role === USER_ROLES.USER) {
      // Peut modifier/supprimer ses propres signalements non traités
      if (action === 'edit' || action === 'delete') {
        return report.userId === currentUser?.uid && report.status === 'nouveau';
      }
    }
    
    return false;
  };

  const value = {
    // État
    currentUser,
    userData,
    loading,
    
    // Actions
    login,
    register,
    logout,
    refreshUserData,
    
    // Rôles et permissions
    getCurrentRole,
    isManager,
    isAuthenticated,
    isVisitor,
    getPermissions,
    hasPermission,
    canActOnReport
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};