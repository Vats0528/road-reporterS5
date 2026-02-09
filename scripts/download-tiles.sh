#!/bin/bash

# =============================================================================
# Script de téléchargement des données cartographiques d'Antananarivo
# =============================================================================

set -e

echo "🗺️  Téléchargement des données cartographiques d'Antananarivo..."

# Créer le dossier tiles s'il n'existe pas
mkdir -p tiles

# Option 1: Télécharger les tuiles MBTiles pré-générées (recommandé)
echo "📥 Téléchargement des tuiles MBTiles pour Madagascar..."

# Télécharger depuis OpenMapTiles (format MBTiles)
# Note: Vous pouvez aussi utiliser Geofabrik pour les données OSM brutes

# Fichier MBTiles pour Madagascar (inclut Antananarivo)
MBTILES_URL="https://github.com/openmaptiles/openmaptiles/releases/download/v3.14/madagascar.mbtiles"

# Alternative: Extraire uniquement Antananarivo depuis Geofabrik
GEOFABRIK_URL="https://download.geofabrik.de/africa/madagascar-latest.osm.pbf"

# Vérifier si le fichier existe déjà
if [ -f "tiles/antananarivo.mbtiles" ]; then
    echo "✅ Le fichier antananarivo.mbtiles existe déjà"
else
    echo "📥 Téléchargement des données OSM de Madagascar..."
    
    # Télécharger le fichier PBF de Madagascar
    if [ ! -f "tiles/madagascar-latest.osm.pbf" ]; then
        wget -O tiles/madagascar-latest.osm.pbf "$GEOFABRIK_URL"
    fi
    
    echo "✂️  Extraction de la zone d'Antananarivo..."
    
    # Installer osmium si nécessaire
    if ! command -v osmium &> /dev/null; then
        echo "⚠️  osmium-tool n'est pas installé. Installation..."
        sudo apt-get update && sudo apt-get install -y osmium-tool
    fi
    
    # Extraire la zone d'Antananarivo (bbox approximatif)
    # Coordonnées: min_lon, min_lat, max_lon, max_lat
    # Antananarivo étendu: 47.35, -19.05, 47.65, -18.75
    osmium extract \
        --bbox=47.35,-19.05,47.65,-18.75 \
        --strategy=complete_ways \
        tiles/madagascar-latest.osm.pbf \
        -o tiles/antananarivo.osm.pbf
    
    echo "🔄 Conversion en MBTiles..."
    
    # Utiliser tilemaker pour convertir en MBTiles
    if ! command -v tilemaker &> /dev/null; then
        echo "⚠️  tilemaker n'est pas installé. Utilisation de Docker..."
        docker run -v $(pwd)/tiles:/data ghcr.io/systemed/tilemaker:master \
            --input /data/antananarivo.osm.pbf \
            --output /data/antananarivo.mbtiles
    else
        tilemaker \
            --input tiles/antananarivo.osm.pbf \
            --output tiles/antananarivo.mbtiles
    fi
fi

echo "✅ Téléchargement terminé!"
echo ""
echo "📁 Fichiers créés dans ./tiles/"
ls -lh tiles/
echo ""
echo "🚀 Pour démarrer le serveur de tuiles:"
echo "   docker-compose up -d"
echo ""
echo "🌐 Les tuiles seront disponibles sur:"
echo "   http://localhost:8080"
