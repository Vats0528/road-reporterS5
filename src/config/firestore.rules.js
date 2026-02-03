// =============================================================================
// RÈGLES DE SÉCURITÉ FIRESTORE - Routes Tana
// =============================================================================
// Copiez ces règles dans la console Firebase > Firestore > Rules
// =============================================================================

/*
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
      // Lecture: l'utilisateur peut lire son propre profil, les managers peuvent tout lire
      allow read: if isOwner(userId) || isManager();
      
      // Création: uniquement lors de l'inscription (via Auth)
      allow create: if isOwner(userId) && 
                       request.resource.data.keys().hasAll(['uid', 'email', 'displayName', 'role', 'createdAt']) &&
                       request.resource.data.role in ['user', 'visitor'];
      
      // Mise à jour: l'utilisateur peut modifier ses infos (sauf le rôle), les managers peuvent tout modifier
      allow update: if (isOwner(userId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role'])) ||
                       isManager();
      
      // Suppression: uniquement les managers
      allow delete: if isManager();
    }
    
    // =========================================================================
    // COLLECTION: road_reports (signalements)
    // =========================================================================
    match /road_reports/{reportId} {
      // Lecture: tout le monde peut lire (visiteurs inclus)
      allow read: if true;
      
      // Création: uniquement les utilisateurs authentifiés
      allow create: if isAuthenticated() && 
                       request.resource.data.userId == request.auth.uid &&
                       request.resource.data.status == 'nouveau' &&
                       request.resource.data.keys().hasAll(['latitude', 'longitude', 'type', 'description', 'userId', 'userEmail', 'status', 'createdAt']);
      
      // Mise à jour:
      // - Les managers peuvent tout modifier
      // - Les utilisateurs peuvent modifier leurs propres signalements NON TRAITÉS (status = 'nouveau')
      allow update: if isManager() || 
                       (isReportOwner() && isNewReport() && 
                        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['userId', 'userEmail', 'createdAt']));
      
      // Suppression:
      // - Les managers peuvent tout supprimer
      // - Les utilisateurs peuvent supprimer leurs propres signalements NON TRAITÉS
      allow delete: if isManager() || (isReportOwner() && isNewReport());
    }
    
    // =========================================================================
    // COLLECTION: entreprises (optionnel - pour la gestion des entreprises)
    // =========================================================================
    match /entreprises/{entrepriseId} {
      // Lecture: tout le monde peut lire
      allow read: if true;
      
      // Écriture: uniquement les managers
      allow write: if isManager();
    }
    
    // =========================================================================
    // COLLECTION: audit_logs (optionnel - pour le suivi des modifications)
    // =========================================================================
    match /audit_logs/{logId} {
      // Lecture: uniquement les managers
      allow read: if isManager();
      
      // Création: système uniquement (via Cloud Functions)
      allow create: if false;
      
      // Modification/Suppression: interdite
      allow update, delete: if false;
    }
    
    // =========================================================================
    // BLOQUER TOUT LE RESTE
    // =========================================================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/

// =============================================================================
// INSTRUCTIONS D'INSTALLATION
// =============================================================================
/*

1. ACCÉDER À LA CONSOLE FIREBASE
   - Allez sur https://console.firebase.google.com
   - Sélectionnez votre projet "routes-antananarivo"

2. CONFIGURER FIRESTORE RULES
   - Cliquez sur "Firestore Database" dans le menu
   - Allez dans l'onglet "Rules"
   - Copiez le contenu entre les commentaires ci-dessus
   - Cliquez sur "Publish"

3. CRÉER LES INDEX NÉCESSAIRES
   - Allez dans l'onglet "Indexes"
   - Créez les index composites suivants :

   Collection: road_reports
   Fields: userId (Ascending), createdAt (Descending)
   
   Collection: road_reports
   Fields: status (Ascending), createdAt (Descending)

4. TESTER LES RÈGLES
   - Utilisez le "Rules Playground" dans la console Firebase
   - Testez différents scénarios (visiteur, user, manager)

*/

// =============================================================================
// RÉSUMÉ DES PERMISSIONS
// =============================================================================
/*

| Action                    | Visiteur | User  | Manager |
|---------------------------|----------|-------|---------|
| Lire signalements         | ✅       | ✅    | ✅      |
| Créer signalement         | ❌       | ✅    | ✅      |
| Modifier son signalement  | ❌       | ✅*   | ✅      |
| Modifier tout signalement | ❌       | ❌    | ✅      |
| Supprimer son signalement | ❌       | ✅*   | ✅      |
| Supprimer tout            | ❌       | ❌    | ✅      |
| Voir profils utilisateurs | ❌       | ❌**  | ✅      |
| Gérer entreprises         | ❌       | ❌    | ✅      |

* Uniquement si le signalement a le statut "nouveau"
** Peut voir uniquement son propre profil

*/

export default {};
