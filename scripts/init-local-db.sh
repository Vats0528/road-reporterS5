#!/bin/bash

# =============================================================================
# Script d'initialisation de PostgreSQL local pour Road Reporter
# Utilise l'utilisateur système vats
# =============================================================================

echo "🗄️  Initialisation de PostgreSQL local pour Road Reporter"
echo ""

# Vérifier si PostgreSQL est installé
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL n'est pas installé"
    echo "   Installez-le avec: sudo apt install postgresql postgresql-contrib"
    exit 1
fi

# Vérifier si le service PostgreSQL est actif
if ! systemctl is-active --quiet postgresql; then
    echo "⚠️  PostgreSQL n'est pas démarré. Démarrage..."
    sudo systemctl start postgresql
fi

echo "✓ PostgreSQL est actif"
echo ""

# Créer la base de données si elle n'existe pas
echo "📦 Création de la base de données road_reporter..."

sudo -u postgres psql -c "CREATE DATABASE road_reporter;" 2>/dev/null || echo "   (base déjà existante)"

# Donner les droits à l'utilisateur vats
echo "👤 Attribution des droits à l'utilisateur vats..."

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE road_reporter TO vats;" 2>/dev/null
sudo -u postgres psql -d road_reporter -c "GRANT ALL ON SCHEMA public TO vats;" 2>/dev/null

echo ""
echo "📝 Création des tables..."

# Exécuter le script d'initialisation
psql -U vats -d road_reporter -f database/init.sql

echo ""
echo "✅ Initialisation terminée !"
echo ""
echo "Pour vérifier la connexion:"
echo "  psql -U vats -d road_reporter"
echo ""
echo "Pour démarrer l'API backend:"
echo "  cd backend && npm install && npm start"
