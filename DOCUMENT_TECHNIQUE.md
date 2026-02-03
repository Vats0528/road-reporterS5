# 📋 DOCUMENT TECHNIQUE - Road Reporter

**Projet:** Road Reporter - Système de Signalement de Routes  
**Date:** 27 janvier 2026  
**Ville:** Antananarivo, Madagascar  
**Version:** 1.0.0

---

## Vue d'ensemble

**Road Reporter** est une application web permettant aux citoyens de signaler les problèmes de routes (nids-de-poule, fissures, effondrements, inondations) à Antananarivo.

### Fonctionnalités par Rôle

**Visiteurs:** Voir la carte publique + statistiques  
**Utilisateurs:** Créer des signalements, suivre les siens  
**Managers:** Gérer tous les signalements, exporter, valider données

---

## 📊 Modèle Conceptuel de Données (MCD)

### Vue d'ensemble des Collections

#### 1️⃣ Collection `road_reports` (Signalements de routes)

```
┌─────────────────────────────────────────────────────┐
│            ROAD_REPORTS                             │
├─────────────────────────────────────────────────────┤
│ PK: documentId (String)                             │
├─────────────────────────────────────────────────────┤
│ Informations de Base:                               │
│  • type* (String)                                   │
│    - "nid-de-poule"                                 │
│    - "fissure"                                      │
│    - "effondrement"                                 │
│    - "inondation"                                   │
│    - "autre"                                        │
│  • description (String)                             │
│  • status* (String)                                 │
│    - "nouveau" (par défaut)                         │
│    - "en-cours"                                     │
│    - "termine"                                      │
├─────────────────────────────────────────────────────┤
│ Localisation:                                       │
│  • latitude* (Number)                               │
│  • longitude* (Number)                              │
│  • quartier (String) - ID du quartier               │
│  • quartierName (String)                            │
│  • arrondissement (Number)                          │
│  • arrondissementName (String)                      │
│  • address (String)                                 │
├─────────────────────────────────────────────────────┤
│ Données Techniques (Manager):                       │
│  • surface (Number) - m²                            │
│  • budget (Number) - MGA                            │
│  • entreprise (String)                              │
├─────────────────────────────────────────────────────┤
│ Images:                                             │
│  • images (Array<Object>)                           │
│    - url (String)                                   │
│    - path (String)                                  │
│    - uploadedAt (Timestamp)                         │
├─────────────────────────────────────────────────────┤
│ Métadonnées Utilisateur:                            │
│  • userId* (String) - FK → users.uid                │
│  • userEmail (String)                               │
├─────────────────────────────────────────────────────┤
│ Timestamps:                                         │
│  • createdAt* (Timestamp - ServerTimestamp)         │
│  • updatedAt* (Timestamp - ServerTimestamp)         │
└─────────────────────────────────────────────────────┘
* Champs obligatoires
```

**Exemple de Document:**
```json
{
  "type": "nid-de-poule",
  "description": "Gros trou au milieu de la chaussée",
  "status": "nouveau",
  "latitude": -18.9137,
  "longitude": 47.5265,
  "quartier": "analakely",
  "quartierName": "Analakely",
  "arrondissement": 1,
  "arrondissementName": "1er Arrondissement",
  "address": "Analakely, 1er Arrondissement, Antananarivo",
  "surface": null,
  "budget": null,
  "entreprise": null,
  "images": [
    {
      "url": "https://firebasestorage.googleapis.com/v0/b/...",
      "path": "report_images/abc123/image1.jpg",
      "uploadedAt": "2026-01-27T10:30:00Z"
    }
  ],
  "userId": "uid123abc",
  "userEmail": "user@example.com",
  "createdAt": "2026-01-27T10:30:00Z",
  "updatedAt": "2026-01-27T10:30:00Z"
}
```

---

#### 2️⃣ Collection `users` (Profils Utilisateurs)

```
┌──────────────────────────────────────┐
│           USERS                      │
├──────────────────────────────────────┤
│ PK: uid (String) - Firebase Auth UID │
├──────────────────────────────────────┤
│  • email* (String)                   │
│  • displayName (String)              │
│  • role* (String)                    │
│    - "user" (par défaut)             │
│    - "manager"                       │
│    - "visitor"                       │
│  • createdAt* (Timestamp)            │
│  • lastLogin (Timestamp)             │
│  • photoURL (String - nullable)      │
└──────────────────────────────────────┘
* Champs obligatoires
```

**Exemple de Document:**
```json
{
  "email": "user@example.com",
  "displayName": "John Doe",
  "role": "user",
  "createdAt": "2026-01-27T10:30:00Z",
  "lastLogin": "2026-01-27T15:45:00Z",
  "photoURL": null
}
```

---

### Diagramme MCD (Entités-Relations)

```
                    ┌─────────────────────┐
                    │       USERS         │
                    ├─────────────────────┤
                    │ 🔑 uid (PK)         │
                    │ • email             │
                    │ • displayName       │
                    │ • role              │
                    │ • createdAt         │
                    │ • lastLogin         │
                    │ • photoURL          │
                    └─────────────────────┘
                            △ 1
                            │
                    (Relation: créateur)
                            │
                            ▼ *
        ┌─────────────────────────────────────────┐
        │      ROAD_REPORTS                       │
        ├─────────────────────────────────────────┤
        │ 🔑 documentId (PK)                      │
        │ • type                                  │
        │ • description                           │
        │ • status                                │
        │ • latitude, longitude                   │
        │ • quartier, arrondissement              │
        │ • surface, budget, entreprise           │
        │ • images[]                              │
        │ • userId (FK) → users.uid               │
        │ • createdAt, updatedAt                  │
        └─────────────────────────────────────────┘

Relation: Un USER crée ZÉRO OU PLUSIEURS ROAD_REPORTS
          UN ROAD_REPORT est créé par EXACTEMENT UN USER
```

---

## Scénarios d'Utilisation

### Scénario 1️⃣ : Visiteur consulte la carte publique

**Acteur:** Visiteur (Non authentifié)  
**Précondition:** L'application est accessible  
**Flux Principal:**

1. Visiteur accède à `/map`
2. Système affiche la **carte interactive** avec tous les signalements
3. Chaque signalement est représenté par un **marqueur coloré** :
   - 🟡 "nid-de-poule" (jaune)
   - 🔴 "fissure" (rouge)
   - 🟣 "effondrement" (violet)
   - 🔵 "inondation" (bleu)
   - ⚪ "autre" (gris)

4. Visiteur **survole un marqueur** :
   - Affichage d'une **popup** avec informations :
     - Type de problème
     - Date de signalement
     - Statut
     - Surface (si remplie)
     - Budget (si rempli)
     - Entreprise (si remplie)

5. Visiteur voit le **tableau récapitulatif** :
   - Nombre total de signalements
   - Répartition par statut (nouveau, en-cours, terminé)
   - Répartition par type

**Postcondition:** Visiteur a une vue complète de l'état des routes

---

### Scénario 2️⃣ : Utilisateur se crée un compte

**Acteur:** Visiteur (Non authentifié)  
**Précondition:** L'application est accessible  
**Flux Principal:**

1. Visiteur clique sur **"Commencer Gratuitement"** ou accède à `/register`
2. Système affiche le **formulaire d'inscription**
3. Utilisateur remplit :
   - Email ✉️
   - Mot de passe 🔐
   - Confirmation du mot de passe
   - Nom complet 👤

4. Utilisateur valide le formulaire
5. Système **crée le compte Firebase** (Authentication)
6. Système **crée un document utilisateur** dans Firestore :
   ```json
   {
     "email": "newuser@example.com",
     "displayName": "Marie Dupont",
     "role": "user",
     "createdAt": "2026-01-27T...",
     "lastLogin": "2026-01-27T..."
   }
   ```
7. Utilisateur est **automatiquement connecté**
8. Redirection vers `/dashboard`

**Postcondition:** Nouvel utilisateur créé avec rôle "user"

---

### Scénario 3️⃣ : Utilisateur crée un signalement

**Acteur:** Utilisateur (Authentifié)  
**Précondition:** 
- Utilisateur connecté
- Se trouve sur `/dashboard`

**Flux Principal:**

1. Utilisateur clique sur **"Ajouter un signalement"** (mode ajout activé)
2. Utilisateur **clique sur la carte** au lieu du problème
3. Système affiche un **formulaire modal** avec :
   - ✅ **Type** (dropdown):
     - nid-de-poule
     - fissure
     - effondrement
     - inondation
     - autre
   - ✅ **Description** (textarea)
   - 📸 **Images** (optionnel, upload multiple)
   - ✅ **Localisation** (auto-remplie) :
     - Latitude / Longitude
     - Quartier (auto-détecté)
     - Arrondissement (auto-détecté)
     - Adresse

4. Utilisateur **remplit le formulaire** et clique **"Envoyer"**
5. Système :
   - Valide les données obligatoires
   - Crée le document dans Firestore `road_reports`
   - Uploade les images dans Cloud Storage
   - Affiche une **notification de succès**

6. Système **ajoute un nouveau marqueur** sur la carte
7. Signalement apparaît dans la **liste des ses signalements**

**Postcondition:** Nouveau signalement créé avec statut "nouveau"

**Exemple de document créé:**
```json
{
  "type": "nid-de-poule",
  "description": "Gros trou dangereux",
  "status": "nouveau",
  "latitude": -18.9137,
  "longitude": 47.5265,
  "quartierName": "Analakely",
  "arrondissementName": "1er Arrondissement",
  "userId": "user123abc",
  "userEmail": "newuser@example.com",
  "surface": null,
  "budget": null,
  "entreprise": null,
  "images": ["url1", "url2"],
  "createdAt": "2026-01-27T14:20:00Z",
  "updatedAt": "2026-01-27T14:20:00Z"
}
```

---

### Scénario 4️⃣ : Utilisateur modifie son signalement (avant traitement)

**Acteur:** Utilisateur (Authentifié)  
**Précondition:** 
- Utilisateur a créé un signalement
- Le statut est toujours "nouveau"

**Flux Principal:**

1. Utilisateur consulte `/dashboard`
2. Utilisateur voit son signalement dans la **liste de ses signalements**
3. Utilisateur clique sur **"Modifier"** (icône ✏️)
4. Système affiche le **formulaire d'édition** pré-rempli
5. Utilisateur modifie :
   - Type
   - Description
   - Images
6. Utilisateur clique **"Enregistrer"**
7. Système met à jour le document Firestore
8. Notification de succès

**Contrainte:** ⚠️ Si le statut passe à "en-cours" ou "terminé", l'utilisateur **ne peut plus modifier**. Seul le manager peut le faire.

**Postcondition:** Signalement modifié

---

### Scénario 5️⃣ : Manager se connecte au tableau de bord

**Acteur:** Manager (Administrateur)  
**Précondition:** 
- Compte manager créé manuellement
- Email: `manager@routestana.mg`
- Rôle: "manager"

**Flux Principal:**

1. Manager accède à `/login`
2. Manager saisit ses identifiants :
   - Email: `manager@routestana.mg`
   - Mot de passe
3. Système valide l'authentification Firebase
4. Système vérifie le rôle dans la collection `users`
5. Rôle = "manager" ✅
6. Redirection vers `/manager` (Tableau de bord manager)
7. Manager voit :
   - 🗺️ Carte avec tous les signalements
   - 📊 Statistiques avancées :
     - Nombre total de signalements
     - Répartition par statut
     - Répartition par type
     - Budget total à dépenser
     - Surface totale à réparer
   - 📋 Tableau complet avec tous les signalements
   - 🔄 Bouton de synchronisation Firebase

**Postcondition:** Manager connecté au tableau de bord

---

### Scénario 6️⃣ : Manager modifie un signalement

**Acteur:** Manager  
**Précondition:** 
- Manager connecté au `/manager`
- Signalement visible dans le tableau

**Flux Principal:**

1. Manager clique sur **"Modifier"** (icône ✏️) d'un signalement
2. Système affiche le formulaire d'édition **complet** :
   - Type
   - Description
   - Images
   - **Surface** (m²) - champ manager
   - **Budget** (MGA) - champ manager
   - **Entreprise** - champ manager
   - **Statut** (dropdown manager) :
     - nouveau
     - en-cours
     - terminé

3. Manager remplit/modifie les informations :
   ```json
   Avant: {
     "type": "nid-de-poule",
     "status": "nouveau",
     "surface": null,
     "budget": null,
     "entreprise": null
   }
   
   Après: {
     "type": "nid-de-poule",
     "status": "en-cours",
     "surface": 5.5,
     "budget": 250000,
     "entreprise": "Colas Madagascar"
   }
   ```

4. Manager clique **"Enregistrer"**
5. Système :
   - Met à jour le document Firestore
   - Enregistre dans l'historique local
   - Affiche notification de succès

6. **Tableau mis à jour** en temps réel
7. Statistiques **recalculées** automatiquement

**Postcondition:** Signalement modifié avec toutes les informations

---

### Scénario 7️⃣ : Manager change le statut d'un signalement

**Acteur:** Manager  
**Précondition:** 
- Manager connecté au `/manager`
- Signalement en statut "nouveau"

**Flux Principal:**

1. Manager clique sur le **dropdown de statut** pour un signalement
2. Options affichées :
   - 🆕 nouveau
   - ⏳ en-cours
   - ✅ terminé

3. Manager sélectionne **"en-cours"**
4. Système met à jour le statut dans Firestore
5. **Marqueur sur la carte change de couleur** :
   - Nouveau → 🟢 Vert
   - En-cours → 🟠 Orange
   - Terminé → 🟦 Bleu

6. Notification affichée
7. Historique enregistré

**Contrainte:** Une fois "en-cours", l'utilisateur original **ne peut plus modifier**. Seul le manager peut.

**Postcondition:** Statut mis à jour

---

### Scénario 8️⃣ : Manager visualise les statistiques

**Acteur:** Manager  
**Précondition:** 
- Manager connecté au `/manager`
- Au moins un signalement existe

**Flux Principal:**

1. Manager voit le **panneau de statistiques avancées** (onglet "Dashboard")
2. Affichage :
   - 📊 **Graphique en barres** : Répartition par type
     ```
     nid-de-poule  ████████ (45 signalements)
     fissure       ██████ (32 signalements)
     effondrement  ██ (8 signalements)
     inondation    ███ (15 signalements)
     autre         ██ (6 signalements)
     ```

   - 📈 **Graphique circulaire** : Répartition par statut
     ```
     nouveau  ███████ (52 - 50%)
     en-cours ████ (30 - 29%)
     terminé  ██ (24 - 21%)
     ```

   - 💰 **Statistiques financières** :
     - Budget total estimé: 5,250,000 MGA
     - Budget pour "nouveau": 2,100,000 MGA
     - Budget pour "en-cours": 2,050,000 MGA
     - Budget pour "terminé": 1,100,000 MGA

   - 📏 **Statistiques de surface** :
     - Surface totale: 245.5 m²
     - Surface moyenne par signalement: 2.4 m²

3. Manager peut **filtrer par statut** ou **par type**
4. Les graphiques se **mettent à jour en temps réel**

**Postcondition:** Manager a une vue d'ensemble complète

---

### Scénario 9️⃣ : Manager filtre les signalements

**Acteur:** Manager  
**Précondition:** 
- Manager connecté au `/manager`
- Plusieurs signalements existent

**Flux Principal:**

1. Manager clique sur l'onglet **"Filtres"**
2. Manager voit les options :
   - 📍 **Quartier** (multiselect)
   - 🏢 **Arrondissement** (multiselect)
   - 📌 **Type** (multiselect)
   - 🟦 **Statut** (multiselect)
   - 👤 **Utilisateur** (optionnel)
   - 📅 **Plage de dates** (optionnel)

3. Manager sélectionne **"Statut: nouveau"** et **"Quartier: Analakely"**
4. Système **filtre le tableau** et **la carte**
5. Affichage filtré :
   - 15 signalements "nouveaux" à Analakely
   - Marqueurs correspondants affichés sur la carte
   - Statistiques recalculées pour la sélection

6. Manager peut **réinitialiser les filtres** avec un bouton

**Postcondition:** Affichage filtré

---

### Scénario 🔟 : Manager exporte les données

**Acteur:** Manager  
**Précondition:** 
- Manager connecté au `/manager`
- Signalements visibles (avec ou sans filtrage)

**Flux Principal:**

1. Manager clique sur **"Exporter"** dans le menu actions
2. Options d'export :
   - 📊 **CSV** (Pour Excel)
   - 📄 **JSON** (Format brut)
   - 🖨️ **PDF** (Rapport imprimable)

3. Manager sélectionne **"CSV"**
4. Système crée un fichier CSV avec colonnes :
   ```
   Type,Description,Statut,Latitude,Longitude,
   Quartier,Arrondissement,Surface(m²),Budget(MGA),
   Entreprise,Créé_le,Modifié_le,Email_Créateur
   ```

5. Fichier **téléchargé** automatiquement
6. Notification de succès

**Exemple CSV:**
```csv
Type,Description,Statut,Latitude,Longitude,Quartier,Arrondissement,Surface,Budget,Entreprise,CreatedAt,UpdatedAt,UserEmail
nid-de-poule,Gros trou,nouveau,-18.9137,47.5265,Analakely,1er Arrondissement,5.5,250000,Colas Madagascar,2026-01-27,2026-01-27,user@example.com
fissure,Petites fissures,en-cours,-18.9150,47.5280,Analakely,1er Arrondissement,3.2,150000,,2026-01-26,2026-01-27,user2@example.com
```

**Postcondition:** Données exportées

---

### Scénario 1️⃣1️⃣ : Manager valide l'intégrité des données

**Acteur:** Manager  
**Précondition:** 
- Manager connecté au `/manager`
- Onglet "Validation" disponible

**Flux Principal:**

1. Manager clique sur l'onglet **"Validation"**
2. Système scanne tous les signalements et détecte :
   - ⚠️ **Signalements incomplets** :
     - Surface vide (mais budget rempli)
     - Entreprise assignée (mais budget vide)
     - Images manquantes
   - ⚠️ **Données incohérentes** :
     - Budget anormalement élevé
     - Surface anormalement petite/grande

3. Rapport d'erreurs affiché :
   ```
   ❌ 5 signalements incomplets détectés:
   
   - 📍 Signalement #1 (Analakely)
     └─ Surface manquante (Budget: 250000 MGA)
   
   - 📍 Signalement #3 (Vakinankaratra)
     └─ Entreprise assignée mais budget vide
   
   - 📍 Signalement #7 (Analamahitsy)
     └─ Budget suspect: 10,000,000 MGA (surface: 0.5m²)
   ```

4. Manager clique sur chaque erreur pour **corriger directement**
5. Signalement corrigé est **retiré de la liste**

**Postcondition:** Données validées et corrigées

---

### Scénario 1️⃣2️⃣ : Manager supprime un signalement

**Acteur:** Manager  
**Précondition:** 
- Manager connecté au `/manager`
- Signalement à supprimer visible

**Flux Principal:**

1. Manager clique sur **"Supprimer"** (icône 🗑️)
2. Système affiche une **modal de confirmation** :
   ```
   ⚠️ Êtes-vous sûr de vouloir supprimer ce signalement ?
   
   Type: nid-de-poule
   Quartier: Analakely
   Créé le: 2026-01-26 par user@example.com
   
   [Annuler] [Supprimer]
   ```

3. Manager clique **"Supprimer"**
4. Système :
   - Supprime le document Firestore
   - Supprime les images associées du Cloud Storage
   - Met à jour la carte
   - Enregistre dans l'historique

5. Notification de succès

**Postcondition:** Signalement supprimé

---

### Scénario 1️⃣3️⃣ : Utilisateur consulte l'historique de modification

**Acteur:** Manager  
**Précondition:** 
- Manager connecté au `/manager`
- Onglet "Historique" disponible

**Flux Principal:**

1. Manager clique sur l'onglet **"Historique"**
2. Système affiche **tous les changements effectués** :
   ```
   📅 Lundi 27 janvier 2026
   
   14:32 ✏️ MODIFICATION - Signalement #5 (Analakely)
        Champ modifié: Statut
        Avant: nouveau → Après: en-cours
   
   14:15 ✏️ MODIFICATION - Signalement #2 (Analakely)
        Champs modifiés: Budget, Entreprise
        Budget: null → 180000 MGA
        Entreprise: null → "Lafarge Ciments"
   
   14:08 ➕ CRÉATION - Signalement #1 (Analakely)
        Créé par: user@example.com
   
   13:45 ✏️ MODIFICATION - Signalement #3 (Vakinankaratra)
        Statut: en-cours → terminé
   
   13:20 🗑️ SUPPRESSION - Signalement #7
        Raison: Doublon détecté
   ```

3. Manager peut **filtrer l'historique** par :
   - Date
   - Type d'action (création, modification, suppression)
   - Signalement

4. Manager peut **exporter l'historique** en CSV

**Postcondition:** Historique consulté

---

## Stack Technologique

### Frontend
| Technologie | Version | Rôle |
|-------------|---------|------|
| **React** | 18.3.1 | Framework UI |
| **React Router** | 6.22.0 | Routage frontend |
| **Vite** | 5.1.4 | Build tool |
| **Tailwind CSS** | 3.4.1 | Styling |
| **Leaflet** | 1.9.4 | Cartographie |
| **React Leaflet** | 4.2.1 | Intégration Leaflet |
| **Lucide React** | 0.263.1 | Icons |
| **Axios** | 1.6.7 | Requêtes HTTP |
| **Firebase SDK** | 10.8.0 | Backend services |

### Backend (Firebase)
| Service | Utilisation |
|---------|-----------|
| **Firebase Authentication** | Gestion des utilisateurs (email/password) |
| **Firestore** | Base de données NoSQL (collections: users, road_reports) |
| **Cloud Storage** | Stockage des images de signalements |
| **Security Rules** | Contrôle d'accès granulaire |

### Outils de Développement
| Outil | Version |
|------|---------|
| Node.js | 18+ |
| npm | Latest |
| PostCSS | 8.4.35 |
| Autoprefixer | 10.4.17 |

---

## Structure du Projet

```
road-reporter/
├── 📄 package.json              # Dépendances & scripts
├── 📄 vite.config.js            # Configuration Vite
├── 📄 tailwind.config.js        # Configuration Tailwind
├── 📄 postcss.config.js         # Configuration PostCSS
├── 📄 index.html                # Point d'entrée HTML
├── 📄 FIREBASE_SETUP.md         # Guide configuration Firebase
├── 📄 DOCUMENT_TECHNIQUE.md     # Ce fichier
│
├── 📁 public/                   # Assets statiques
│
├── 📁 src/
│   ├── 📄 main.jsx              # Entry React
│   ├── 📄 App.jsx               # Routing principal
│   ├── 📄 index.css             # Styles globaux
│   │
│   ├── 📁 pages/ (6 pages)
│   │   ├── HomePage.jsx         # Page d'accueil
│   │   ├── LoginPage.jsx        # Formulaire connexion
│   │   ├── RegisterPage.jsx     # Formulaire inscription
│   │   ├── UserDashboard.jsx    # Tableau de bord utilisateur
│   │   ├── ManagerPanel.jsx     # Tableau de bord manager
│   │   └── PublicMapPage.jsx    # Carte publique (visitors)
│   │
│   ├── 📁 components/ (16 composants)
│   │   ├── Navbar.jsx           # Barre navigation
│   │   ├── BottomNav.jsx        # Menu bas mobile
│   │   ├── RoadMap.jsx          # Carte Leaflet
│   │   ├── ReportForm.jsx       # Formulaire signalement
│   │   ├── ReportHistory.jsx    # Historique modifications
│   │   ├── SummaryTable.jsx     # Tableau récapitulatif
│   │   ├── SearchFilters.jsx    # Filtres avancés
│   │   ├── AdvancedStats.jsx    # Graphiques statistiques
│   │   ├── EntrepriseManager.jsx # Gestion entreprises
│   │   ├── ImageGallery.jsx     # Galerie images
│   │   ├── ImageUpload.jsx      # Upload images
│   │   ├── LoginForm.jsx        # Formulaire connexion
│   │   ├── RegisterForm.jsx     # Formulaire inscription
│   │   ├── QuartierSelector.jsx # Sélecteur quartiers
│   │   ├── PermissionGuard.jsx  # Contrôle d'accès
│   │   └── Toast.jsx            # Notifications
│   │
│   ├── 📁 services/
│   │   ├── firebase.js          # Configuration Firebase
│   │   ├── authService.js       # Gestion authentification
│   │   ├── reportService.js     # CRUD signalements
│   │   ├── imageService.js      # Gestion images
│   │   ├── exportService.js     # Export données
│   │   └── validationService.jsx # Validation données
│   │
│   ├── 📁 context/
│   │   └── AuthContext.jsx      # Context authentification
│   │
│   ├── 📁 hooks/
│   │   └── usePermissions.js    # Hook permissions
│   │
│   ├── 📁 config/
│   │   ├── firestore.rules.js   # Règles Firestore
│   │   └── storage.rules.js     # Règles Cloud Storage
│   │
│   ├── 📁 data/
│   │   ├── quartiers.js         # Liste quartiers Tana
│   │   └── sampleData.js        # Données d'exemple
│   │
│   ├── 📁 utils/
│   │   ├── constants.js         # Constantes
│   │   └── helpers.js           # Fonctions utilitaires
│   │
│   └── 📁 styles/
│       └── index.css            # Styles globaux
│
└── 📁 Documentation/
    └── README.md                # Documentation complète
```

---

## Flux d'Authentification

### 1. Inscription (Register)
```
Utilisateur
    ↓ [Remplit le formulaire]
    ↓
Firebase Auth (createUserWithEmailAndPassword)
    ↓ [Compte créé avec UID]
    ↓
Firestore `users` collection
    ↓ [Document utilisateur créé]
    ↓
AuthContext [Utilisateur connecté automatiquement]
    ↓
Redirection → /dashboard
```

### 2. Connexion (Login)
```
Utilisateur
    ↓ [Remplit les identifiants]
    ↓
Firebase Auth (signInWithEmailAndPassword)
    ↓ [Authentification réussie]
    ↓
Firestore `users` collection
    ↓ [Récupère le rôle (user/manager)]
    ↓
AuthContext [Définit currentUser & userData]
    ↓
Si rôle = "manager" → Redirection /manager
Si rôle = "user" → Redirection /dashboard
```

### 3. Vérification des permissions
```
User clique sur une action
    ↓
usePermissions() hook
    ↓
Vérifie role dans userData
    ↓
    ├─ manager ? → Toutes les actions
    ├─ user ? → Actions limitées
    └─ visitor ? → Lecture seule
```

---

## Points Clés de Sécurité

### 🔐 Firestore Security Rules
```javascript
// Tout le monde peut LIRE les signalements (carte publique)
allow read: if true;

// Seuls les utilisateurs AUTHENTIFIÉS peuvent créer
allow create: if request.auth != null;

// Les MANAGERS peuvent tout modifier
// Les UTILISATEURS peuvent modifier uniquement leurs signalements NON TRAITÉS
allow update: if isManager() || 
              (isOwner(resource.data.userId) && resource.data.status == 'nouveau');

// Les MANAGERS peuvent supprimer
// Les UTILISATEURS peuvent supprimer uniquement leurs signalements NON TRAITÉS
allow delete: if isManager() || 
              (isOwner(resource.data.userId) && resource.data.status == 'nouveau');
```

### 🖼️ Cloud Storage Security Rules
```javascript
// Les images des signalements sont PUBLIQUES en lecture
allow read: if true;

// Seuls les UTILISATEURS AUTHENTIFIÉS peuvent uploader
allow write: if request.auth != null;
```

---

## État Actuel du Projet

✅ **Complété:**
- Architecture complète (Frontend + Backend Firebase)
- Authentification (inscription, connexion, déconnexion)
- Gestion des signalements (CRUD)
- Visualisation cartographique (Leaflet)
- Tableau de bord utilisateur
- Tableau de bord manager avec statistiques
- Filtres avancés
- Historique des modifications
- Export de données (CSV, JSON)
- Validation de données
- Galerie d'images
- Responsive design (Mobile + Desktop)
- Règles de sécurité Firestore

🔄 **Possibilités d'amélioration:**
- Notifications en temps réel (Firebase Cloud Messaging)
- Géolocalisation automatique du navigateur
- Intégration avec système de ticketing externe
- Génération de rapports PDF
- Assignation automatique par zone géographique
- Système de notation/commentaires
- API REST pour intégrations tierces
- Dashboard analytique avancé

---

## Conclusion

**Road Reporter** est une application web complète et fonctionnelle pour la gestion collaborative des signalements routiers à Antananarivo. La combinaison de React, Firebase et Leaflet permet une expérience utilisateur fluide et responsive, avec des fonctionnalités de gestion avancées pour les managers.

Le système de permissions granulaires assure que seules les personnes autorisées peuvent effectuer certaines actions, tandis que la base de données Firestore garantit la scalabilité et la fiabilité.

---

**Document généré le:** 27 janvier 2026  
**Version:** 1.0.0  
**Statut:** ✅ Production-Ready
