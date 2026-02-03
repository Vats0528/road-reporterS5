import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { LOGIN_ATTEMPT_LIMIT, LOGIN_BLOCK_DURATION, SESSION_LIFETIME } from '../utils/constants';

// ============================================================================
// GESTION DES TENTATIVES DE CONNEXION
// ============================================================================

const LOGIN_ATTEMPTS_KEY = 'login_attempts';
const SESSION_START_KEY = 'session_start';

// Obtenir les tentatives de connexion depuis localStorage
const getLoginAttempts = (email) => {
  const data = localStorage.getItem(`${LOGIN_ATTEMPTS_KEY}_${email}`);
  if (!data) return { count: 0, lastAttempt: null, blockedUntil: null };
  return JSON.parse(data);
};

// Enregistrer une tentative de connexion
const recordLoginAttempt = (email, success) => {
  const attempts = getLoginAttempts(email);
  
  if (success) {
    // Réinitialiser les tentatives en cas de succès
    localStorage.removeItem(`${LOGIN_ATTEMPTS_KEY}_${email}`);
    return { blocked: false };
  }
  
  const now = Date.now();
  attempts.count += 1;
  attempts.lastAttempt = now;
  
  // Vérifier si on doit bloquer
  if (attempts.count >= LOGIN_ATTEMPT_LIMIT) {
    attempts.blockedUntil = now + (LOGIN_BLOCK_DURATION * 60 * 1000);
  }
  
  localStorage.setItem(`${LOGIN_ATTEMPTS_KEY}_${email}`, JSON.stringify(attempts));
  
  return {
    blocked: attempts.count >= LOGIN_ATTEMPT_LIMIT,
    remainingAttempts: Math.max(0, LOGIN_ATTEMPT_LIMIT - attempts.count),
    blockedUntil: attempts.blockedUntil
  };
};

// Vérifier si l'utilisateur est bloqué
const isUserBlocked = (email) => {
  const attempts = getLoginAttempts(email);
  if (!attempts.blockedUntil) return { blocked: false };
  
  const now = Date.now();
  if (now < attempts.blockedUntil) {
    const remainingMinutes = Math.ceil((attempts.blockedUntil - now) / 60000);
    return { blocked: true, remainingMinutes };
  }
  
  // Le blocage a expiré, réinitialiser
  localStorage.removeItem(`${LOGIN_ATTEMPTS_KEY}_${email}`);
  return { blocked: false };
};

// ============================================================================
// GESTION DE LA SESSION
// ============================================================================

// Démarrer une session
export const startSession = () => {
  localStorage.setItem(SESSION_START_KEY, Date.now().toString());
};

// Vérifier si la session est valide
export const isSessionValid = () => {
  const sessionStart = localStorage.getItem(SESSION_START_KEY);
  if (!sessionStart) return false;
  
  const elapsed = Date.now() - parseInt(sessionStart);
  return elapsed < SESSION_LIFETIME;
};

// Obtenir le temps restant de session
export const getSessionTimeRemaining = () => {
  const sessionStart = localStorage.getItem(SESSION_START_KEY);
  if (!sessionStart) return 0;
  
  const elapsed = Date.now() - parseInt(sessionStart);
  return Math.max(0, SESSION_LIFETIME - elapsed);
};

// Terminer la session
export const endSession = () => {
  localStorage.removeItem(SESSION_START_KEY);
};

// ============================================================================
// INSCRIPTION
// ============================================================================

// Inscription d'un nouvel utilisateur
export const registerUser = async (email, password, displayName, role = 'user') => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Mettre à jour le profil
    await updateProfile(user, { displayName });

    // Normaliser le rôle en minuscules
    const normalizedRole = role.toLowerCase();

    // Créer le document utilisateur dans Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      role: normalizedRole,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });

    // Démarrer la session
    startSession();

    return { user, error: null };
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    let errorMessage = error.message;
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Cette adresse email est déjà utilisée';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Le mot de passe est trop faible';
    }
    
    return { user: null, error: errorMessage };
  }
};

// ============================================================================
// CONNEXION
// ============================================================================

// Connexion d'un utilisateur
export const loginUser = async (email, password) => {
  try {
    // Vérifier si l'utilisateur est bloqué
    const blockStatus = isUserBlocked(email);
    if (blockStatus.blocked) {
      return { 
        user: null, 
        userData: null, 
        error: `Compte temporairement bloqué. Réessayez dans ${blockStatus.remainingMinutes} minute(s).`,
        blocked: true
      };
    }

    console.log('🔐 Tentative de connexion pour:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('✅ Authentification Firebase réussie');

    // Connexion réussie - réinitialiser les tentatives
    recordLoginAttempt(email, true);

    // Récupérer les données utilisateur
    console.log('📡 Récupération données Firestore...');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    let userData = userDoc.exists() ? userDoc.data() : null;
    console.log('✅ Données récupérées:', userData ? 'OK' : 'Document non trouvé');

    // Normaliser le rôle en minuscules si présent
    if (userData && userData.role) {
      userData.role = userData.role.toLowerCase();
    }

    // Démarrer la session
    startSession();

    return { user, userData, error: null };
  } catch (error) {
    console.error('❌ Erreur connexion:', error.code, error.message);
    
    // Enregistrer la tentative échouée
    const attemptResult = recordLoginAttempt(email, false);
    
    let errorMessage = 'Erreur de connexion';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'Utilisateur non trouvé';
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      if (attemptResult.blocked) {
        errorMessage = `Trop de tentatives échouées. Compte bloqué pendant ${LOGIN_BLOCK_DURATION} minutes.`;
      } else {
        errorMessage = `Mot de passe incorrect. ${attemptResult.remainingAttempts} tentative(s) restante(s).`;
      }
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Email invalide';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
    }
    
    return { user: null, userData: null, error: errorMessage };
  }
};

// ============================================================================
// DÉCONNEXION
// ============================================================================

// Déconnexion
export const logoutUser = async () => {
  try {
    await signOut(auth);
    endSession();
    return { error: null };
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return { error: error.message };
  }
};

// ============================================================================
// MISE À JOUR DU PROFIL UTILISATEUR
// ============================================================================

// Mettre à jour le profil utilisateur
export const updateUserProfile = async (uid, updates) => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Mettre à jour Firestore
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });

    // Mettre à jour le profil Firebase Auth si le displayName change
    if (updates.displayName && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: updates.displayName });
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    return { success: false, error: error.message };
  }
};

// Changer le mot de passe
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      return { success: false, error: 'Utilisateur non connecté' };
    }

    // Réauthentifier l'utilisateur
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Changer le mot de passe
    await updatePassword(user, newPassword);

    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    let errorMessage = error.message;
    
    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Mot de passe actuel incorrect';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Le nouveau mot de passe est trop faible';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Observer l'état d'authentification
export const observeAuthState = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          let userData = userDoc.data();
          
          // Normaliser le rôle en minuscules si présent
          if (userData && userData.role) {
            userData.role = userData.role.toLowerCase();
          }
          
          callback({ user, userData });
        } else {
          console.warn('Document utilisateur non trouvé pour:', user.uid);
          callback({ user, userData: null });
        }
      } catch (error) {
        console.error('Erreur chargement données utilisateur:', error);
        callback({ user, userData: null });
      }
    } else {
      callback({ user: null, userData: null });
    }
  });
};

// Récupérer les données utilisateur
export const getUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { data: userDoc.data(), error: null };
    }
    return { data: null, error: 'Utilisateur non trouvé' };
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    return { data: null, error: error.message };
  }
};

// ============================================================================
// GESTION DES UTILISATEURS (MANAGER)
// ============================================================================

// Récupérer tous les utilisateurs
export const getAllUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ uid: doc.id, ...doc.data() });
    });
    // Trier par date de création (plus récent en premier)
    users.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });
    return { users, error: null };
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return { users: [], error: error.message };
  }
};

// Créer un utilisateur par le manager (sans changer la session courante)
export const createUserByManager = async (email, password, displayName, role = 'user') => {
  try {
    // Note: Cette méthode utilise l'API Admin côté client ce qui n'est pas idéal
    // Pour une vraie app de production, utiliser Firebase Admin SDK côté serveur
    
    // Sauvegarder l'utilisateur courant
    const currentUser = auth.currentUser;
    
    // Créer le nouvel utilisateur
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;

    // Mettre à jour le profil
    await updateProfile(newUser, { displayName });

    // Créer le document utilisateur dans Firestore
    await setDoc(doc(db, 'users', newUser.uid), {
      uid: newUser.uid,
      email: newUser.email,
      displayName: displayName,
      role: role.toLowerCase(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.email || 'manager'
    });

    // Se reconnecter avec l'utilisateur courant (le manager)
    // Note: Ceci nécessite de stocker temporairement les credentials du manager
    // ou d'utiliser une approche différente comme Firebase Admin SDK
    
    // Pour l'instant, on signale que le manager doit se reconnecter
    await signOut(auth);

    return { 
      user: newUser, 
      error: null,
      message: 'Utilisateur créé. Veuillez vous reconnecter.'
    };
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    let errorMessage = error.message;
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Cette adresse email est déjà utilisée';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Le mot de passe est trop faible (minimum 6 caractères)';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Email invalide';
    }
    
    return { user: null, error: errorMessage };
  }
};

// Supprimer un utilisateur (uniquement le document Firestore)
// Note: La suppression du compte Auth nécessite Firebase Admin SDK
export const deleteUser = async (userId) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return { success: false, error: error.message };
  }
};

// Débloquer un utilisateur (supprimer les tentatives de connexion)
export const unblockUser = (email) => {
  try {
    localStorage.removeItem(`login_attempts_${email}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};