import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Fonction pour diagnostiquer et corriger les rôles utilisateurs dans Firestore
 */

/**
 * Fonction pour créer/corriger un document manager avec un UID spécifique
 */
export const fixManagerByUID = async (uid, email, role = 'manager') => {
  try {
    console.log(`🔧 Correction du manager avec UID: ${uid}`);
    
    const managerData = {
      uid: uid,
      email: email,
      displayName: 'Manager Principal',
      role: role.toLowerCase(),
      createdAt: new Date().toISOString()
    };
    
    console.log('📝 Données du manager:', managerData);
    
    // Créer/écraser le document avec le bon UID
    await setDoc(doc(db, 'users', uid), managerData, { merge: false });
    
    console.log('✅ Document manager corrigé avec succès!');
    
    return { error: null, manager: managerData };
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    return { error: error.message, manager: null };
  }
};

export const createNewManager = async (email, displayName = 'Manager Principal') => {
  try {
    console.log(`🚀 Création d'un nouveau manager: ${email}`);
    
    // Générer un UID simple
    const uid = 'mgr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const managerData = {
      uid: uid,
      email: email,
      displayName: displayName,
      role: 'manager', // minuscule!
      createdAt: new Date().toISOString()
    };
    
    console.log('📝 Données du manager:', managerData);
    
    // Créer le document dans Firestore
    await setDoc(doc(db, 'users', uid), managerData);
    
    console.log('✅ Manager créé avec succès!');
    console.log('📋 Données:', managerData);
    
    return { error: null, manager: managerData };
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error);
    return { error: error.message, manager: null };
  }
};

export const checkAndFixUserRole = async (email) => {
  try {
    console.log(`🔍 Vérification de l'utilisateur: ${email}`);
    
    // Chercher l'utilisateur par email dans la collection users
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.error('❌ Utilisateur non trouvé dans Firestore');
      return { error: 'Utilisateur non trouvé', user: null };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const uid = userDoc.id;
    
    console.log('📋 Données actuelles de l\'utilisateur:', userData);
    console.log(`Role actuel: "${userData.role}" (type: ${typeof userData.role})`);
    
    // Vérifier si le rôle doit être corrigé
    if (userData.role && userData.role !== userData.role.toLowerCase()) {
      console.warn(`⚠️ Rôle avec majuscules détecté: "${userData.role}"`);
      
      const correctedRole = userData.role.toLowerCase();
      console.log(`✅ Correction: "${userData.role}" → "${correctedRole}"`);
      
      // Mettre à jour le rôle
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, { role: correctedRole });
      
      console.log('✔️ Rôle corrigé avec succès dans Firestore!');
      return {
        error: null,
        user: {
          uid,
          ...userData,
          role: correctedRole
        },
        corrected: true
      };
    } else {
      console.log('✔️ Rôle déjà au bon format (minuscules)');
      return {
        error: null,
        user: { uid, ...userData },
        corrected: false
      };
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    return { error: error.message, user: null };
  }
};

/**
 * Fonction pour lister tous les utilisateurs et leurs rôles
 */
export const listAllUsers = async () => {
  try {
    console.log('📊 Récupération de tous les utilisateurs...');
    
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        uid: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        createdAt: userData.createdAt
      });
    });
    
    console.table(users);
    return { error: null, users };
  } catch (error) {
    console.error('❌ Erreur lors de la récupération:', error);
    return { error: error.message, users: [] };
  }
};

/**
 * Fonction pour corriger TOUS les rôles avec majuscules
 */
export const fixAllUserRoles = async () => {
  try {
    console.log('🔧 Correction globale de tous les rôles...');
    
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    let correctedCount = 0;
    
    for (const userDoc of querySnapshot.docs) {
      const userData = userDoc.data();
      
      if (userData.role && userData.role !== userData.role.toLowerCase()) {
        const correctedRole = userData.role.toLowerCase();
        console.log(`Correction: ${userData.email}: "${userData.role}" → "${correctedRole}"`);
        
        await updateDoc(doc(db, 'users', userDoc.id), {
          role: correctedRole
        });
        correctedCount++;
      }
    }
    
    console.log(`✔️ ${correctedCount} utilisateur(s) corrigé(s)`);
    return { error: null, correctedCount };
  } catch (error) {
    console.error('❌ Erreur lors de la correction globale:', error);
    return { error: error.message, correctedCount: 0 };
  }
};
