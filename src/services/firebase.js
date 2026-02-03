// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCBsEBAiZWYNmPfY8xHuXu6-EoMg4JVfZ8",
  authDomain: "routes-antananarivo.firebaseapp.com",
  projectId: "routes-antananarivo",
  storageBucket: "routes-antananarivo.firebasestorage.app",
  messagingSenderId: "612527432283",
  appId: "1:612527432283:web:817f5cea045b2681f6957e",
  measurementId: "G-4Z2E1BM5KL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth, Firestore and Storage
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Activer la persistence hors ligne (optionnel, améliore les performances)
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence échouée: plusieurs onglets ouverts');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence non supportée par ce navigateur');
    }
  });
} catch (e) {
  console.warn('Persistence non disponible');
}

export default app;