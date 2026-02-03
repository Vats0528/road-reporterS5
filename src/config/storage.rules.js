/**
 * Règles de sécurité Firebase Storage
 * 
 * Pour appliquer ces règles :
 * 1. Allez sur la Console Firebase (https://console.firebase.google.com)
 * 2. Sélectionnez votre projet
 * 3. Allez dans "Storage" dans le menu de gauche
 * 4. Cliquez sur l'onglet "Rules"
 * 5. Copiez-collez les règles ci-dessous
 * 6. Cliquez sur "Publish"
 */

/*
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Fonction pour vérifier si l'utilisateur est authentifié
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Fonction pour vérifier si l'utilisateur est le propriétaire du fichier
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Fonction pour vérifier le type de fichier (images uniquement)
    function isValidImageType() {
      return request.resource.contentType.matches('image/.*');
    }
    
    // Fonction pour vérifier la taille du fichier (max 5MB)
    function isValidFileSize() {
      return request.resource.size < 5 * 1024 * 1024;
    }
    
    // Fonction pour vérifier si c'est une image valide
    function isValidImage() {
      return isValidImageType() && isValidFileSize();
    }
    
    // Règles pour les images des signalements
    match /reports/{reportId}/images/{imageId} {
      // Lecture: tout le monde peut voir les images
      allow read: if true;
      
      // Écriture: utilisateur authentifié + fichier valide
      allow write: if isAuthenticated() && isValidImage();
      
      // Suppression: utilisateur authentifié (propriétaire ou manager)
      allow delete: if isAuthenticated();
    }
    
    // Règles pour les photos de profil
    match /users/{userId}/profile/{imageId} {
      // Lecture: tout le monde peut voir les photos de profil
      allow read: if true;
      
      // Écriture: uniquement le propriétaire + fichier valide
      allow write: if isOwner(userId) && isValidImage();
      
      // Suppression: uniquement le propriétaire
      allow delete: if isOwner(userId);
    }
    
    // Règles par défaut: refuser tout le reste
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
*/

/**
 * Instructions de configuration :
 * 
 * 1. CRÉER LE BUCKET STORAGE
 *    - Allez dans Firebase Console > Storage
 *    - Cliquez sur "Get Started"
 *    - Choisissez les règles (commencez en mode test si nécessaire)
 *    - Choisissez la région la plus proche (par ex: europe-west1)
 * 
 * 2. CONFIGURER CORS (pour les téléchargements depuis le navigateur)
 *    Créez un fichier cors.json avec ce contenu:
 *    [
 *      {
 *        "origin": ["http://localhost:5173", "https://votre-domaine.com"],
 *        "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
 *        "maxAgeSeconds": 3600,
 *        "responseHeader": ["Content-Type"]
 *      }
 *    ]
 *    
 *    Puis exécutez (avec gsutil installé):
 *    gsutil cors set cors.json gs://votre-projet.appspot.com
 * 
 * 3. VÉRIFIER LA CONFIGURATION FIREBASE
 *    Assurez-vous que firebase.js contient la bonne config:
 *    - storageBucket: "votre-projet.appspot.com"
 * 
 * 4. TESTER L'UPLOAD
 *    - Créez un nouveau signalement avec des photos
 *    - Vérifiez dans la Console Firebase > Storage que les fichiers sont créés
 *    - Vérifiez que les URLs sont stockées dans Firestore
 */

export const STORAGE_RULES_VERSION = '1.0.0';

export const STORAGE_PATHS = {
  REPORT_IMAGES: (reportId) => `reports/${reportId}/images/`,
  USER_PROFILE: (userId) => `users/${userId}/profile/`,
};

export const STORAGE_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES_PER_REPORT: 5,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};
