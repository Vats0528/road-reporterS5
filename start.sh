#!/bin/bash

# =============================================================================
# Script de démarrage rapide - Road Reporter Offline
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           🚀 Road Reporter - Démarrage Rapide                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Vérifier Docker
echo -e "${YELLOW}📋 Vérification des prérequis...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker OK${NC}"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js OK${NC}"

# Vérifier Python (pour le téléchargement des tuiles)
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Python3 non trouvé (nécessaire pour télécharger les tuiles)${NC}"
else
    echo -e "${GREEN}✓ Python3 OK${NC}"
fi

echo ""

# Menu d'options
echo -e "${BLUE}Que voulez-vous faire ?${NC}"
echo ""
echo "  1) Démarrer tous les services Docker (API + DB + Tuiles)"
echo "  2) Télécharger les tuiles OSM pour le mode hors ligne"
echo "  3) Démarrer l'application frontend (npm run dev)"
echo "  4) Tout faire (1 + 3)"
echo "  5) Arrêter tous les services Docker"
echo "  6) Voir les logs Docker"
echo "  0) Quitter"
echo ""

read -p "Votre choix: " choice

case $choice in
    1)
        echo -e "\n${YELLOW}🐳 Démarrage des services Docker...${NC}"
        docker-compose up -d --build
        echo ""
        echo -e "${GREEN}✅ Services démarrés !${NC}"
        echo ""
        echo "  📊 API Backend:     http://localhost:3001"
        echo "  🗺️  Serveur Tuiles: http://localhost:8080"
        echo "  🗄️  PostgreSQL:     localhost:5432"
        echo ""
        docker-compose ps
        ;;
    
    2)
        echo -e "\n${YELLOW}🗺️  Téléchargement des tuiles OSM...${NC}"
        echo -e "${YELLOW}⚠️  Cela peut prendre environ 60 minutes${NC}"
        echo ""
        
        # Vérifier si requests est installé
        if ! python3 -c "import requests" 2>/dev/null; then
            echo -e "${YELLOW}Installation de requests...${NC}"
            pip3 install requests
        fi
        
        python3 scripts/download-osm-tiles.py
        ;;
    
    3)
        echo -e "\n${YELLOW}🚀 Démarrage du frontend...${NC}"
        
        # Vérifier node_modules
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}Installation des dépendances npm...${NC}"
            npm install
        fi
        
        npm run dev
        ;;
    
    4)
        echo -e "\n${YELLOW}🐳 Démarrage des services Docker...${NC}"
        docker-compose up -d --build
        
        echo -e "\n${YELLOW}⏳ Attente du démarrage des services...${NC}"
        sleep 5
        
        # Vérifier l'API
        for i in {1..10}; do
            if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
                echo -e "${GREEN}✓ API prête${NC}"
                break
            fi
            echo "  Attente de l'API... ($i/10)"
            sleep 2
        done
        
        echo ""
        
        # Vérifier node_modules
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}Installation des dépendances npm...${NC}"
            npm install
        fi
        
        echo -e "\n${GREEN}✅ Tout est prêt !${NC}"
        echo ""
        echo "  📊 API Backend:     http://localhost:3001"
        echo "  🗺️  Serveur Tuiles: http://localhost:8080"
        echo "  🗄️  PostgreSQL:     localhost:5432"
        echo ""
        echo -e "${YELLOW}🚀 Démarrage du frontend...${NC}"
        npm run dev
        ;;
    
    5)
        echo -e "\n${YELLOW}🛑 Arrêt des services Docker...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Services arrêtés${NC}"
        ;;
    
    6)
        echo -e "\n${YELLOW}📜 Logs Docker (Ctrl+C pour quitter)...${NC}"
        docker-compose logs -f
        ;;
    
    0)
        echo -e "${BLUE}Au revoir !${NC}"
        exit 0
        ;;
    
    *)
        echo -e "${RED}Option invalide${NC}"
        exit 1
        ;;
esac
