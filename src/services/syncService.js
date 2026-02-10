/**
 * Service de synchronisation entre PostgreSQL local et Firebase
 * Gère le mode hors ligne et la synchronisation bidirectionnelle
 */

import { getAllReports, createReport, updateReport, updateReportStatus } from './reportService';
import { getAllUsers, registerUser } from './authService';
import { getAllEntreprisesFirebase, createEntrepriseFirebase } from './entrepriseService';
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';

const API_BASE_URL = 'http://localhost:3001/api';
const USERS_COLLECTION = 'users';

// ============================================================================
// NETTOYAGE DES DOUBLONS FIREBASE
// ============================================================================

/**
 * Supprime tous les signalements créés par sync (syncedFromLocal: true)
 */
export const cleanFirebaseDuplicates = async () => {
  try {
    console.log('[CLEAN] Nettoyage des doublons Firebase...');
    const reportsRef = collection(db, 'road_reports');
    const q = query(reportsRef, where('syncedFromLocal', '==', true));
    const snapshot = await getDocs(q);
    
    let deleted = 0;
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, 'road_reports', docSnap.id));
      console.log(`   [DELETED] ${docSnap.id}`);
      deleted++;
    }
    
    console.log(`[OK] ${deleted} doublons supprimés de Firebase`);
    return { success: true, deleted };
  } catch (error) {
    console.error('[ERROR] Erreur nettoyage Firebase:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// VÉRIFICATION DE CONNECTIVITÉ
// ============================================================================

/**
 * Vérifie si l'API locale est disponible
 */
export const isLocalApiAvailable = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      cache: 'no-cache'
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Vérifie si Firebase est accessible
 */
export const isFirebaseAvailable = async () => {
  try {
    // Test simple avec un timeout court
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://firestore.googleapis.com/', {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
};

/**
 * Obtient le statut de synchronisation
 */
export const getSyncStatus = async () => {
  try {
    const [localAvailable, firebaseAvailable] = await Promise.all([
      isLocalApiAvailable(),
      isFirebaseAvailable()
    ]);

    let pendingSync = 0;
    if (localAvailable) {
      const response = await fetch(`${API_BASE_URL}/sync/pending`);
      const data = await response.json();
      pendingSync = data.totalPending || 0;
    }

    return {
      localAvailable,
      firebaseAvailable,
      pendingSync,
      canSync: localAvailable && firebaseAvailable
    };
  } catch (error) {
    return {
      localAvailable: false,
      firebaseAvailable: false,
      pendingSync: 0,
      canSync: false,
      error: error.message
    };
  }
};

// ============================================================================
// OPÉRATIONS LOCALES (PostgreSQL)
// ============================================================================

/**
 * Récupère tous les signalements depuis la base locale
 */
export const getLocalReports = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/reports`);
    const data = await response.json();
    return { reports: data.reports || [], error: null };
  } catch (error) {
    return { reports: [], error: error.message };
  }
};

/**
 * Crée un signalement localement
 */
export const createLocalReport = async (reportData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });
    const data = await response.json();
    return { report: data.report, error: data.error };
  } catch (error) {
    return { report: null, error: error.message };
  }
};

/**
 * Met à jour un signalement localement
 */
export const updateLocalReport = async (reportId, updateData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    const data = await response.json();
    return { success: data.success, error: data.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Met à jour le statut localement
 */
export const updateLocalReportStatus = async (reportId, status, changedBy) => {
  try {
    const response = await fetch(`${API_BASE_URL}/reports/${reportId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, changedBy })
    });
    const data = await response.json();
    return { success: data.success, error: data.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Supprime un signalement localement
 */
export const deleteLocalReport = async (reportId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    return { success: data.success, error: data.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================================================
// SYNCHRONISATION
// ============================================================================

/**
 * Synchronise un utilisateur vers Firebase
 */
export const syncUserToFirebase = async (user) => {
  try {
    const userData = {
      uid: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      createdAt: user.created_at || new Date().toISOString(),
      updatedAt: serverTimestamp(),
      syncedFromLocal: true
    };
    
    await setDoc(doc(db, USERS_COLLECTION, user.id), userData, { merge: true });
    console.log(`[OK] Utilisateur synchronisé vers Firebase: ${user.email}`);
    return { success: true, error: null };
  } catch (error) {
    console.error(`[ERROR] Erreur sync utilisateur ${user.email}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Synchronise les données locales vers Firebase
 */
export const syncToFirebase = async (onProgress = null) => {
  const results = {
    success: true,
    synced: { reports: 0, users: 0, entreprises: 0 },
    errors: []
  };

  try {
    // 1. Récupérer les éléments non synchronisés
    const response = await fetch(`${API_BASE_URL}/sync/pending`);
    const pending = await response.json();

    const total = pending.reports.length + pending.users.length + (pending.entreprises?.length || 0);
    let current = 0;

    // 2. Synchroniser les utilisateurs vers Firebase
    for (const user of pending.users) {
      try {
        const syncResult = await syncUserToFirebase(user);
        if (syncResult.success) {
          results.synced.users++;
        } else {
          results.errors.push({ type: 'user', id: user.id, error: syncResult.error });
        }

        current++;
        if (onProgress) onProgress(Math.round((current / total) * 100));
      } catch (error) {
        results.errors.push({ type: 'user', id: user.id, error: error.message });
      }
    }

    // 3. Marquer les utilisateurs comme synchronisés
    if (pending.users.length > 0) {
      const syncedUserIds = pending.users
        .filter(u => !results.errors.find(e => e.type === 'user' && e.id === u.id))
        .map(u => u.id);
      
      if (syncedUserIds.length > 0) {
        await fetch(`${API_BASE_URL}/sync/mark-synced`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'users', ids: syncedUserIds })
        });
      }
    }

    // 4. Synchroniser les signalements vers Firebase
    for (const report of pending.reports) {
      try {
        // Créer ou mettre à jour dans Firebase
        const firebaseReport = {
          userId: report.user_id,
          userEmail: report.user_email,
          type: report.type,
          description: report.description,
          latitude: parseFloat(report.latitude),
          longitude: parseFloat(report.longitude),
          quartier: report.quartier,
          arrondissement: report.arrondissement,
          images: typeof report.images === 'string' ? JSON.parse(report.images) : report.images,
          status: report.status,
          statusHistory: typeof report.status_history === 'string' ? JSON.parse(report.status_history) : report.status_history,
          createdAt: report.created_at,
          localId: report.id,
          syncedFromLocal: true
        };

        // Créer dans Firebase
        const createResult = await createReport(firebaseReport);
        if (createResult.id) {
          results.synced.reports++;
        } else {
          results.errors.push({ type: 'report', id: report.id, error: createResult.error });
        }

        current++;
        if (onProgress) onProgress(Math.round((current / total) * 100));
      } catch (error) {
        results.errors.push({ type: 'report', id: report.id, error: error.message });
      }
    }

    // 5. Marquer les signalements comme synchronisés
    if (pending.reports.length > 0) {
      const syncedReportIds = pending.reports
        .filter(r => !results.errors.find(e => e.type === 'report' && e.id === r.id))
        .map(r => r.id);
      
      if (syncedReportIds.length > 0) {
        await fetch(`${API_BASE_URL}/sync/mark-synced`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'road_reports', ids: syncedReportIds })
        });
      }
    }

    // 6. Synchroniser les entreprises vers Firebase
    for (const entreprise of (pending.entreprises || [])) {
      try {
        const firebaseData = {
          id: entreprise.id,
          name: entreprise.name,
          contact: entreprise.contact,
          phone: entreprise.phone,
          email: entreprise.email,
          address: entreprise.address,
          specialties: typeof entreprise.specialties === 'string' 
            ? JSON.parse(entreprise.specialties || '[]') 
            : (entreprise.specialties || [])
        };
        
        const createResult = await createEntrepriseFirebase(firebaseData);
        if (createResult.id) {
          results.synced.entreprises++;
        } else {
          results.errors.push({ type: 'entreprise', id: entreprise.id, error: createResult.error });
        }

        current++;
        if (onProgress) onProgress(Math.round((current / total) * 100));
      } catch (error) {
        results.errors.push({ type: 'entreprise', id: entreprise.id, error: error.message });
      }
    }

    // 7. Marquer les entreprises comme synchronisées
    if (pending.entreprises?.length > 0) {
      const syncedEntrepriseIds = pending.entreprises
        .filter(e => !results.errors.find(err => err.type === 'entreprise' && err.id === e.id))
        .map(e => e.id);
      
      if (syncedEntrepriseIds.length > 0) {
        await fetch(`${API_BASE_URL}/sync/mark-synced`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'entreprises', ids: syncedEntrepriseIds })
        });
      }
    }

    return results;
  } catch (error) {
    return { success: false, error: error.message, synced: results.synced, errors: results.errors };
  }
};

/**
 * Synchronise les données Firebase vers local
 */
export const syncFromFirebase = async (onProgress = null) => {
  const results = {
    success: true,
    imported: { reports: 0, users: 0, entreprises: 0 },
    errors: []
  };

  try {
    if (onProgress) onProgress(10);

    // 1. Récupérer les données de Firebase
    const [reportsResult, usersResult, entreprisesResult] = await Promise.all([
      getAllReports(),
      getAllUsers(),
      getAllEntreprisesFirebase()
    ]);

    console.log(`[INFO] Données Firebase récupérées: ${reportsResult.reports?.length || 0} signalements, ${usersResult.users?.length || 0} utilisateurs, ${entreprisesResult.entreprises?.length || 0} entreprises`);

    if (onProgress) onProgress(50);

    // 2. Envoyer à l'API locale pour import
    const response = await fetch(`${API_BASE_URL}/sync/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reports: reportsResult.reports || [],
        users: usersResult.users || [],
        entreprises: entreprisesResult.entreprises || []
      })
    });

    const data = await response.json();
    
    if (onProgress) onProgress(100);

    if (data.success) {
      results.imported = data.imported;
      console.log(`[OK] Import terminé: ${data.imported.reports} signalements, ${data.imported.users} utilisateurs, ${data.imported.entreprises || 0} entreprises`);
    } else {
      results.success = false;
      results.errors.push(data.error);
    }

    return results;
  } catch (error) {
    console.error('[ERROR] Erreur syncFromFirebase:', error);
    return { success: false, error: error.message, imported: results.imported, errors: results.errors };
  }
};

/**
 * Synchronisation complète bidirectionnelle
 */
export const fullSync = async (onProgress = null) => {
  const results = {
    success: true,
    toFirebase: null,
    fromFirebase: null,
    errors: []
  };

  try {
    // Vérifier la disponibilité
    const status = await getSyncStatus();
    if (!status.canSync) {
      return {
        success: false,
        error: 'Synchronisation impossible: ' + 
          (!status.localAvailable ? 'API locale indisponible' : 'Firebase indisponible')
      };
    }

    // 1. D'abord envoyer vers Firebase (priorité aux données locales)
    if (onProgress) onProgress(0);
    results.toFirebase = await syncToFirebase((p) => onProgress && onProgress(p / 2));

    // 2. Ensuite récupérer de Firebase
    results.fromFirebase = await syncFromFirebase((p) => onProgress && onProgress(50 + p / 2));

    results.success = results.toFirebase.success && results.fromFirebase.success;

    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================================================
// SERVICE HYBRIDE (AUTO-SÉLECTION LOCAL/FIREBASE)
// ============================================================================

/**
 * Mode de fonctionnement actuel
 */
let currentMode = 'auto'; // 'auto', 'local', 'firebase'

export const setMode = (mode) => {
  currentMode = mode;
};

export const getMode = () => currentMode;

/**
 * Récupère les signalements (auto-sélection de la source)
 */
export const getReportsHybrid = async () => {
  if (currentMode === 'local') {
    return getLocalReports();
  }
  
  if (currentMode === 'firebase') {
    return getAllReports();
  }

  // Mode auto: essayer Firebase d'abord, puis local
  const firebaseAvailable = await isFirebaseAvailable();
  if (firebaseAvailable) {
    return getAllReports();
  }

  const localAvailable = await isLocalApiAvailable();
  if (localAvailable) {
    return getLocalReports();
  }

  return { reports: [], error: 'Aucune source de données disponible' };
};

/**
 * Crée un signalement (sauvegarde locale + sync si possible)
 */
export const createReportHybrid = async (reportData) => {
  const localAvailable = await isLocalApiAvailable();
  const firebaseAvailable = await isFirebaseAvailable();

  // Toujours sauvegarder localement si disponible
  let localResult = null;
  if (localAvailable) {
    localResult = await createLocalReport(reportData);
  }

  // Si Firebase disponible, créer aussi là-bas
  if (firebaseAvailable) {
    const firebaseResult = await createReport(reportData);
    
    // Si local a réussi, marquer comme synchronisé
    if (localResult?.report && firebaseResult?.id) {
      await fetch(`${API_BASE_URL}/sync/mark-synced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'road_reports',
          ids: [localResult.report.id]
        })
      });
    }
    
    return firebaseResult;
  }

  // Sinon retourner le résultat local
  return localResult || { id: null, error: 'Aucune source disponible' };
};

// ============================================================================
// FONCTIONS DE SYNCHRONISATION UTILISATEURS
// ============================================================================

/**
 * Récupère tous les utilisateurs locaux
 */
export const getLocalUsers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`);
    const data = await response.json();
    return { 
      users: (data.users || []).map(u => ({
        uid: u.id,
        email: u.email,
        displayName: u.display_name,
        role: u.role,
        createdAt: u.created_at
      })), 
      error: null 
    };
  } catch (error) {
    console.error('Erreur getLocalUsers:', error);
    return { users: [], error: error.message };
  }
};

/**
 * Importe un utilisateur Firebase vers la base locale
 */
export const importUserToLocal = async (user) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.uid || user.id,
        email: user.email,
        displayName: user.displayName || user.display_name,
        role: user.role || 'user'
      })
    });
    const data = await response.json();
    return { user: data.user, error: data.error };
  } catch (error) {
    console.error('Erreur importUserToLocal:', error);
    return { user: null, error: error.message };
  }
};

/**
 * Synchronise les utilisateurs Firebase vers local
 */
export const syncUsersFromFirebase = async () => {
  const results = {
    success: true,
    imported: 0,
    errors: []
  };

  try {
    // Récupérer tous les utilisateurs de Firebase
    const { users, error } = await getAllUsers();
    if (error) {
      return { success: false, imported: 0, error };
    }

    console.log(`[INFO] ${users.length} utilisateurs à importer de Firebase`);

    for (const user of users) {
      try {
        const result = await importUserToLocal(user);
        if (result.user) {
          results.imported++;
        } else if (result.error) {
          results.errors.push({ id: user.uid, error: result.error });
        }
      } catch (err) {
        results.errors.push({ id: user.uid, error: err.message });
      }
    }

    console.log(`[OK] ${results.imported} utilisateurs importés`);
    return results;
  } catch (error) {
    console.error('[ERROR] Erreur syncUsersFromFirebase:', error);
    return { success: false, imported: 0, error: error.message };
  }
};

/**
 * Synchronise les utilisateurs locaux vers Firebase
 */
export const syncUsersToFirebase = async () => {
  const results = {
    success: true,
    synced: 0,
    errors: []
  };

  try {
    // Récupérer les utilisateurs non synchronisés
    const response = await fetch(`${API_BASE_URL}/sync/pending`);
    const pending = await response.json();

    console.log(`[INFO] ${pending.users.length} utilisateurs à synchroniser vers Firebase`);

    for (const user of pending.users) {
      try {
        const result = await syncUserToFirebase(user);
        if (result.success) {
          results.synced++;
        } else {
          results.errors.push({ id: user.id, error: result.error });
        }
      } catch (err) {
        results.errors.push({ id: user.id, error: err.message });
      }
    }

    // Marquer comme synchronisés
    if (results.synced > 0) {
      const syncedIds = pending.users
        .filter(u => !results.errors.find(e => e.id === u.id))
        .map(u => u.id);
      
      await fetch(`${API_BASE_URL}/sync/mark-synced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'users', ids: syncedIds })
      });
    }

    console.log(`[OK] ${results.synced} utilisateurs synchronisés vers Firebase`);
    return results;
  } catch (error) {
    console.error('[ERROR] Erreur syncUsersToFirebase:', error);
    return { success: false, synced: 0, error: error.message };
  }
};

/**
 * Récupère les utilisateurs en mode hybride (local ou Firebase)
 */
export const getUsersHybrid = async () => {
  if (currentMode === 'local') {
    return getLocalUsers();
  }
  
  if (currentMode === 'firebase') {
    return getAllUsers();
  }

  // Mode auto: essayer local d'abord (source de vérité pour l'auth locale), puis Firebase
  const localAvailable = await isLocalApiAvailable();
  if (localAvailable) {
    return getLocalUsers();
  }

  const firebaseAvailable = await isFirebaseAvailable();
  if (firebaseAvailable) {
    return getAllUsers();
  }

  return { users: [], error: 'Aucune source de données disponible' };
};

export default {
  isLocalApiAvailable,
  isFirebaseAvailable,
  getSyncStatus,
  getLocalReports,
  createLocalReport,
  updateLocalReport,
  updateLocalReportStatus,
  deleteLocalReport,
  syncToFirebase,
  syncFromFirebase,
  fullSync,
  setMode,
  getMode,
  getReportsHybrid,
  createReportHybrid,
  // User sync functions
  getLocalUsers,
  importUserToLocal,
  syncUserToFirebase,
  syncUsersFromFirebase,
  syncUsersToFirebase,
  getUsersHybrid
};
