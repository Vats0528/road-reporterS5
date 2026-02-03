# 🛣️ Routes Tana - Système de Signalement de Routes à Antananarivo

Application web complète de signalement et suivi des problèmes routiers à Antananarivo, Madagascar.

## 📋 Fonctionnalités

### Pour tous les visiteurs
- ✅ Visualisation de la carte interactive avec tous les signalements
- ✅ Survol des marqueurs pour voir les détails (date, statut, surface, budget, entreprise)
- ✅ Tableau de récapitulation avec statistiques complètes
- ✅ Graphiques de progression et répartition des statuts

### Pour les utilisateurs connectés
- ✅ Création de signalements en cliquant sur la carte
- ✅ Suivi de tous les signalements
- ✅ Filtrage pour voir uniquement ses propres signalements
- ✅ Tableau de bord personnalisé avec statistiques

### Pour les managers
- ✅ Panneau de gestion complet
- ✅ Modification des informations de chaque signalement (surface, budget, entreprise)
- ✅ Changement de statut (nouveau → en cours → terminé)
- ✅ Bouton de synchronisation avec Firebase
- ✅ Filtres avancés par statut
- ✅ Vue d'ensemble des statistiques globales

## 🚀 Technologies utilisées

- **Frontend**: React 18 + Vite
- **Routing**: React Router DOM v6
- **Carte**: Leaflet + React Leaflet + OpenStreetMap
- **Backend**: Firebase (Auth + Firestore)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## 📦 Installation

### Prérequis
- Node.js 18+ et npm

### Étapes d'installation

1. **Cloner le projet**
```bash
cd road-reporter
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration Firebase**

Créez un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com)

Activez :
- Authentication (Email/Password)
- Firestore Database
- Storage (optionnel)

Modifiez le fichier `src/services/firebase.js` avec vos identifiants :

```javascript
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_AUTH_DOMAIN",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_STORAGE_BUCKET",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APP_ID"
};
```

4. **Créer un compte Manager**

Dans la console Firebase, créez manuellement un utilisateur avec :
- Email: `manager@routestana.mg`
- Password: `Manager@123`

Puis ajoutez un document dans la collection `users` :
```javascript
{
  uid: "UID_DE_L_UTILISATEUR",
  email: "manager@routestana.mg",
  displayName: "Manager Principal",
  role: "manager",
  createdAt: "2026-01-27T..."
}
```

5. **Configuration Firestore**

Créez les collections suivantes :
- `users` - Pour les profils utilisateurs
- `road_reports` - Pour les signalements

Règles de sécurité Firestore recommandées :
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    match /road_reports/{reportId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager';
    }
  }
}
```

6. **Lancer l'application**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## 📁 Structure du projet

```
road-reporter/
├── public/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── RoadMap.jsx
│   │   ├── SummaryTable.jsx
│   │   ├── LoginForm.jsx
│   │   ├── RegisterForm.jsx
│   │   └── ReportForm.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── UserDashboard.jsx
│   │   └── ManagerPanel.jsx
│   ├── services/
│   │   ├── firebase.js
│   │   ├── authService.js
│   │   └── reportService.js
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── styles/
│   │   └── index.css
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## 🎨 Design

L'application utilise une palette de couleurs chaude inspirée par les terres d'Antananarivo :
- Orange/Rouge pour l'action et l'urgence
- Vert pour les succès et projets terminés
- Bleu pour les nouveaux signalements
- Gris neutre pour l'interface

Typographies :
- **Display**: Outfit (titres)
- **Body**: Work Sans (texte)

## 🔐 Comptes de test

**Manager** (accès complet) :
- Email: `manager@routestana.mg`
- Password: `Manager@123`

**Utilisateur** (à créer via inscription) :
- Inscription libre sur `/register`

## 🗺️ Utilisation de la carte

La carte utilise OpenStreetMap avec les tuiles publiques. Coordonnées par défaut centrées sur Antananarivo :
- Latitude: -18.8792
- Longitude: 47.5079
- Zoom: 13

## 📊 Modèle de données

### Signalement (road_report)
```javascript
{
  id: string,
  userId: string,
  userEmail: string,
  latitude: number,
  longitude: number,
  type: string, // 'nid-de-poule' | 'fissure' | 'affaissement' | 'inondation' | 'autre'
  description: string,
  status: string, // 'nouveau' | 'en-cours' | 'termine'
  surface: number | null, // m²
  budget: number | null, // MGA
  entreprise: string | null,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Utilisateur (user)
```javascript
{
  uid: string,
  email: string,
  displayName: string,
  role: string, // 'user' | 'manager'
  createdAt: string
}
```

## 🚧 Développement

### Scripts disponibles

```bash
# Développement
npm run dev

# Build production
npm run build

# Preview production
npm run preview
```

### Personnalisation

Pour personnaliser les couleurs, modifiez `tailwind.config.js` :
```javascript
colors: {
  primary: { /* vos couleurs */ },
  antananarivo: { /* vos couleurs locales */ }
}
```

## 📱 Responsive Design

L'application est entièrement responsive :
- Mobile : < 640px
- Tablette : 640px - 1024px
- Desktop : > 1024px

## 🔄 Synchronisation Firebase

Le bouton "Synchroniser" dans le panneau Manager :
1. Récupère tous les signalements de Firestore
2. Met à jour l'affichage local
3. Prépare les données pour l'application mobile (si implémentée)

## 🐛 Debugging

En cas de problème :
1. Vérifiez la console du navigateur (F12)
2. Vérifiez les règles Firebase
3. Vérifiez que tous les services Firebase sont activés
4. Vérifiez les credentials dans `firebase.js`

## 📄 License

Ce projet est sous licence MIT.

## 👥 Contributeurs

Projet créé pour la gestion des routes à Antananarivo, Madagascar.

## 📞 Support

Pour toute question ou problème, créez une issue sur le repository GitHub.

---

**Made with ❤️ for Antananarivo, Madagascar**