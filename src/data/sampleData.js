// Exemples de signalements pour tester l'application
// Ces données peuvent être ajoutées manuellement dans Firestore pour tester

export const sampleReports = [
  {
    userId: "sample-user-1",
    userEmail: "user1@example.com",
    latitude: -18.9138,
    longitude: 47.5364,
    type: "nid-de-poule",
    description: "Gros nid de poule sur la route principale d'Analakely, dangereux pour les deux-roues",
    status: "nouveau",
    surface: null,
    budget: null,
    entreprise: null
  },
  {
    userId: "sample-user-2",
    userEmail: "user2@example.com",
    latitude: -18.8792,
    longitude: 47.5079,
    type: "fissure",
    description: "Fissure importante sur l'Avenue de l'Indépendance, nécessite une intervention rapide",
    status: "en-cours",
    surface: 15.5,
    budget: 5000000,
    entreprise: "Routes de Madagascar"
  },
  {
    userId: "sample-user-1",
    userEmail: "user1@example.com",
    latitude: -18.9042,
    longitude: 47.5214,
    type: "affaissement",
    description: "Affaissement de la chaussée après les pluies, risque d'effondrement",
    status: "en-cours",
    surface: 25.0,
    budget: 8500000,
    entreprise: "Travaux Publics Tana"
  },
  {
    userId: "sample-user-3",
    userEmail: "user3@example.com",
    latitude: -18.8650,
    longitude: 47.5108,
    type: "inondation",
    description: "Problème de drainage, la route est inondée à chaque pluie",
    status: "nouveau",
    surface: null,
    budget: null,
    entreprise: null
  },
  {
    userId: "sample-user-2",
    userEmail: "user2@example.com",
    latitude: -18.9200,
    longitude: 47.5300,
    type: "nid-de-poule",
    description: "Série de nids de poule à Antsirabe, réparation effectuée avec succès",
    status: "termine",
    surface: 8.0,
    budget: 2500000,
    entreprise: "BTP Madagascar"
  },
  {
    userId: "sample-user-4",
    userEmail: "user4@example.com",
    latitude: -18.8900,
    longitude: 47.5250,
    type: "fissure",
    description: "Fissure longitudinale sur la RN1, travaux terminés",
    status: "termine",
    surface: 12.5,
    budget: 4200000,
    entreprise: "Routes de Madagascar"
  },
  {
    userId: "sample-user-3",
    userEmail: "user3@example.com",
    latitude: -18.8820,
    longitude: 47.5150,
    type: "autre",
    description: "Déformation importante de la chaussée à Ambalavao",
    status: "nouveau",
    surface: null,
    budget: null,
    entreprise: null
  },
  {
    userId: "sample-user-1",
    userEmail: "user1@example.com",
    latitude: -18.9050,
    longitude: 47.5400,
    type: "nid-de-poule",
    description: "Nid de poule profond devant l'école primaire, dangereux pour les enfants",
    status: "en-cours",
    surface: 3.5,
    budget: 1200000,
    entreprise: "Travaux Publics Tana"
  }
];

// Instructions pour ajouter ces données dans Firestore :
// 1. Ouvrez la console Firebase
// 2. Allez dans Firestore Database
// 3. Créez la collection "road_reports" si elle n'existe pas
// 4. Pour chaque objet ci-dessus :
//    - Cliquez sur "Add document"
//    - Laissez l'ID auto-généré
//    - Ajoutez chaque champ avec son type approprié
//    - Ajoutez les champs timestamp :
//      * createdAt: timestamp (maintenant)
//      * updatedAt: timestamp (maintenant)
//    - Sauvegardez

// Ou utilisez ce code dans la console du navigateur (après connexion) :
/*
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './services/firebase';

async function addSampleReports() {
  for (const report of sampleReports) {
    await addDoc(collection(db, 'road_reports'), {
      ...report,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
  console.log('Sample reports added!');
}
*/