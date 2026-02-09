#!/usr/bin/env python3
"""
Script de téléchargement des tuiles OpenStreetMap pour Antananarivo
Usage: python3 download_tiles.py
"""

import os
import math
import urllib.request
import time
import sys
import argparse

def deg2num(lat_deg, lon_deg, zoom):
    """Convertit les coordonnées lat/lon en numéros de tuile"""
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

def download_tiles(min_lat, max_lat, min_lon, max_lon, min_zoom, max_zoom, output_dir):
    """Télécharge les tuiles pour une zone donnée"""
    
    # Créer le dossier de sortie
    os.makedirs(output_dir, exist_ok=True)
    
    # User agent pour respecter les conditions d'utilisation OSM
    headers = {
        'User-Agent': 'RoadReporter/1.0 (https://github.com/road-reporter - offline map cache for Antananarivo)'
    }
    
    # Calculer le nombre total de tuiles
    total_tiles = 0
    for zoom in range(min_zoom, max_zoom + 1):
        x_min, y_max = deg2num(min_lat, min_lon, zoom)
        x_max, y_min = deg2num(max_lat, max_lon, zoom)
        total_tiles += (x_max - x_min + 1) * (y_max - y_min + 1)
    
    print(f"📊 Total de tuiles à télécharger: {total_tiles}")
    print(f"📍 Zone: {min_lat},{min_lon} -> {max_lat},{max_lon}")
    print(f"🔍 Zoom: {min_zoom} - {max_zoom}")
    print()
    
    downloaded = 0
    skipped = 0
    errors = 0
    
    for zoom in range(min_zoom, max_zoom + 1):
        x_min, y_max = deg2num(min_lat, min_lon, zoom)
        x_max, y_min = deg2num(max_lat, max_lon, zoom)
        
        print(f"\n📂 Zoom {zoom}: {(x_max - x_min + 1) * (y_max - y_min + 1)} tuiles")
        
        for x in range(x_min, x_max + 1):
            x_dir = os.path.join(output_dir, str(zoom), str(x))
            os.makedirs(x_dir, exist_ok=True)
            
            for y in range(y_min, y_max + 1):
                tile_path = os.path.join(x_dir, f"{y}.png")
                
                # Vérifier si le fichier existe déjà
                if os.path.exists(tile_path):
                    skipped += 1
                    continue
                
                # URL du serveur de tuiles OSM
                # Utiliser plusieurs sous-domaines pour répartir la charge
                subdomain = ['a', 'b', 'c'][downloaded % 3]
                url = f"https://{subdomain}.tile.openstreetmap.org/{zoom}/{x}/{y}.png"
                
                try:
                    req = urllib.request.Request(url, headers=headers)
                    with urllib.request.urlopen(req, timeout=15) as response:
                        with open(tile_path, 'wb') as f:
                            f.write(response.read())
                    downloaded += 1
                    
                    # Afficher la progression
                    progress = ((downloaded + skipped) / total_tiles) * 100
                    sys.stdout.write(f"\r⏳ Progression: {downloaded + skipped}/{total_tiles} ({progress:.1f}%) - {downloaded} téléchargées, {skipped} existantes")
                    sys.stdout.flush()
                    
                    # Pause pour respecter les limites de l'API OSM (max 2 req/sec recommandé)
                    time.sleep(0.5)
                    
                except Exception as e:
                    errors += 1
                    if errors < 10:
                        print(f"\n⚠️  Erreur pour {url}: {e}")
                    elif errors == 10:
                        print("\n⚠️  Trop d'erreurs, arrêt des messages...")
    
    print(f"\n\n✅ Téléchargement terminé!")
    print(f"   📥 Téléchargées: {downloaded}")
    print(f"   ⏭️  Existantes (ignorées): {skipped}")
    print(f"   ❌ Erreurs: {errors}")
    print(f"   📁 Dossier: {output_dir}")

def main():
    parser = argparse.ArgumentParser(description='Télécharge les tuiles OSM pour Antananarivo')
    parser.add_argument('--min-zoom', type=int, default=10, help='Zoom minimum (défaut: 10)')
    parser.add_argument('--max-zoom', type=int, default=16, help='Zoom maximum (défaut: 16)')
    parser.add_argument('--output', type=str, default='tiles/antananarivo', help='Dossier de sortie')
    parser.add_argument('--extended', action='store_true', help='Zone étendue (plus de tuiles)')
    
    args = parser.parse_args()
    
    # Coordonnées d'Antananarivo
    if args.extended:
        # Zone étendue (agglomération complète)
        min_lat, max_lat = -19.10, -18.70
        min_lon, max_lon = 47.30, 47.70
    else:
        # Zone centre-ville
        min_lat, max_lat = -18.95, -18.80
        min_lon, max_lon = 47.48, 47.58
    
    print("🗺️  Téléchargement des tuiles OpenStreetMap pour Antananarivo")
    print("=" * 60)
    
    download_tiles(
        min_lat=min_lat,
        max_lat=max_lat,
        min_lon=min_lon,
        max_lon=max_lon,
        min_zoom=args.min_zoom,
        max_zoom=args.max_zoom,
        output_dir=args.output
    )
    
    print("\n🚀 Pour démarrer le serveur de tuiles:")
    print("   docker-compose up -d")
    print("\n🌐 Les tuiles seront disponibles sur:")
    print("   http://localhost:8080/tiles/antananarivo/{z}/{x}/{y}.png")

if __name__ == '__main__':
    main()
