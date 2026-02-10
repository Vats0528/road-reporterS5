import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query, 
  where,
  orderBy,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';

const REPORTS_COLLECTION = 'road_reports';

// Fonction utilitaire pour convertir les dates de manière sécurisée
const safeToDate = (dateValue) => {
  if (!dateValue) return null;
  
  // Si c'est déjà une Date
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  // Si c'est un Timestamp Firestore (a une méthode toDate)
  if (dateValue && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }
  
  // Si c'est une chaîne ISO ou un nombre (timestamp)
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Si c'est un objet avec seconds (Timestamp sérialisé)
  if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
    return new Date(dateValue.seconds * 1000);
  }
  
  return null;
};

// =============================================================================
// FONCTIONS DE VÉRIFICATION DES PERMISSIONS
// =============================================================================

/**
 * Vérifie si l'utilisateur actuel peut créer un signalement
 */
const canCreateReport = () => {
  return auth.currentUser !== null;
};

/**
 * Vérifie si l'utilisateur actuel peut modifier un signalement
 * @param {Object} report - Le signalement à modifier
 * @param {string} userRole - Le rôle de l'utilisateur
 */
const canModifyReport = (report, userRole) => {
  if (!auth.currentUser || !report) return false;
  
  // Les managers peuvent tout modifier
  if (userRole === 'manager') return true;
  
  // Les utilisateurs peuvent modifier leurs signalements non traités
  return report.userId === auth.currentUser.uid && report.status === 'nouveau';
};

/**
 * Vérifie si l'utilisateur actuel peut supprimer un signalement
 * @param {Object} report - Le signalement à supprimer
 * @param {string} userRole - Le rôle de l'utilisateur
 */
const canDeleteReport = (report, userRole) => {
  if (!auth.currentUser || !report) return false;
  
  // Les managers peuvent tout supprimer
  if (userRole === 'manager') return true;
  
  // Les utilisateurs peuvent supprimer leurs signalements non traités
  return report.userId === auth.currentUser.uid && report.status === 'nouveau';
};

// =============================================================================
// OPÉRATIONS CRUD
// =============================================================================

/**
 * Créer un nouveau signalement
 * Requiert: utilisateur authentifié
 */
export const createReport = async (reportData) => {
  try {
    // Vérification de permission
    if (!canCreateReport()) {
      return { 
        id: null, 
        error: 'Vous devez être connecté pour créer un signalement' 
      };
    }

    // Validation des données requises
    if (!reportData.latitude || !reportData.longitude) {
      return { id: null, error: 'Position géographique requise' };
    }

    if (!reportData.type) {
      return { id: null, error: 'Type de problème requis' };
    }

    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), {
      ...reportData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'nouveau'
    });
    
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Erreur lors de la création du signalement:', error);
    
    // Gérer les erreurs de permission Firestore
    if (error.code === 'permission-denied') {
      return { id: null, error: 'Permission refusée. Veuillez vous reconnecter.' };
    }
    
    return { id: null, error: error.message };
  }
};

/**
 * Créer un signalement directement dans Firebase (pour la synchronisation)
 * Contourne la vérification d'authentification
 */
export const createReportDirect = async (reportData) => {
  try {
    // Validation minimale
    if (!reportData.latitude || !reportData.longitude) {
      return { id: null, error: 'Position géographique requise' };
    }

    if (!reportData.type) {
      return { id: null, error: 'Type de problème requis' };
    }

    const data = {
      userId: reportData.userId || null,
      userEmail: reportData.userEmail || null,
      type: reportData.type,
      description: reportData.description || '',
      latitude: parseFloat(reportData.latitude),
      longitude: parseFloat(reportData.longitude),
      quartier: reportData.quartier || null,
      arrondissement: reportData.arrondissement || null,
      status: reportData.status || 'nouveau',
      images: reportData.images || [],
      statusHistory: reportData.statusHistory || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      syncedFromLocal: true,
      localId: reportData.localId || null
    };

    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), data);
    console.log(`[OK] Signalement créé dans Firebase: ${docRef.id}`);
    
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Erreur création signalement Firebase:', error);
    return { id: null, error: error.message };
  }
};

/**
 * Récupérer tous les signalements
 * Accessible à tous (visiteurs inclus)
 */
export const getAllReports = async () => {
  try {
    console.log('getAllReports: Début de la récupération...');
    console.log('getAllReports: Collection =', REPORTS_COLLECTION);
    
    let querySnapshot;
    try {
      // Essayer avec orderBy
      querySnapshot = await getDocs(
        query(collection(db, REPORTS_COLLECTION), orderBy('createdAt', 'desc'))
      );
    } catch (orderError) {
      console.warn('getAllReports: Erreur orderBy, essai sans tri:', orderError.message);
      // Fallback sans orderBy si l'index n'existe pas
      querySnapshot = await getDocs(collection(db, REPORTS_COLLECTION));
    }
    
    console.log('getAllReports: Nombre de docs récupérés:', querySnapshot.size);
    
    const reports = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reports.push({
        id: doc.id,
        ...data,
        createdAt: safeToDate(data.createdAt),
        updatedAt: safeToDate(data.updatedAt)
      });
    });

    // Trier côté client si nécessaire
    reports.sort((a, b) => {
      const dateA = a.createdAt || new Date(0);
      const dateB = b.createdAt || new Date(0);
      return dateB - dateA;
    });
    
    console.log('getAllReports: Total signalements:', reports.length);
    return { reports, error: null };
  } catch (error) {
    console.error('getAllReports: ERREUR:', error);
    console.error('getAllReports: Code erreur:', error.code);
    console.error('getAllReports: Message:', error.message);
    return { reports: [], error: error.message };
  }
};

/**
 * Récupérer les signalements d'un utilisateur
 * Requiert: utilisateur authentifié
 */
export const getUserReports = async (userId) => {
  try {
    if (!auth.currentUser) {
      return { reports: [], error: 'Authentification requise' };
    }

    if (!userId) {
      console.error('getUserReports: userId est undefined');
      return { reports: [], error: 'ID utilisateur manquant' };
    }

    console.log('getUserReports appelé avec userId:', userId);

    // Essayer d'abord avec orderBy (nécessite un index composite)
    let querySnapshot;
    try {
      const q = query(
        collection(db, REPORTS_COLLECTION), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      querySnapshot = await getDocs(q);
    } catch (indexError) {
      // Si l'index n'existe pas, faire une requête simple et trier côté client
      console.warn('Index Firestore manquant, tri côté client:', indexError.message);
      const q = query(
        collection(db, REPORTS_COLLECTION), 
        where('userId', '==', userId)
      );
      querySnapshot = await getDocs(q);
    }
    
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reports.push({
        id: doc.id,
        ...data,
        createdAt: safeToDate(data.createdAt),
        updatedAt: safeToDate(data.updatedAt)
      });
    });

    // Trier par date décroissante (au cas où on n'a pas pu utiliser orderBy)
    reports.sort((a, b) => {
      const dateA = a.createdAt || new Date(0);
      const dateB = b.createdAt || new Date(0);
      return dateB - dateA;
    });

    console.log(`getUserReports: ${reports.length} signalements trouvés pour userId ${userId}`);
    
    return { reports, error: null };
  } catch (error) {
    console.error('Erreur lors de la récupération des signalements utilisateur:', error);
    return { reports: [], error: error.message };
  }
};

/**
 * Mettre à jour un signalement
 * Requiert: Manager OU propriétaire du signalement (si status = nouveau)
 */
export const updateReport = async (reportId, updateData, userRole = 'user') => {
  try {
    // S'assurer que reportId est une chaîne
    const id = String(reportId || '');
    if (!id) {
      return { success: false, error: 'ID de signalement invalide' };
    }

    // Récupérer le signalement actuel pour vérifier les permissions
    const reportRef = doc(db, REPORTS_COLLECTION, id);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return { success: false, error: 'Signalement non trouvé' };
    }
    
    const currentReport = reportDoc.data();
    
    // Vérification de permission
    if (!canModifyReport(currentReport, userRole)) {
      return { 
        success: false, 
        error: 'Vous n\'avez pas la permission de modifier ce signalement' 
      };
    }

    // Empêcher la modification de certains champs protégés
    const protectedFields = ['userId', 'userEmail', 'createdAt'];
    const sanitizedData = { ...updateData };
    protectedFields.forEach(field => delete sanitizedData[field]);

    await updateDoc(reportRef, {
      ...sanitizedData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du signalement:', error);
    
    if (error.code === 'permission-denied') {
      return { success: false, error: 'Permission refusée' };
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Mettre à jour le statut d'un signalement avec historique
 * Requiert: Manager uniquement
 */
export const updateReportStatus = async (reportId, newStatus, userRole = 'user', changedBy = null) => {
  try {
    // S'assurer que reportId est une chaîne
    const id = String(reportId || '');
    if (!id) {
      return { success: false, error: 'ID de signalement invalide' };
    }

    // Seuls les managers peuvent changer le statut
    if (userRole !== 'manager') {
      return { 
        success: false, 
        error: 'Seuls les managers peuvent modifier le statut' 
      };
    }

    // Valider le nouveau statut
    const validStatuses = ['nouveau', 'en-cours', 'termine'];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: 'Statut invalide' };
    }

    // Récupérer le signalement actuel pour l'historique
    const reportRef = doc(db, REPORTS_COLLECTION, id);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return { success: false, error: 'Signalement non trouvé' };
    }

    const currentData = reportDoc.data();
    const previousStatus = currentData.status;
    
    // Créer l'entrée d'historique
    const historyEntry = {
      previousStatus: previousStatus,
      newStatus: newStatus,
      changedAt: new Date().toISOString(),
      changedBy: changedBy || auth.currentUser?.email || 'unknown'
    };

    // Récupérer l'historique existant ou créer un nouveau tableau
    const statusHistory = currentData.statusHistory || [];
    statusHistory.push(historyEntry);

    await updateDoc(reportRef, {
      status: newStatus,
      statusHistory: statusHistory,
      updatedAt: serverTimestamp(),
      // Ajouter des timestamps spécifiques pour chaque statut
      ...(newStatus === 'en-cours' && !currentData.startedAt ? { startedAt: serverTimestamp() } : {}),
      ...(newStatus === 'termine' && !currentData.completedAt ? { completedAt: serverTimestamp() } : {})
    });
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    
    if (error.code === 'permission-denied') {
      return { success: false, error: 'Permission refusée' };
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Supprimer un signalement
 * Requiert: Manager OU propriétaire du signalement (si status = nouveau)
 */
export const deleteReport = async (reportId, userRole = 'user') => {
  try {
    // S'assurer que reportId est une chaîne
    const id = String(reportId || '');
    if (!id) {
      return { success: false, error: 'ID de signalement invalide' };
    }

    // Récupérer le signalement actuel pour vérifier les permissions
    const reportRef = doc(db, REPORTS_COLLECTION, id);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return { success: false, error: 'Signalement non trouvé' };
    }
    
    const currentReport = reportDoc.data();
    
    // Vérification de permission
    if (!canDeleteReport(currentReport, userRole)) {
      return { 
        success: false, 
        error: 'Vous n\'avez pas la permission de supprimer ce signalement' 
      };
    }

    await deleteDoc(reportRef);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur lors de la suppression du signalement:', error);
    
    if (error.code === 'permission-denied') {
      return { success: false, error: 'Permission refusée' };
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer un signalement par ID
 * Accessible à tous
 */
export const getReportById = async (reportId) => {
  try {
    // S'assurer que reportId est une chaîne
    const id = String(reportId || '');
    if (!id) {
      return { report: null, error: 'ID de signalement invalide' };
    }

    const reportRef = doc(db, REPORTS_COLLECTION, id);
    const reportDoc = await getDoc(reportRef);
    
    if (reportDoc.exists()) {
      const data = reportDoc.data();
      return {
        report: {
          id: reportDoc.id,
          ...data,
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt)
        },
        error: null
      };
    }
    
    return { report: null, error: 'Signalement non trouvé' };
  } catch (error) {
    console.error('Erreur lors de la récupération du signalement:', error);
    return { report: null, error: error.message };
  }
};

/**
 * Filtrer les signalements par statut
 * Accessible à tous
 */
export const getReportsByStatus = async (status) => {
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reports.push({
        id: doc.id,
        ...data,
        createdAt: safeToDate(data.createdAt),
        updatedAt: safeToDate(data.updatedAt)
      });
    });
    
    return { reports, error: null };
  } catch (error) {
    console.error('Erreur lors du filtrage des signalements:', error);
    return { reports: [], error: error.message };
  }
};

/**
 * Calculer les statistiques
 * Accessible à tous
 */
export const getReportsStats = (reports) => {
  const stats = {
    total: reports.length,
    nouveau: 0,
    enCours: 0,
    termine: 0,
    totalSurface: 0,
    totalBudget: 0,
    avancement: 0
  };
  
  reports.forEach(report => {
    if (report.status === 'nouveau') stats.nouveau++;
    if (report.status === 'en-cours') stats.enCours++;
    if (report.status === 'termine') stats.termine++;
    
    if (report.surface) stats.totalSurface += parseFloat(report.surface);
    if (report.budget) stats.totalBudget += parseFloat(report.budget);
  });
  
  if (stats.total > 0) {
    stats.avancement = Math.round((stats.termine / stats.total) * 100);
  }
  
  return stats;
};

/**
 * Vérifier si l'utilisateur peut effectuer une action sur un signalement
 * Utilitaire exporté pour les composants
 */
export const checkReportPermission = async (reportId, action, userRole) => {
  try {
    const { report, error } = await getReportById(reportId);
    
    if (error || !report) {
      return { allowed: false, error: error || 'Signalement non trouvé' };
    }
    
    switch (action) {
      case 'edit':
        return { allowed: canModifyReport(report, userRole), error: null };
      case 'delete':
        return { allowed: canDeleteReport(report, userRole), error: null };
      case 'changeStatus':
        return { allowed: userRole === 'manager', error: null };
      default:
        return { allowed: false, error: 'Action non reconnue' };
    }
  } catch (error) {
    return { allowed: false, error: error.message };
  }
};