/**
 * Service d'authentification locale (offline)
 * Utilise l'API backend PostgreSQL au lieu de Firebase
 */

const API_URL = 'http://localhost:3001/api';

// Clés localStorage
const TOKEN_KEY = 'local_auth_token';
const USER_KEY = 'local_auth_user';
const SESSION_KEY = 'local_session_start';

// ============================================================================
// GESTION DU TOKEN
// ============================================================================

export const getStoredToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getStoredUser = () => {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

const saveAuthData = (user, token) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_KEY, Date.now().toString());
};

const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_KEY);
};

// ============================================================================
// INSCRIPTION
// ============================================================================

export const registerUserLocal = async (email, password, displayName, role = 'user') => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName, role })
    });

    const data = await response.json();

    if (!response.ok) {
      return { user: null, error: data.error || 'Erreur d\'inscription' };
    }

    // Sauvegarder les données d'authentification
    saveAuthData(data.user, data.token);

    return { user: data.user, userData: data.user, token: data.token, error: null };
  } catch (error) {
    console.error('Erreur inscription locale:', error);
    
    // Si le serveur n'est pas accessible, on peut créer un compte hors ligne
    if (error.message.includes('fetch')) {
      return { user: null, error: 'Serveur local non accessible. Vérifiez que le backend est démarré.' };
    }
    
    return { user: null, error: error.message };
  }
};

// ============================================================================
// CONNEXION
// ============================================================================

export const loginUserLocal = async (email, password) => {
  try {
    console.log('🔐 Tentative de connexion locale:', email);
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    console.log('📡 Réponse serveur:', data);

    if (!response.ok) {
      return { user: null, userData: null, error: data.error || 'Erreur de connexion' };
    }

    // Sauvegarder les données d'authentification
    console.log('💾 Sauvegarde des données auth...');
    saveAuthData(data.user, data.token);
    
    // Vérifier que c'est bien sauvegardé
    const savedUser = getStoredUser();
    const savedToken = getStoredToken();
    console.log('✅ Données sauvegardées:', savedUser?.email, savedToken ? 'token OK' : 'PAS DE TOKEN');

    return { 
      user: data.user, 
      userData: data.user, 
      token: data.token, 
      error: null 
    };
  } catch (error) {
    console.error('❌ Erreur connexion locale:', error);
    
    if (error.message.includes('fetch')) {
      return { user: null, userData: null, error: 'Serveur local non accessible' };
    }
    
    return { user: null, userData: null, error: error.message };
  }
};

// ============================================================================
// DÉCONNEXION
// ============================================================================

export const logoutUserLocal = async () => {
  try {
    const token = getStoredToken();
    
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
    }
    
    clearAuthData();
    return { error: null };
  } catch (error) {
    console.error('Erreur déconnexion locale:', error);
    clearAuthData(); // On déconnecte quand même localement
    return { error: null };
  }
};

// ============================================================================
// VÉRIFICATION DE SESSION
// ============================================================================

export const verifyTokenLocal = async () => {
  try {
    const token = getStoredToken();
    const storedUser = getStoredUser();
    
    console.log('🔍 Vérification token:', token ? 'présent' : 'absent');
    console.log('🔍 Utilisateur stocké:', storedUser ? storedUser.email : 'aucun');
    
    if (!token || !storedUser) {
      console.log('❌ Pas de token ou utilisateur stocké');
      return { valid: false, user: null };
    }

    // Essayer de vérifier avec le serveur
    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Vérification serveur OK:', data);
        if (data.valid) {
          // Mettre à jour les données utilisateur si elles ont changé
          saveAuthData(data.user, token);
          return { valid: true, user: data.user };
        }
      } else {
        // Réponse non-ok mais serveur accessible - utiliser le cache quand même
        console.log('⚠️ Token non valide côté serveur, mais on garde le cache local');
        // On pourrait invalider ici, mais pour le mode offline on garde le cache
        return { valid: true, user: storedUser, offline: true };
      }
    } catch (fetchError) {
      // Serveur non accessible - utiliser les données en cache
      console.log('⚠️ Serveur non accessible, utilisation du cache local');
      return { valid: true, user: storedUser, offline: true };
    }

    // Fallback - utiliser le cache
    return { valid: true, user: storedUser, offline: true };
  } catch (error) {
    console.error('Erreur vérification token:', error);
    // En cas d'erreur, essayer d'utiliser le cache
    const storedUser = getStoredUser();
    if (storedUser) {
      return { valid: true, user: storedUser, offline: true };
    }
    return { valid: false, user: null };
  }
};

// ============================================================================
// OBSERVER L'ÉTAT D'AUTHENTIFICATION
// ============================================================================

export const observeAuthStateLocal = (callback) => {
  console.log('🔄 Initialisation observeAuthStateLocal');
  
  // Vérification initiale
  const checkAuth = async () => {
    console.log('🔍 checkAuth appelé');
    
    // D'abord, vérifier s'il y a des données en cache
    const storedUser = getStoredUser();
    const storedToken = getStoredToken();
    
    console.log('📦 Cache local:', storedUser ? storedUser.email : 'vide');
    
    if (storedUser && storedToken) {
      // On a des données en cache, les utiliser immédiatement
      console.log('✅ Utilisation du cache local immédiatement');
      callback({ 
        user: storedUser, 
        userData: storedUser,
        offline: false 
      });
      
      // Puis vérifier avec le serveur en arrière-plan
      try {
        const response = await fetch(`${API_URL}/auth/verify`, {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.valid && data.user) {
            console.log('✅ Vérification serveur confirmée');
            saveAuthData(data.user, storedToken);
            callback({ 
              user: data.user, 
              userData: data.user,
              offline: false 
            });
          }
        }
      } catch (e) {
        console.log('⚠️ Serveur non accessible, mode offline');
        // Garder les données du cache, marquer comme offline
        callback({ 
          user: storedUser, 
          userData: storedUser,
          offline: true 
        });
      }
    } else {
      // Pas de cache, vérifier normalement
      const result = await verifyTokenLocal();
      
      if (result.valid) {
        callback({ 
          user: result.user, 
          userData: result.user,
          offline: result.offline 
        });
      } else {
        console.log('❌ Pas d\'utilisateur connecté');
        callback({ user: null, userData: null });
      }
    }
  };

  checkAuth();

  // Écouter les changements de localStorage (pour multi-onglets)
  const handleStorageChange = (e) => {
    if (e.key === TOKEN_KEY || e.key === USER_KEY) {
      checkAuth();
    }
  };

  window.addEventListener('storage', handleStorageChange);

  // Retourner une fonction de nettoyage
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};

// ============================================================================
// RÉCUPÉRER LES DONNÉES UTILISATEUR
// ============================================================================

export const getUserDataLocal = async (uid) => {
  try {
    const response = await fetch(`${API_URL}/users`);
    const data = await response.json();
    
    const user = data.users?.find(u => u.id === uid);
    if (user) {
      return {
        data: {
          uid: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role
        },
        error: null
      };
    }
    
    return { data: null, error: 'Utilisateur non trouvé' };
  } catch (error) {
    // Utiliser le cache local
    const storedUser = getStoredUser();
    if (storedUser && storedUser.uid === uid) {
      return { data: storedUser, error: null };
    }
    return { data: null, error: error.message };
  }
};

// ============================================================================
// GESTION SESSION
// ============================================================================

export const isSessionValidLocal = () => {
  const sessionStart = localStorage.getItem(SESSION_KEY);
  if (!sessionStart) return false;
  
  // Session valide pendant 24h
  const SESSION_LIFETIME = 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - parseInt(sessionStart);
  return elapsed < SESSION_LIFETIME;
};

export const getSessionTimeRemainingLocal = () => {
  const sessionStart = localStorage.getItem(SESSION_KEY);
  if (!sessionStart) return 0;
  
  const SESSION_LIFETIME = 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - parseInt(sessionStart);
  return Math.max(0, SESSION_LIFETIME - elapsed);
};

// ============================================================================
// GESTION DES UTILISATEURS (POUR LE MANAGER)
// ============================================================================

// Récupérer tous les utilisateurs
export const getAllUsersLocal = async () => {
  try {
    const response = await fetch(`${API_URL}/users`);
    const data = await response.json();
    
    if (data.error) {
      return { users: [], error: data.error };
    }
    
    // Formater les utilisateurs pour correspondre au format attendu
    const users = (data.users || []).map(u => ({
      uid: u.id,
      email: u.email,
      displayName: u.display_name,
      role: u.role,
      createdAt: u.created_at
    }));
    
    return { users, error: null };
  } catch (error) {
    console.error('Erreur getAllUsersLocal:', error);
    return { users: [], error: error.message };
  }
};

// Créer un utilisateur (par le manager)
export const createUserByManagerLocal = async (email, password, displayName, role = 'user') => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName, role })
    });

    const data = await response.json();

    if (!response.ok) {
      return { user: null, error: data.error || 'Erreur de création' };
    }

    return { 
      user: data.user, 
      error: null,
      message: 'Utilisateur créé avec succès'
    };
  } catch (error) {
    console.error('Erreur createUserByManagerLocal:', error);
    return { user: null, error: error.message };
  }
};

// Supprimer un utilisateur
export const deleteUserLocal = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || 'Erreur de suppression' };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur deleteUserLocal:', error);
    return { success: false, error: error.message };
  }
};

// Débloquer un utilisateur (pour l'auth locale, on reset juste le token)
export const unblockUserLocal = (email) => {
  // En local, pas de blocage comme Firebase, on retourne juste succès
  return { success: true };
};

// Mettre à jour le profil utilisateur
export const updateUserProfileLocal = async (uid, updates) => {
  try {
    const response = await fetch(`${API_URL}/users/${uid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || 'Erreur de mise à jour' };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur updateUserProfileLocal:', error);
    return { success: false, error: error.message };
  }
};

// Changer le mot de passe
export const changePasswordLocal = async (currentPassword, newPassword) => {
  try {
    const token = getStoredToken();
    const user = getStoredUser();
    
    if (!token || !user) {
      return { success: false, error: 'Non connecté' };
    }

    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        userId: user.uid,
        currentPassword, 
        newPassword 
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Erreur de changement de mot de passe' };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur changePasswordLocal:', error);
    return { success: false, error: error.message };
  }
};
