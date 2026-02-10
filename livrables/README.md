# Road Reporter - Application de signalement des dégradations routières

## 📋 Description du projet

Road Reporter est une application web permettant aux citoyens de signaler les dégradations routières (nids-de-poule, fissures, etc.) à Antananarivo, Madagascar. Les gestionnaires peuvent suivre, assigner des entreprises et gérer les réparations.

### Fonctionnalités principales

- **Signalement** : Création de signalements avec photos, localisation GPS
- **Carte interactive** : Visualisation des signalements sur une carte
- **Gestion des travaux** : Attribution aux entreprises, suivi des statuts
- **Calcul automatique du budget** : `prix_m² × niveau × surface`
- **Statistiques** : Délais de traitement, budgets, volumes

---

## 🚀 Lancement rapide avec Docker

### Prérequis

- Docker Desktop (Windows/Mac) ou Docker Engine (Linux)
- Docker Compose

### Étapes

```bash
# 1. Se placer dans le dossier du projet
cd road-reporterS5

# 2. Lancer tous les services
docker compose up -d

# 3. Vérifier que les services sont lancés
docker compose ps
```

### Services disponibles après lancement

| Service | URL | Description |
|---------|-----|-------------|
| **API Backend** | http://localhost:3001 | API REST Node.js |
| **PostgreSQL** | localhost:5433 | Base de données |
| **Serveur de tuiles** | http://localhost:8080 | Tuiles cartographiques |

### Vérification

```bash
# Tester l'API
curl http://localhost:3001/health

# Réponse attendue:
# {"status":"ok","timestamp":"..."}
```

---

## 📁 Structure du projet

```
road-reporterS5/
├── backend/
│   ├── server.js           # API Express.js (1500+ lignes)
│   ├── Dockerfile          # Image Docker du backend
│   └── package.json        # Dépendances Node.js
├── src/
│   ├── App.jsx             # Application React principale
│   ├── components/         # Composants React
│   ├── pages/              # Pages (HomePage, ManagerPanel, etc.)
│   ├── services/           # Services (API, auth, sync)
│   └── context/            # Contexte React (AuthContext)
├── database/
│   └── init.sql            # Script d'initialisation PostgreSQL
├── docker-compose.yml      # Configuration Docker
├── package.json            # Dépendances frontend
└── livrables/
    ├── README.md           # Ce fichier
    └── Road_Reporter_API.postman_collection.json
```

---

## 🔌 Test de l'API avec Postman

### Import de la collection

1. Ouvrir Postman
2. Cliquer sur **Import**
3. Sélectionner le fichier `Road_Reporter_API.postman_collection.json`
4. La collection "Road Reporter API" apparaît dans la sidebar

### Configuration

La variable `{{baseUrl}}` est déjà configurée sur `http://localhost:3001`

### Endpoints principaux à tester

#### 1. Health Check
```
GET http://localhost:3001/health
```

#### 2. Liste des signalements
```
GET http://localhost:3001/api/reports
```

#### 3. Créer un signalement
```
POST http://localhost:3001/api/reports
Content-Type: application/json

{
    "type": "nid-de-poule",
    "description": "Grand trou sur la route principale",
    "latitude": -18.8792,
    "longitude": 47.5079,
    "quartier": "analakely",
    "surface": 25,
    "niveau": 5
}
```

#### 4. Calculer un budget
```
GET http://localhost:3001/api/calculate-budget?niveau=5&surface=100
```
Réponse : Budget = 50000 × 5 × 100 = **25,000,000 MGA**

#### 5. Statistiques des délais
```
GET http://localhost:3001/api/stats/delays
```

---

## 🗄️ Base de données

### Accès au terminal PostgreSQL

```bash
docker exec -it road-reporter-db psql -U road_user -d road_reporter
```

### Tables principales

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs (id, email, role, password_hash) |
| `road_reports` | Signalements (type, localisation, statut, budget) |
| `entreprises` | Entreprises de réparation |
| `settings` | Paramètres (prix_m2) |
| `sync_log` | Historique de synchronisation |

### Requêtes utiles

```sql
-- Voir les signalements
SELECT id, type, status, niveau, budget, surface FROM road_reports;

-- Statistiques par statut
SELECT status, COUNT(*) FROM road_reports GROUP BY status;

-- Prix par m²
SELECT * FROM settings WHERE id = 'prix_m2';
```

---

## 🎨 Frontend React

### Lancement en développement

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Le frontend sera disponible sur http://localhost:5173

### Pages principales

| Page | Route | Description |
|------|-------|-------------|
| Accueil | `/` | Carte publique des signalements |
| Connexion | `/login` | Authentification |
| Dashboard | `/dashboard` | Tableau de bord utilisateur |
| Manager | `/manager` | Panel d'administration |

---

## 🔧 Configuration

### Variables d'environnement (backend/.env)

```env
PGHOST=localhost
PGPORT=5433
PGDATABASE=road_reporter
PGUSER=road_user
PGPASSWORD=road_password
PORT=3001
```

### Docker Compose (ports)

| Service | Port externe | Port interne |
|---------|--------------|--------------|
| PostgreSQL | 5433 | 5432 |
| Backend | 3001 | 3001 |
| Tile Server | 8080 | 80 |

---

## 📊 Fonctionnalités Manager

### Calcul automatique du budget

```
Budget = Prix/m² × Niveau × Surface
```

- **Prix/m²** : Configurable dans les paramètres (défaut: 50,000 MGA)
- **Niveau** : Gravité de 1 à 10
- **Surface** : En m²

### Niveaux de gravité

| Niveau | Catégorie |
|--------|-----------|
| 1-3 | Léger |
| 4-6 | Modéré |
| 7-8 | Sévère |
| 9-10 | Critique |

### Workflow des statuts

```
nouveau → en-cours → termine
```

Les dates sont automatiquement enregistrées :
- `assigned_at` : Quand une entreprise est assignée
- `started_at` : Quand le statut passe à "en-cours"
- `completed_at` : Quand le statut passe à "termine"

---

## 🛑 Arrêt des services

```bash
# Arrêter les conteneurs
docker compose down

# Arrêter et supprimer les données
docker compose down -v
```

---

## 📝 Notes pour l'examinateur

1. **Premier lancement** : La base de données est initialisée automatiquement avec le script `database/init.sql`

2. **Collection Postman** : Tous les endpoints sont documentés et prêts à tester

3. **Données de test** : Utilisez le endpoint POST `/api/reports` pour créer des signalements de test

4. **Firebase** (optionnel) : La synchronisation Firebase est désactivée par défaut si le fichier `firebase-admin-key.json` n'est pas présent

---

## 👥 Auteur

Projet Road Reporter - Antananarivo, Madagascar
