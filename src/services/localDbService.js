/**
 * Service de données local
 * Utilise PostgreSQL local pour toutes les opérations
 * La synchronisation avec Firebase se fait en arrière-plan
 */

import { 
  getAllReports as getFirebaseReports, 
  createReportDirect as createFirebaseReport,
  updateReportStatus as updateFirebaseStatus,
  updateReport as updateFirebaseReport
} from './reportService';
import {
  createEntrepriseFirebase,
  getAllEntreprisesFirebase
} from './entrepriseService';
import { getAllUsers as getAllFirebaseUsers } from './authService';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const API_URL = 'http://localhost:3001/api';
const USERS_COLLECTION = 'users';

// ============================================================================
// OPÉRATIONS CRUD (toujours via PostgreSQL local)
// ============================================================================

/**
 * Récupère tous les signalements depuis la base locale
 */
export const getAllReports = async () => {
  try {
    const response = await fetch(`${API_URL}/reports`);
    if (!response.ok) throw new Error('Erreur API locale');
    const data = await response.json();
    return { reports: data.reports || [], error: null };
  } catch (error) {
    console.error('Erreur getAllReports local:', error);
    return { reports: [], error: error.message };
  }
};

/**
 * Récupère les signalements d'un utilisateur (par ID ou email)
 */
export const getUserReports = async (userId, userEmail = null) => {
  try {
    // Envoie les deux paramètres pour matcher soit par ID soit par email
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (userEmail) params.append('userEmail', userEmail);
    
    const response = await fetch(`${API_URL}/reports?${params.toString()}`);
    if (!response.ok) throw new Error('Erreur API locale');
    const data = await response.json();
    return { reports: data.reports || [], error: null };
  } catch (error) {
    console.error('Erreur getUserReports local:', error);
    return { reports: [], error: error.message };
  }
};

/**
 * Crée un signalement localement
 */
export const createReport = async (reportData) => {
  try {
    const response = await fetch(`${API_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });
    if (!response.ok) throw new Error('Erreur création');
    const data = await response.json();
    return { id: data.report?.id, error: null };
  } catch (error) {
    console.error('Erreur createReport local:', error);
    return { id: null, error: error.message };
  }
};

/**
 * Met à jour un signalement
 */
export const updateReport = async (reportId, updateData) => {
  try {
    const response = await fetch(`${API_URL}/reports/${reportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    if (!response.ok) throw new Error('Erreur mise à jour');
    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur updateReport local:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Met à jour le statut d'un signalement (local, sera synchronisé vers Firebase)
 */
export const updateReportStatus = async (reportId, status, changedByRole, changedByEmail) => {
  try {
    const changedBy = changedByEmail || changedByRole || 'unknown';
    const response = await fetch(`${API_URL}/reports/${reportId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, changedBy })
    });
    if (!response.ok) throw new Error('Erreur mise à jour statut');
    console.log(`[INFO] Statut mis à jour localement: ${reportId} to ${status}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur updateReportStatus local:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Supprime un signalement
 */
export const deleteReport = async (reportId) => {
  try {
    const response = await fetch(`${API_URL}/reports/${reportId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Erreur suppression');
    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur deleteReport local:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupère les statistiques depuis l'API
 */
export const getReportsStatsFromApi = async () => {
  try {
    const response = await fetch(`${API_URL}/stats`);
    if (!response.ok) throw new Error('Erreur stats');
    const data = await response.json();
    return data.stats || {};
  } catch (error) {
    console.error('Erreur getReportsStats local:', error);
    return {};
  }
};

/**
 * Calcule les statistiques à partir d'un tableau de signalements
 */
export const getReportsStats = (reports = []) => {
  if (!Array.isArray(reports) || reports.length === 0) { 
    return { 
      total: 0, nouveau: 0, enCours: 0, termine: 0, 
      avancement: 0, totalSurface: 0, totalBudget: 0 
    };
  }
  
  let nouveau = 0;
  let enCours = 0;
  let termine = 0;
  let totalSurface = 0;
  let totalBudget = 0;

  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    const status = (report.status || 'nouveau').toLowerCase();
    
    // Compter par statut
    if (status === 'nouveau' || status === 'nouveaux') {
      nouveau++;
    } else if (status === 'en-cours' || status === 'en_cours' || status === 'en cours' || status === 'encours') {
      enCours++;
    } else if (status === 'termine' || status === 'terminé' || status === 'termines' || status === 'terminés') {
      termine++;
    } else {
      nouveau++; // Par défaut
    }
    
    // Calculer surface et budget (conversion explicite en nombre)
    const surfaceNum = Number(report.surface);
    const budgetNum = Number(report.budget);
    
    if (!isNaN(surfaceNum) && surfaceNum > 0) {
      totalSurface = totalSurface + surfaceNum;
    }
    if (!isNaN(budgetNum) && budgetNum > 0) {
      totalBudget = totalBudget + budgetNum;
    }
  }

  const total = reports.length;
  
  // Progression: terminé = 100%, en cours = 50%, nouveau = 0%
  const avancement = total > 0 
    ? Math.round(((termine * 100) + (enCours * 50)) / total) 
    : 0;

  return {
    total,
    nouveau,
    enCours,
    termine,
    avancement,
    totalSurface: Math.round(totalSurface * 100) / 100,
    totalBudget: Math.round(totalBudget)
  };
};

// ============================================================================
// SYNCHRONISATION AVEC FIREBASE
// ============================================================================

/**
 * Migre une image locale vers Firebase Storage via le backend
 * @param {string} localUrl - URL locale de l'image (http://localhost:3001/...)
 * @param {string} reportId - ID du rapport
 * @returns {Promise<string|null>} URL Firebase ou null si echec
 */
const migrateImageToFirebase = async (localUrl, reportId) => {
  try {
    // Utiliser l'endpoint backend qui a Firebase Admin SDK
    const response = await fetch(`${API_URL}/migrate-image-to-firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localUrl, reportId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.warn(`   [WARN] Migration echouee: ${error.error}`);
      return null;
    }
    
    const result = await response.json();
    console.log(`   [OK] Image migrée: ${result.firebaseUrl}`);
    
    return result.firebaseUrl;
  } catch (error) {
    console.error(`   [ERROR] Migration image echouée:`, error.message);
    return null;
  }
};

/**
 * Vérifie si l'API locale est disponible
 */
export const isLocalApiAvailable = async () => {
  try {
    const response = await fetch(`${API_URL}/health`, { cache: 'no-cache' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Récupère le nombre d'éléments en attente de sync
 */
export const getPendingSyncCount = async () => {
  try {
    const response = await fetch(`${API_URL}/sync/pending`);
    const data = await response.json();
    return data.totalPending || 0;
  } catch {
    return 0;
  }
};

/**
 * Synchronise les données locales vers Firebase (nouveaux + modifiés)
 */
export const syncToFirebase = async () => {
  try {
    console.log('[SYNC] === DÉBUT SYNCHRONISATION LOCAL to FIREBASE ===');
    
    // Récupérer les éléments non synchronisés
    const response = await fetch(`${API_URL}/sync/pending`);
    const pending = await response.json();
    
    console.log(`[INFO] ${pending.users?.length || 0} utilisateurs à synchroniser`);
    console.log(`[INFO] ${pending.reports?.length || 0} signalements à synchroniser`);
    console.log(`[INFO] ${pending.entreprises?.length || 0} entreprises à synchroniser`);
    
    let created = 0;
    let updated = 0;
    let entreprisesSynced = 0;
    let usersSynced = 0;
    const errors = [];

    // ===== SYNCHRONISER LES UTILISATEURS =====
    for (const user of pending.users || []) {
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

        console.log(`   [INFO] Sync utilisateur: ${user.email}`);
        await setDoc(doc(db, USERS_COLLECTION, user.id), userData, { merge: true });
        
        await fetch(`${API_URL}/sync/mark-synced`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'users', ids: [user.id] })
        });
        usersSynced++;
        console.log(`   [OK] Utilisateur synchronisé: ${user.email}`);
      } catch (err) {
        console.error(`   [ERROR] Erreur utilisateur: ${user.id}`, err.message);
        errors.push({ id: user.id, type: 'user', error: err.message });
      }
    }

    // ===== SYNCHRONISER LES ENTREPRISES =====
    for (const entreprise of pending.entreprises || []) {
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

        console.log(`   [INFO] Sync entreprise: ${entreprise.name}`);
        const result = await createEntrepriseFirebase(firebaseData);
        
        if (result.id) {
          await fetch(`${API_URL}/sync/mark-synced`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'entreprises', ids: [entreprise.id] })
          });
          entreprisesSynced++;
        } else {
          errors.push({ id: entreprise.id, type: 'entreprise', error: result.error });
        }
      } catch (err) {
        console.error(`   [ERROR] Erreur entreprise: ${entreprise.id}`, err.message);
        errors.push({ id: entreprise.id, type: 'entreprise', error: err.message });
      }
    }

    // ===== SYNCHRONISER LES SIGNALEMENTS =====
    // Envoyer chaque signalement vers Firebase
    for (const report of pending.reports || []) {
      try {
        // Verifier si le signalement a deja un firebase_id (deja synchronise une fois)
        const hasFirebaseId = report.firebase_id && report.firebase_id.length > 0;
        
        // Migrer les images locales vers Firebase Storage via le backend
        let localImages = typeof report.images === 'string' ? JSON.parse(report.images || '[]') : (report.images || []);
        let firebaseImages = [];
        
        for (const img of localImages) {
          // Si c'est une URL locale (localhost), migrer vers Firebase Storage
          if (img && img.url && img.url.includes('localhost:3001')) {
            try {
              console.log(`   [INFO] Migration image vers Firebase: ${img.url}`);
              const firebaseUrl = await migrateImageToFirebase(img.url, report.id);
              if (firebaseUrl) {
                firebaseImages.push({ ...img, url: firebaseUrl, originalLocalUrl: img.url });
              } else {
                firebaseImages.push(img); // Garder l'original si echec
              }
            } catch (err) {
              console.warn(`   [WARN] Echec migration image: ${err.message}`);
              firebaseImages.push(img);
            }
          } else {
            firebaseImages.push(img);
          }
        }
        
        if (hasFirebaseId) {
          // Signalement existant dans Firebase - mettre a jour completement
          const firebaseId = report.firebase_id;
          console.log(`   [INFO] Mise a jour Firebase: ${firebaseId}`);
          
          const updateData = {
            type: report.type,
            description: report.description || '',
            quartier: report.quartier || null,
            arrondissement: report.arrondissement || null,
            images: firebaseImages,
            status: report.status || 'nouveau',
            budget: report.budget ? parseFloat(report.budget) : null,
            surface: report.surface ? parseFloat(report.surface) : null,
            niveau: report.niveau || 1,
            assignedAt: report.assigned_at || null,
            startedAt: report.started_at || null,
            completedAt: report.completed_at || null,
            validatedAt: report.validated_at || null,
            entrepriseId: report.entreprise_id || null
          };
          
          // Passer isSync=true pour contourner la vérification d'utilisateur
          const result = await updateFirebaseReport(firebaseId, updateData, 'sync', true);
          
          if (result.success) {
            await fetch(`${API_URL}/sync/mark-synced`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ table: 'road_reports', ids: [report.id] })
            });
            updated++;
            console.log(`   [OK] Mis a jour: ${report.id} (Firebase: ${firebaseId})`);
          } else {
            console.warn(`   [WARN] Erreur update Firebase: ${result.error}`);
            errors.push({ id: report.id, error: result.error });
          }
        } else {
          // Nouveau signalement - creer dans Firebase
          const firebaseData = {
            userId: report.user_id || null,
            userEmail: report.user_email || null,
            type: report.type,
            description: report.description || '',
            latitude: parseFloat(report.latitude),
            longitude: parseFloat(report.longitude),
            quartier: report.quartier || null,
            arrondissement: report.arrondissement || null,
            images: firebaseImages,
            statusHistory: typeof report.status_history === 'string' ? JSON.parse(report.status_history || '[]') : (report.status_history || []),
            status: report.status || 'nouveau',
            budget: report.budget ? parseFloat(report.budget) : null,
            surface: report.surface ? parseFloat(report.surface) : null,
            niveau: report.niveau || 1,
            assignedAt: report.assigned_at || null,
            startedAt: report.started_at || null,
            completedAt: report.completed_at || null,
            validatedAt: report.validated_at || null,
            entrepriseId: report.entreprise_id || null,
            localId: report.id,
            syncedFromLocal: true
          };

          console.log(`   [INFO] Creation Firebase: ${report.id} (${report.type})`);
          const result = await createFirebaseReport(firebaseData);
          
          if (result.id) {
            // Mettre a jour l'ID Firebase dans la base locale
            await fetch(`${API_URL}/reports/${report.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ firebase_id: result.id })
            });
            
            await fetch(`${API_URL}/sync/mark-synced`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ table: 'road_reports', ids: [report.id] })
            });
            created++;
            console.log(`   [OK] Cree: ${report.id} -> Firebase ID: ${result.id}`);
          } else {
            console.error(`   [ERROR] Echec creation: ${result.error}`);
            errors.push({ id: report.id, type: 'report', error: result.error });
          }
        }
      } catch (err) {
        console.error(`   [ERROR] Erreur: ${report.id}`, err.message);
        errors.push({ id: report.id, error: err.message });
      }
    }

    console.log('[OK] === SYNCHRONISATION LOCAL to FIREBASE TERMINÉE ===');
    console.log(`   [OK] Utilisateurs: ${usersSynced} synchronisés`);
    console.log(`   [OK] Signalements: ${created} créés, ${updated} mis à jour`);
    console.log(`   [OK] Entreprises: ${entreprisesSynced} synchronisées`);
    if (errors.length > 0) {
      console.warn(`   [WARN] ${errors.length} erreurs`);
    }

    return { 
      success: true, 
      created, 
      updated, 
      usersSynced,
      entreprisesSynced,
      synced: created + updated + entreprisesSynced + usersSynced, 
      errors 
    };
  } catch (error) {
    console.error('[ERROR] Exception syncToFirebase:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Importe les données de Firebase vers local (signalements + entreprises + utilisateurs)
 */
export const syncFromFirebase = async () => {
  try {
    console.log('[SYNC] === DÉBUT SYNCHRONISATION FIREBASE to LOCAL ===');
    
    // D'abord, récupérer les IDs locaux existants (signalements)
    const localReportsResult = await getAllReports();
    const localReportIds = new Set((localReportsResult.reports || []).map(r => r.id));
    const localFirebaseIds = new Set((localReportsResult.reports || []).filter(r => r.firebase_id).map(r => r.firebase_id));
    console.log(`[INFO] ${localReportIds.size} signalements déjà en local`);
    
    // Récupérer aussi les utilisateurs locaux
    let localUserIds = new Set();
    let localUserEmails = new Set();
    try {
      const usersResponse = await fetch(`${API_URL}/users`);
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const usersList = usersData.users || usersData || [];
        localUserIds = new Set(usersList.map(u => u.id));
        localUserEmails = new Set(usersList.map(u => u.email?.toLowerCase()));
        console.log(`[INFO] ${localUserIds.size} utilisateurs déjà en local`);
      }
    } catch (err) {
      console.warn('[WARN] Impossible de récupérer les utilisateurs locaux:', err.message);
    }
    
    // 1. Récupérer les SIGNALEMENTS de Firebase
    console.log('[INFO] Récupération des signalements Firebase...');
    const { reports: firebaseReports, error: reportsError } = await getFirebaseReports();
    
    if (reportsError) {
      console.error('[ERROR] Erreur récupération reports:', reportsError);
      return { success: false, error: reportsError };
    }
    
    console.log(`[INFO] ${firebaseReports?.length || 0} signalements trouvés dans Firebase`);

    // FILTRER les signalements qui existent déjà en local
    const reportsToImport = (firebaseReports || []).filter(report => {
      const firebaseId = report.id;
      
      // Ignorer si on a déjà ce signalement en local (par firebase_id)
      if (localFirebaseIds.has(firebaseId)) {
        console.log(`   [SKIP] Déjà en local (firebase_id): ${firebaseId}`);
        return false;
      }
      
      // Ignorer si le localId existe déjà en base locale
      if (report.localId && localReportIds.has(report.localId)) {
        console.log(`   [SKIP] Déjà en local (localId): ${firebaseId} -> ${report.localId}`);
        return false;
      }
      
      // Vérifier aussi si l'ID Firebase est utilisé directement comme ID local
      if (localReportIds.has(firebaseId)) {
        console.log(`   [SKIP] Déjà en local (id direct): ${firebaseId}`);
        return false;
      }
      
      console.log(`   [NEW] À importer: ${firebaseId} (${report.type})`);
      return true;
    });

    console.log(`[INFO] ${reportsToImport.length} signalements à importer (après filtrage)`);

    // Formater les signalements
    const formattedReports = reportsToImport.map(report => {
      let createdAt = report.createdAt;
      if (createdAt && typeof createdAt.toDate === 'function') {
        createdAt = createdAt.toDate().toISOString();
      } else if (createdAt instanceof Date) {
        createdAt = createdAt.toISOString();
      } else if (typeof createdAt === 'string') {
        createdAt = createdAt;
      } else {
        createdAt = new Date().toISOString();
      }

      return {
        id: report.id,
        userId: report.userId || report.user_id || null,
        userEmail: report.userEmail || report.user_email || null,
        type: report.type || 'autre',
        description: report.description || '',
        latitude: parseFloat(report.latitude) || 0,
        longitude: parseFloat(report.longitude) || 0,
        quartier: report.quartier || null,
        arrondissement: report.arrondissement || null,
        status: report.status || 'nouveau',
        images: Array.isArray(report.images) ? report.images : [],
        statusHistory: Array.isArray(report.statusHistory) ? report.statusHistory : 
                       Array.isArray(report.status_history) ? report.status_history : [],
        createdAt: createdAt,
        localId: report.localId || null
      };
    });

    console.log('[INFO] Envoi vers PostgreSQL local...');
    console.log(`   - ${formattedReports.length} signalements`);

    // 2. Récupérer les ENTREPRISES de Firebase
    console.log('[INFO] Récupération des entreprises Firebase...');
    let formattedEntreprises = [];
    try {
      const { entreprises: firebaseEntreprises, error: entreprisesError } = await getAllEntreprisesFirebase();
      if (!entreprisesError && firebaseEntreprises) {
        console.log(`[INFO] ${firebaseEntreprises.length} entreprises trouvées`);
        formattedEntreprises = firebaseEntreprises.map(e => ({
          id: e.id,
          name: e.name,
          contact: e.contact || null,
          phone: e.phone || null,
          email: e.email || null,
          address: e.address || null,
          specialties: e.specialties || []
        }));
      } else if (entreprisesError) {
        console.warn('[WARN] Erreur récupération entreprises:', entreprisesError);
      }
    } catch (err) {
      console.warn('[WARN] Erreur entreprises Firebase:', err.message);
    }

    console.log(`   - ${formattedEntreprises.length} entreprises`);

    // 3. Récupérer les UTILISATEURS de Firebase
    console.log('[INFO] Récupération des utilisateurs Firebase...');
    let formattedUsers = [];
    try {
      const { users: firebaseUsers, error: usersError } = await getAllFirebaseUsers();
      if (!usersError && firebaseUsers) {
        // Filtrer les utilisateurs qui existent DÉJÀ en local (par ID ou email)
        const usersToImport = firebaseUsers.filter(user => {
          const userId = user.uid || user.id;
          const userEmail = user.email?.toLowerCase();
          
          // Ignorer si l'utilisateur existe déjà en local
          if (localUserIds.has(userId)) {
            console.log(`   [SKIP] Utilisateur déjà en local (id): ${user.email}`);
            return false;
          }
          if (userEmail && localUserEmails.has(userEmail)) {
            console.log(`   [SKIP] Utilisateur déjà en local (email): ${user.email}`);
            return false;
          }
          
          console.log(`   [NEW] Utilisateur à importer: ${user.email}`);
          return true;
        });
        
        console.log(`[INFO] ${usersToImport.length} utilisateurs à importer (après filtrage sur ${firebaseUsers.length})`);
        formattedUsers = usersToImport.map(u => ({
          uid: u.uid || u.id,
          email: u.email,
          displayName: u.displayName || u.display_name,
          role: u.role || 'user',
          createdAt: u.createdAt
        }));
      } else if (usersError) {
        console.warn('[WARN] Erreur récupération utilisateurs:', usersError);
      }
    } catch (err) {
      console.warn('[WARN] Erreur utilisateurs Firebase:', err.message);
    }

    console.log(`   - ${formattedUsers.length} utilisateurs`);

    // 4. Envoyer à l'API locale
    const response = await fetch(`${API_URL}/sync/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        reports: formattedReports, 
        users: formattedUsers,
        entreprises: formattedEntreprises
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ERROR] Erreur API:', response.status, errorText);
      return { success: false, error: `Erreur API: ${response.status}` };
    }

    const result = await response.json();
    
    console.log('[OK] === SYNCHRONISATION TERMINÉE ===');
    console.log(`   [OK] ${result.imported?.users || 0} utilisateurs importés`);
    console.log(`   [OK] ${result.imported?.reports || 0} signalements importés`);
    console.log(`   [OK] ${result.imported?.entreprises || 0} entreprises importées`);
    
    // Afficher les erreurs s'il y en a
    if (result.errors && result.errors.length > 0) {
      console.warn('[WARN] Erreurs durant l\'import:');
      result.errors.forEach(err => {
        console.warn(`   - ${err.type} ${err.id}: ${err.error}`);
      });
    }
    
    return { 
      success: true, 
      imported: {
        users: result.imported?.users || 0,
        reports: result.imported?.reports || 0,
        entreprises: result.imported?.entreprises || 0
      },
      errors: result.errors
    };
  } catch (error) {
    console.error('[ERROR] Exception syncFromFirebase:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Synchronisation complète bidirectionnelle
 */
export const fullSync = async (onProgress = null) => {
  const results = {
    success: true,
    pushed: 0,
    pulled: 0,
    errors: []
  };

  try {
    if (onProgress) onProgress(10);

    // 1. Push local to Firebase
    const pushResult = await syncToFirebase();
    results.pushed = pushResult.synced || 0;
    if (pushResult.errors) results.errors.push(...pushResult.errors);

    if (onProgress) onProgress(50);

    // 2. Pull Firebase to local
    const pullResult = await syncFromFirebase();
    results.pulled = pullResult.imported || 0;

    if (onProgress) onProgress(100);

    results.success = true;
    return results;
  } catch (error) {
    results.success = false;
    results.error = error.message;
    return results;
  }
};

/**
 * Récupère tous les utilisateurs locaux
 */
export const getAllLocalUsers = async () => {
  try {
    const response = await fetch(`${API_URL}/users`);
    if (!response.ok) throw new Error('Erreur API locale');
    const data = await response.json();
    
    // Formater les utilisateurs pour correspondre au format attendu
    const users = (data.users || []).map(u => ({
      uid: u.id,
      email: u.email,
      displayName: u.display_name,
      role: u.role,
      createdAt: u.created_at,
      isSynced: u.is_synced
    }));
    
    return { users, error: null };
  } catch (error) {
    console.error('Erreur getAllLocalUsers:', error);
    return { users: [], error: error.message };
  }
};

/**
 * Récupère le nombre d'utilisateurs en attente de sync
 */
export const getPendingUsersCount = async () => {
  try {
    const response = await fetch(`${API_URL}/sync/pending`);
    const data = await response.json();
    return data.users?.length || 0;
  } catch {
    return 0;
  }
};

export default {
  getAllReports,
  getUserReports,
  createReport,
  updateReport,
  updateReportStatus,
  deleteReport,
  getReportsStats,
  isLocalApiAvailable,
  getPendingSyncCount,
  syncToFirebase,
  syncFromFirebase,
  fullSync,
  getAllLocalUsers,
  getPendingUsersCount
};
