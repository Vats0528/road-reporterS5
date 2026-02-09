// =============================================================================
// RÈGLES DE SÉCURITÉ FIRESTORE - Routes Tana (MODE DÉVELOPPEMENT/SYNC)
// =============================================================================
// ⚠️ Ces règles permettent la synchronisation depuis le serveur local
// ⚠️ À utiliser uniquement en développement ou avec un serveur de confiance
// =============================================================================
// Copiez ces règles dans la console Firebase > Firestore > Rules
// =============================================================================

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // =========================================================================
    // FONCTIONS UTILITAIRES
    // =========================================================================
    
    // Vérifie si l'utilisateur est authentifié
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Vérifie si l'utilisateur est le propriétaire du document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Récupère les données utilisateur depuis Firestore
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    // Vérifie si l'utilisateur est un manager
    function isManager() {
      return isAuthenticated() && getUserData().role == 'manager';
    }
    
    // Vérifie si l'utilisateur est un utilisateur normal
    function isUser() {
      return isAuthenticated() && getUserData().role == 'user';
    }
    
    // Vérifie si le signalement appartient à l'utilisateur actuel
    function isReportOwner() {
      return isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Vérifie si le signalement est nouveau (non traité)
    function isNewReport() {
      return resource.data.status == 'nouveau';
    }
    
    // =========================================================================
    // COLLECTION: users
    // =========================================================================
    match /users/{userId} {
      // Lecture: tout le monde peut lire (pour la sync)
      allow read: if true;
      
      // Écriture: authentifiés ou sync serveur
      allow create: if true;
      allow update: if true;
      allow delete: if isManager();
    }
    
    // =========================================================================
    // COLLECTION: road_reports (signalements)
    // =========================================================================
    match /road_reports/{reportId} {
      // Lecture: tout le monde peut lire
      allow read: if true;
      
      // Création: ouvert pour sync (le serveur local peut créer)
      allow create: if true;
      
      // Mise à jour: ouvert pour sync
      allow update: if true;
      
      // Suppression: authentifiés seulement
      allow delete: if isAuthenticated();
    }
    
    // =========================================================================
    // COLLECTION: entreprises
    // =========================================================================
    match /entreprises/{entrepriseId} {
      // Lecture: tout le monde peut lire
      allow read: if true;
      
      // Écriture: ouvert pour sync depuis le serveur local
      allow create: if true;
      allow update: if true;
      allow delete: if isAuthenticated();
    }
    
    // =========================================================================
    // COLLECTION: audit_logs
    // =========================================================================
    match /audit_logs/{logId} {
      allow read: if isManager();
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
