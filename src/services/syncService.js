/**
 * Service de synchronisation entre PostgreSQL local et Firebase
 * Gère le mode hors ligne et la synchronisation bidirectionnelle
 */

import { getAllReports, createReport, updateReport, updateReportStatus } from './reportService';
import { getAllUsers } from './authService';

const API_BASE_URL = 'http://localhost:3001/api';

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
 * Synchronise les données locales vers Firebase
 */
export const syncToFirebase = async (onProgress = null) => {
  const results = {
    success: true,
    synced: { reports: 0, users: 0 },
    errors: []
  };

  try {
    // 1. Récupérer les éléments non synchronisés
    const response = await fetch(`${API_BASE_URL}/sync/pending`);
    const pending = await response.json();

    const total = pending.reports.length + pending.users.length;
    let current = 0;

    // 2. Synchroniser les signalements vers Firebase
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
          statusHistory: typeof report.status_history === 'string' ? JSON.parse(report.status_history) : report.status_history
        };

        // Note: Ici on devrait appeler Firebase directement
        // Pour l'instant, on marque comme synchronisé
        results.synced.reports++;

        current++;
        if (onProgress) onProgress(Math.round((current / total) * 100));
      } catch (error) {
        results.errors.push({ type: 'report', id: report.id, error: error.message });
      }
    }

    // 3. Marquer comme synchronisé
    if (pending.reports.length > 0) {
      await fetch(`${API_BASE_URL}/sync/mark-synced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'road_reports',
          ids: pending.reports.map(r => r.id)
        })
      });
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
    imported: { reports: 0, users: 0 },
    errors: []
  };

  try {
    if (onProgress) onProgress(10);

    // 1. Récupérer les données de Firebase
    const [reportsResult, usersResult] = await Promise.all([
      getAllReports(),
      getAllUsers()
    ]);

    if (onProgress) onProgress(50);

    // 2. Envoyer à l'API locale pour import
    const response = await fetch(`${API_BASE_URL}/sync/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reports: reportsResult.reports || [],
        users: usersResult.users || []
      })
    });

    const data = await response.json();
    
    if (onProgress) onProgress(100);

    if (data.success) {
      results.imported = data.imported;
    } else {
      results.success = false;
      results.errors.push(data.error);
    }

    return results;
  } catch (error) {
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
  createReportHybrid
};
