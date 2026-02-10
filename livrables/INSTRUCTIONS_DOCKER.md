# Road Reporter - Instructions de déploiement Docker

## Prérequis

- Docker (version 20+)
- Docker Compose (version 2+)
- Node.js 18+ (pour le développement)

## Structure du projet

```
road-reporterS5/
├── backend/                 # API Node.js/Express
│   ├── server.js           # Serveur principal
│   ├── Dockerfile          # Image Docker backend
│   ├── package.json        # Dépendances Node.js
│   └── firebase-admin-key.json  # Credentials Firebase (à créer)
├── src/                    # Frontend React/Vite
├── database/               # Scripts SQL
│   └── init.sql           # Initialisation de la base
├── tiles/                  # Tuiles cartographiques
├── docker-compose.yml      # Configuration Docker
└── livrables/             # Documentation
```

## Configuration initiale

### 1. Cloner le projet

```bash
git clone https://github.com/Vats0528/road-reporterS5.git
cd road-reporterS5
```

### 2. Configurer Firebase Admin (optionnel)

Si vous souhaitez utiliser Firebase Storage pour les images :

1. Allez sur https://console.firebase.google.com/
2. Sélectionnez votre projet → Paramètres → Comptes de service
3. Générez une nouvelle clé privée
4. Sauvegardez le fichier sous `backend/firebase-admin-key.json`

### 3. Installer les dépendances frontend

```bash
npm install
```

## Lancement avec Docker

### Démarrer tous les services

```bash
docker compose up -d
```

### Démarrer uniquement la base de données

```bash
docker compose up -d road-reporter-db
```

### Vérifier l'état des services

```bash
docker compose ps
```

### Voir les logs

```bash
# Tous les services
docker compose logs -f

# Un service spécifique
docker compose logs -f road-reporter-db
docker compose logs -f backend
```

### Arrêter les services

```bash
docker compose down
```

### Arrêter et supprimer les données

```bash
docker compose down -v
```

## Architecture des conteneurs

| Conteneur | Port | Description |
|-----------|------|-------------|
| **road-reporter-db** | 5433 | PostgreSQL 15 |
| **road-reporter-tiles** | 8080 | Nginx (tuiles cartographiques) |
| **road-reporter-api** | 3001 | Backend Node.js |

## Accès aux services

### API Backend
- URL: http://localhost:3001
- Health check: http://localhost:3001/health

### Base de données PostgreSQL

```bash
# Via Docker
docker exec -it road-reporter-db psql -U road_user -d road_reporter

# Via psql local
psql -h localhost -p 5433 -U road_user -d road_reporter
# Mot de passe: road_password
```

### Serveur de tuiles
- URL: http://localhost:8080/tiles/{z}/{x}/{y}.png

## Développement local

### Backend seul (avec PostgreSQL Docker)

```bash
# Démarrer PostgreSQL
docker compose up -d postgres

# Lancer le backend en mode développement
cd backend
npm install
npm run dev
```

### Frontend

```bash
# Dans le dossier racine
npm install
npm run dev
```

Le frontend sera disponible sur http://localhost:5173

## Variables d'environnement

### Backend (.env)

```env
PGHOST=localhost
PGPORT=5433
PGDATABASE=road_reporter
PGUSER=road_user
PGPASSWORD=road_password
PORT=3001
NODE_ENV=development
```

### Docker (définies dans docker-compose.yml)

```yaml
PGHOST: postgres        # Nom du service Docker
PGPORT: 5432           # Port interne Docker
PGDATABASE: road_reporter
PGUSER: road_user
PGPASSWORD: road_password
```

## Résolution de problèmes

### Le port 5433 est déjà utilisé

```bash
# Trouver le processus
sudo lsof -i :5433

# Modifier le port dans docker-compose.yml
```

### Erreur de connexion PostgreSQL

```bash
# Vérifier que le conteneur est en cours d'exécution
docker ps | grep road-reporter-db

# Vérifier les logs
docker logs road-reporter-db
```

### Reconstruire l'image backend

```bash
docker compose build backend
docker compose up -d backend
```

## Sauvegarde et restauration

### Exporter la base de données

```bash
docker exec road-reporter-db pg_dump -U road_user road_reporter > backup.sql
```

### Importer une sauvegarde

```bash
docker exec -i road-reporter-db psql -U road_user road_reporter < backup.sql
```

## API Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | /health | État du serveur |
| GET | /api/reports | Liste des signalements |
| POST | /api/reports | Créer un signalement |
| PUT | /api/reports/:id | Modifier un signalement |
| DELETE | /api/reports/:id | Supprimer un signalement |
| GET | /api/users | Liste des utilisateurs |
| POST | /api/auth/login | Connexion |
| GET | /api/settings | Paramètres |
| GET | /api/stats/delays | Statistiques des délais |

Consultez la collection Postman pour plus de détails.
