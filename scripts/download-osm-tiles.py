#!/usr/bin/env python3
"""
Script de téléchargement des tuiles OSM pour Antananarivo
Niveaux de zoom: 5-19 pour utilisation hors ligne
Note: OSM ne supporte que jusqu'au zoom 19, au-delà les tuiles n'existent pas
"""

import os
import math
import time
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
TILES_DIR = Path("./tiles/osm")
TILE_SERVER = "https://tile.openstreetmap.org"
USER_AGENT = "RoadReporter/1.0 (Educational Project - offline-maps@example.com)"

# Coordonnées d'Antananarivo (zone étendue)
LAT_MIN = -19.05
LAT_MAX = -18.75
LON_MIN = 47.35
LON_MAX = 47.65

# Niveaux de zoom (OSM supporte max 19, mais on peut essayer jusqu'à 19)
ZOOM_MIN = 5
ZOOM_MAX = 19  # OSM max est 19, les zooms 20+ n'existent généralement pas

# Configuration du téléchargement
DELAY_BETWEEN_REQUESTS = 0.25  # secondes
MAX_WORKERS = 2  # threads parallèles (respecter les limites OSM)
TIMEOUT = 30
MAX_RETRIES = 3


def lat_lon_to_tile(lat: float, lon: float, zoom: int) -> tuple:
    """Convertit latitude/longitude en coordonnées de tuile"""
    n = 2 ** zoom
    x_tile = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y_tile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x_tile, y_tile


def get_tile_range(zoom: int) -> dict:
    """Calcule la plage de tuiles pour un niveau de zoom"""
    x_min, y_min = lat_lon_to_tile(LAT_MAX, LON_MIN, zoom)
    x_max, y_max = lat_lon_to_tile(LAT_MIN, LON_MAX, zoom)
    return {
        'zoom': zoom,
        'x_min': x_min,
        'x_max': x_max,
        'y_min': y_min,
        'y_max': y_max,
        'count': (x_max - x_min + 1) * (y_max - y_min + 1)
    }


def download_tile(zoom: int, x: int, y: int) -> dict:
    """Télécharge une tuile"""
    tile_path = TILES_DIR / str(zoom) / str(x) / f"{y}.png"
    result = {
        'zoom': zoom,
        'x': x,
        'y': y,
        'path': str(tile_path),
        'status': 'unknown'
    }
    
    # Vérifier si existe déjà
    if tile_path.exists() and tile_path.stat().st_size > 0:
        result['status'] = 'skipped'
        return result
    
    # Créer le répertoire
    tile_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Télécharger
    url = f"{TILE_SERVER}/{zoom}/{x}/{y}.png"
    
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(
                url,
                headers={'User-Agent': USER_AGENT},
                timeout=TIMEOUT
            )
            
            if response.status_code == 200:
                with open(tile_path, 'wb') as f:
                    f.write(response.content)
                result['status'] = 'downloaded'
                return result
            elif response.status_code == 404:
                result['status'] = 'not_found'
                return result
            else:
                time.sleep(1)
                
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                result['status'] = 'error'
                result['error'] = str(e)
    
    return result


def main():
    print("╔════════════════════════════════════════════════════════════╗")
    print("║     Téléchargement des tuiles OSM pour Antananarivo        ║")
    print("║                 Niveaux de zoom: 8-19                      ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print()
    
    # Calculer les tuiles nécessaires
    all_tiles = []
    total_tiles = 0
    
    print("📊 Calcul des tuiles nécessaires...")
    for zoom in range(ZOOM_MIN, ZOOM_MAX + 1):
        tile_range = get_tile_range(zoom)
        count = tile_range['count']
        total_tiles += count
        
        print(f"  Zoom {zoom:2d}: {count:6d} tuiles "
              f"(x: {tile_range['x_min']}-{tile_range['x_max']}, "
              f"y: {tile_range['y_min']}-{tile_range['y_max']})")
        
        # Ajouter les tuiles à la liste
        for x in range(tile_range['x_min'], tile_range['x_max'] + 1):
            for y in range(tile_range['y_min'], tile_range['y_max'] + 1):
                all_tiles.append((zoom, x, y))
    
    print()
    print(f"📦 Total: {total_tiles} tuiles")
    estimated_time = total_tiles * DELAY_BETWEEN_REQUESTS / 60
    print(f"⏱️  Temps estimé: ~{estimated_time:.0f} minutes")
    print()
    
    # Confirmation
    response = input("Voulez-vous continuer? (o/n) ")
    if response.lower() not in ['o', 'oui', 'y', 'yes']:
        print("❌ Annulé.")
        return
    
    print()
    print("🚀 Démarrage du téléchargement...")
    print()
    
    # Statistiques
    stats = {
        'downloaded': 0,
        'skipped': 0,
        'errors': 0,
        'not_found': 0
    }
    
    # Créer le répertoire de base
    TILES_DIR.mkdir(parents=True, exist_ok=True)
    
    # Téléchargement séquentiel pour respecter les limites d'OSM
    start_time = time.time()
    
    for i, (zoom, x, y) in enumerate(all_tiles, 1):
        result = download_tile(zoom, x, y)
        
        if result['status'] == 'downloaded':
            stats['downloaded'] += 1
            time.sleep(DELAY_BETWEEN_REQUESTS)
        elif result['status'] == 'skipped':
            stats['skipped'] += 1
        elif result['status'] == 'not_found':
            stats['not_found'] += 1
        else:
            stats['errors'] += 1
        
        # Progression
        percent = i * 100 // total_tiles
        elapsed = time.time() - start_time
        rate = i / elapsed if elapsed > 0 else 0
        eta = (total_tiles - i) / rate if rate > 0 else 0
        
        print(f"\r  [{percent:3d}%] {i}/{total_tiles} - "
              f"↓{stats['downloaded']} ○{stats['skipped']} ✗{stats['errors']} - "
              f"ETA: {eta/60:.0f}min", end='', flush=True)
    
    print()
    print()
    
    # Résumé
    elapsed_total = time.time() - start_time
    print("╔════════════════════════════════════════════════════════════╗")
    print("║                  Téléchargement terminé                    ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"  ✅ Téléchargées: {stats['downloaded']}")
    print(f"  ⏭️  Existantes: {stats['skipped']}")
    print(f"  ❌ Erreurs: {stats['errors']}")
    print(f"  ⚠️  Non trouvées: {stats['not_found']}")
    print()
    print(f"  ⏱️  Durée: {elapsed_total/60:.1f} minutes")
    
    # Taille totale
    total_size = sum(f.stat().st_size for f in TILES_DIR.rglob('*.png'))
    print(f"  💾 Taille: {total_size / (1024*1024):.1f} MB")
    print()
    print(f"📁 Tuiles sauvegardées dans: {TILES_DIR.absolute()}")


if __name__ == "__main__":
    main()
