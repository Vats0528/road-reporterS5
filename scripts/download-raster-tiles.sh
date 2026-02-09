#!/bin/bash

# =============================================================================
# Script simplifié - Télécharge les tuiles raster d'Antananarivo
# =============================================================================

set -e

echo "🗺️  Configuration des tuiles offline pour Antananarivo..."

# Créer les dossiers
mkdir -p tiles/antananarivo

# Coordonnées d'Antananarivo
# Centre: -18.8792, 47.5079
# Bbox: 47.35, -19.05, 47.65, -18.75

# Niveaux de zoom à télécharger (0-16)
MIN_ZOOM=10
MAX_ZOOM=16

echo "📥 Téléchargement des tuiles OpenStreetMap (zoom $MIN_ZOOM-$MAX_ZOOM)..."
echo "⚠️  Cela peut prendre plusieurs minutes..."

# Utiliser un script Python pour télécharger les tuiles
python3 << 'EOF'
import os
import math
import urllib.request
import time
import sys

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

# Bbox d'Antananarivo
min_lat, max_lat = -19.05, -18.75
min_lon, max_lon = 47.35, 47.65

# Dossier de sortie
output_dir = "tiles/antananarivo"

# User agent pour respecter les conditions d'utilisation OSM
headers = {
    'User-Agent': 'RoadReporter/1.0 (offline map cache)'
}

total_tiles = 0
downloaded = 0

# Calculer le nombre total de tuiles
for zoom in range(10, 17):
    x_min, y_max = deg2num(min_lat, min_lon, zoom)
    x_max, y_min = deg2num(max_lat, max_lon, zoom)
    total_tiles += (x_max - x_min + 1) * (y_max - y_min + 1)

print(f"📊 Total de tuiles à télécharger: {total_tiles}")

for zoom in range(10, 17):
    x_min, y_max = deg2num(min_lat, min_lon, zoom)
    x_max, y_min = deg2num(max_lat, max_lon, zoom)
    
    zoom_dir = os.path.join(output_dir, str(zoom))
    os.makedirs(zoom_dir, exist_ok=True)
    
    for x in range(x_min, x_max + 1):
        x_dir = os.path.join(zoom_dir, str(x))
        os.makedirs(x_dir, exist_ok=True)
        
        for y in range(y_min, y_max + 1):
            tile_path = os.path.join(x_dir, f"{y}.png")
            
            if os.path.exists(tile_path):
                downloaded += 1
                continue
            
            # URL du serveur de tuiles OSM
            url = f"https://tile.openstreetmap.org/{zoom}/{x}/{y}.png"
            
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=10) as response:
                    with open(tile_path, 'wb') as f:
                        f.write(response.read())
                downloaded += 1
                
                # Afficher la progression
                progress = (downloaded / total_tiles) * 100
                sys.stdout.write(f"\r⏳ Progression: {downloaded}/{total_tiles} ({progress:.1f}%)")
                sys.stdout.flush()
                
                # Pause pour respecter les limites de l'API OSM
                time.sleep(0.1)
                
            except Exception as e:
                print(f"\n⚠️  Erreur pour {url}: {e}")

print(f"\n✅ Téléchargement terminé! {downloaded} tuiles téléchargées.")
EOF

echo ""
echo "📁 Structure des tuiles créée dans ./tiles/antananarivo/"
echo ""
echo "🚀 Démarrage du serveur de tuiles local..."

# Créer une configuration simple pour servir les tuiles
cat > tiles/config.json << 'CONFIGEOF'
{
  "options": {
    "paths": {
      "root": "/data",
      "fonts": "/data/fonts",
      "sprites": "/data/sprites",
      "styles": "/data/styles"
    }
  },
  "data": {
    "antananarivo": {
      "mbtiles": "antananarivo.mbtiles"
    }
  }
}
CONFIGEOF

echo "✅ Configuration terminée!"
