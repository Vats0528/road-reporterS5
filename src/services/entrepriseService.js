/**
 * Service pour la gestion des entreprises
 * Gère les opérations CRUD sur Firebase et la synchronisation
 */

import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const ENTREPRISES_COLLECTION = 'entreprises';

// ============================================================================
// OPÉRATIONS FIREBASE
// ============================================================================

/**
 * Récupère toutes les entreprises depuis Firebase
 */
export const getAllEntreprisesFirebase = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, ENTREPRISES_COLLECTION));
    const entreprises = [];
    
    querySnapshot.forEach((doc) => {
      entreprises.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`[INFO] ${entreprises.length} entreprises récupérées de Firebase`);
    return { entreprises, error: null };
  } catch (error) {
    console.error('Erreur récupération entreprises Firebase:', error);
    return { entreprises: [], error: error.message };
  }
};

/**
 * Crée une entreprise dans Firebase
 */
export const createEntrepriseFirebase = async (entrepriseData) => {
  try {
    const data = {
      ...entrepriseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Si un ID est fourni, utiliser setDoc pour le conserver
    if (entrepriseData.id) {
      const docRef = doc(db, ENTREPRISES_COLLECTION, entrepriseData.id);
      await setDoc(docRef, data);
      console.log(`[OK] Entreprise créée dans Firebase: ${entrepriseData.id}`);
      return { id: entrepriseData.id, error: null };
    } else {
      const docRef = await addDoc(collection(db, ENTREPRISES_COLLECTION), data);
      console.log(`[OK] Entreprise créée dans Firebase: ${docRef.id}`);
      return { id: docRef.id, error: null };
    }
  } catch (error) {
    console.error('Erreur création entreprise Firebase:', error);
    return { id: null, error: error.message };
  }
};

/**
 * Met à jour une entreprise dans Firebase
 */
export const updateEntrepriseFirebase = async (entrepriseId, updateData) => {
  try {
    const docRef = doc(db, ENTREPRISES_COLLECTION, entrepriseId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    console.log(`[OK] Entreprise mise à jour dans Firebase: ${entrepriseId}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur mise à jour entreprise Firebase:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Supprime une entreprise de Firebase
 */
export const deleteEntrepriseFirebase = async (entrepriseId) => {
  try {
    await deleteDoc(doc(db, ENTREPRISES_COLLECTION, entrepriseId));
    console.log(`[OK] Entreprise supprimée de Firebase: ${entrepriseId}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur suppression entreprise Firebase:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// OPÉRATIONS LOCALES (PostgreSQL via API)
// ============================================================================

const API_URL = 'http://localhost:3001/api';

/**
 * Récupère toutes les entreprises depuis la base locale
 */
export const getAllEntreprisesLocal = async () => {
  try {
    const response = await fetch(`${API_URL}/entreprises`);
    if (!response.ok) throw new Error('Erreur API locale');
    const data = await response.json();
    return { entreprises: data.entreprises || [], error: null };
  } catch (error) {
    console.error('Erreur getAllEntreprises local:', error);
    return { entreprises: [], error: error.message };
  }
};

/**
 * Crée une entreprise localement
 */
export const createEntrepriseLocal = async (entrepriseData) => {
  try {
    const response = await fetch(`${API_URL}/entreprises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entrepriseData)
    });
    if (!response.ok) throw new Error('Erreur création');
    const data = await response.json();
    return { entreprise: data.entreprise, error: null };
  } catch (error) {
    console.error('Erreur createEntreprise local:', error);
    return { entreprise: null, error: error.message };
  }
};

/**
 * Met à jour une entreprise localement
 */
export const updateEntrepriseLocal = async (entrepriseId, updateData) => {
  try {
    const response = await fetch(`${API_URL}/entreprises/${entrepriseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    if (!response.ok) throw new Error('Erreur mise à jour');
    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur updateEntreprise local:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Supprime une entreprise localement
 */
export const deleteEntrepriseLocal = async (entrepriseId) => {
  try {
    const response = await fetch(`${API_URL}/entreprises/${entrepriseId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Erreur suppression');
    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur deleteEntreprise local:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// SYNCHRONISATION
// ============================================================================

/**
 * Synchronise les entreprises locales vers Firebase
 */
export const syncEntreprisesToFirebase = async (entreprises) => {
  let synced = 0;
  const errors = [];
  
  for (const entreprise of entreprises) {
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
      
      const result = await createEntrepriseFirebase(firebaseData);
      if (result.id) {
        synced++;
      } else {
        errors.push({ id: entreprise.id, error: result.error });
      }
    } catch (error) {
      errors.push({ id: entreprise.id, error: error.message });
    }
  }
  
  return { synced, errors };
};

/**
 * Importe les entreprises depuis Firebase vers local
 */
export const importEntreprisesFromFirebase = async () => {
  try {
    const { entreprises, error } = await getAllEntreprisesFirebase();
    if (error) {
      return { imported: 0, error };
    }
    
    let imported = 0;
    for (const entreprise of entreprises) {
      try {
        await createEntrepriseLocal({
          id: entreprise.id,
          name: entreprise.name,
          contact: entreprise.contact,
          phone: entreprise.phone,
          email: entreprise.email,
          address: entreprise.address,
          specialties: entreprise.specialties
        });
        imported++;
      } catch (err) {
        console.warn(`Erreur import entreprise ${entreprise.id}:`, err);
      }
    }
    
    return { imported, error: null };
  } catch (error) {
    return { imported: 0, error: error.message };
  }
};

export default {
  getAllEntreprisesFirebase,
  createEntrepriseFirebase,
  updateEntrepriseFirebase,
  deleteEntrepriseFirebase,
  getAllEntreprisesLocal,
  createEntrepriseLocal,
  updateEntrepriseLocal,
  deleteEntrepriseLocal,
  syncEntreprisesToFirebase,
  importEntreprisesFromFirebase
};
