# Configuration Firebase pour Road Reporter

## 1. Structure de la Base de Données Firestore

### Collection: `road_reports`
Contient tous les signalements de dégradations routières.

```json
{
  "road_reports": {
    "<documentId>": {
      // Informations de base
      "type": "nid-de-poule",        // "nid-de-poule" | "fissure" | "effondrement" | "inondation" | "autre"
      "description": "Description du problème",
      "status": "nouveau",            // "nouveau" | "en-cours" | "termine"
      
      // Localisation
      "latitude": -18.9137,
      "longitude": 47.5265,
      "quartier": "analakely",        // ID du quartier (optionnel)
      "quartierName": "Analakely",    // Nom du quartier (optionnel)
      "arrondissement": 1,            // ID de l'arrondissement (optionnel)
      "arrondissementName": "1er Arrondissement",
      "address": "Analakely, 1er Arrondissement, Antananarivo",
      
      // Données techniques (remplies par le manager)
      "surface": 5.5,                 // Surface en m² (null au départ)
      "budget": 250000,               // Budget estimé en MGA (null au départ)
      "entreprise": "Colas Madagascar", // Entreprise assignée (null au départ)
      
      // Images
      "images": [
        {
          "url": "https://firebasestorage.googleapis.com/...",
          "path": "report_images/abc123/image1.jpg",
          "uploadedAt": "2026-01-27T10:30:00Z"
        }
      ],
      
      // Métadonnées utilisateur
      "userId": "uid123abc",          // UID Firebase Auth
      "userEmail": "user@example.com",
      
      // Timestamps
      "createdAt": "Timestamp",       // Firebase ServerTimestamp
      "updatedAt": "Timestamp"        // Firebase ServerTimestamp
    }
  }
}
```

### Collection: `users`
Contient les informations des utilisateurs avec leurs rôles.

```json
{
  "users": {
    "<userId>": {
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "user",                 // "visitor" | "user" | "manager"
      "createdAt": "Timestamp",
      "lastLogin": "Timestamp",
      "photoURL": null
    }
  }
}
```

## 2. Règles de Sécurité Firestore

Copiez ces règles dans votre Console Firebase > Firestore Database > Rules :

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Fonction pour vérifier si l'utilisateur est authentifié
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Fonction pour vérifier si l'utilisateur est un manager
    function isManager() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager';
    }
    
    // Fonction pour vérifier si l'utilisateur est le propriétaire
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Collection road_reports
    match /road_reports/{reportId} {
      // Tout le monde peut lire les signalements (pour la carte publique)
      allow read: if true;
      
      // Seuls les utilisateurs authentifiés peuvent créer
      allow create: if isAuthenticated();
      
      // Les managers peuvent tout modifier
      // Les propriétaires peuvent modifier uniquement si status == "nouveau"
      allow update: if isManager() || 
                      (isOwner(resource.data.userId) && resource.data.status == 'nouveau');
      
      // Seuls les managers peuvent supprimer, ou le propriétaire si status == "nouveau"
      allow delete: if isManager() || 
                      (isOwner(resource.data.userId) && resource.data.status == 'nouveau');
    }
    
    // Collection users
    match /users/{userId} {
      // L'utilisateur peut lire son propre profil
      // Les managers peuvent lire tous les profils
      allow read: if isOwner(userId) || isManager();
      
      // L'utilisateur peut créer/modifier son propre profil
      // Mais ne peut pas changer son rôle (sauf si c'est le premier login)
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) && 
                      (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']) || 
                       isManager());
      
      // Seuls les managers peuvent supprimer des utilisateurs
      allow delete: if isManager();
    }
  }
}
```

## 3. Règles de Stockage Firebase

Copiez ces règles dans votre Console Firebase > Storage > Rules :

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Images des signalements
    match /report_images/{allPaths=**} {
      // Tout le monde peut lire les images
      allow read: if true;
      
      // Seuls les utilisateurs authentifiés peuvent uploader
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024  // Max 5MB
                   && request.resource.contentType.matches('image/.*');
      
      // Seuls les managers ou le propriétaire peuvent supprimer
      allow delete: if request.auth != null;
    }
  }
}
```

## 4. Créer un Manager dans Firebase

### Option A: Via la Console Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet `routes-antananarivo`
3. Allez dans **Firestore Database** > **Données**
4. Créez/modifiez un document dans la collection `users`:

```
Collection: users
Document ID: <UID de l'utilisateur> (trouvable dans Authentication)

Champs:
- email: "manager@example.com" (string)
- displayName: "Manager Admin" (string)
- role: "manager" (string) ⬅️ IMPORTANT
- createdAt: (timestamp)
- lastLogin: (timestamp)
```

### Option B: Après connexion d'un utilisateur

1. L'utilisateur se connecte normalement
2. Son `userId` apparaît dans Authentication
3. Dans Firestore, créez manuellement un document `users/<userId>` avec `role: "manager"`

## 5. Index Firestore (Optionnel mais recommandé)

Créez ces index composites pour améliorer les performances :

```
Collection: road_reports
Champs à indexer:
1. status (Ascending) + createdAt (Descending)
2. userId (Ascending) + createdAt (Descending)
3. arrondissement (Ascending) + createdAt (Descending)
4. quartier (Ascending) + status (Ascending)
```

## 6. Exemple de Document Manager

Voici un exemple complet d'un document utilisateur manager :

```json
{
  "email": "admin@roadreporter.mg",
  "displayName": "Administrateur",
  "role": "manager",
  "createdAt": {
    "_seconds": 1706356800,
    "_nanoseconds": 0
  },
  "lastLogin": {
    "_seconds": 1706443200,
    "_nanoseconds": 0
  },
  "photoURL": null
}
```

## 7. Valeurs possibles pour les champs

### Types de problèmes (`type`)
- `nid-de-poule` - Nid de poule
- `fissure` - Fissure
- `effondrement` - Effondrement de chaussée
- `inondation` - Zone inondable
- `autre` - Autre problème

### Statuts (`status`)
- `nouveau` - Signalement non traité
- `en-cours` - Travaux en cours
- `termine` - Travaux terminés

### Rôles utilisateur (`role`)
- `visitor` - Visiteur (peut seulement voir la carte)
- `user` - Utilisateur connecté (peut créer des signalements)
- `manager` - Manager (accès complet, peut modifier tous les signalements)

## 8. Vérification

Après configuration, testez :

1. **Page publique** : `http://localhost:5173/` - Doit afficher la carte
2. **Connexion** : Créez un compte ou connectez-vous
3. **Créer un signalement** : Cliquez sur la carte puis "Signaler"
4. **Panel Manager** : Connectez-vous avec le compte manager pour accéder à `/manager`

## 9. Dépannage

### Erreur "Permission denied"
- Vérifiez que les règles Firestore sont bien appliquées
- Vérifiez que l'utilisateur est bien connecté
- Vérifiez le rôle dans `users/<userId>`

### Page blanche lors d'un signalement
- Ouvrez la console du navigateur (F12) pour voir les erreurs
- Vérifiez que toutes les dépendances sont installées
- Vérifiez la configuration Firebase dans `src/services/firebase.js`

### Images ne s'uploadent pas
- Vérifiez les règles Storage
- Vérifiez que Storage est activé dans Firebase
- Limite de 5MB par image
