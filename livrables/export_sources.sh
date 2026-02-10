#!/bin/bash

# Script pour créer une archive des codes sources sans les librairies
# Usage: ./export_sources.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$SCRIPT_DIR"
ARCHIVE_NAME="road-reporter-sources-$(date +%Y%m%d).tar.gz"

echo "📦 Export des codes sources Road Reporter"
echo "==========================================="
echo ""

cd "$PROJECT_DIR"

# Créer l'archive en excluant les librairies et fichiers non nécessaires
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='tiles' \
    --exclude='backend/uploads/*' \
    --exclude='backend/firebase-admin-key.json' \
    --exclude='*.log' \
    --exclude='.cache' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.env' \
    --exclude='*.tar.gz' \
    -czvf "$OUTPUT_DIR/$ARCHIVE_NAME" \
    backend/server.js \
    backend/package.json \
    backend/Dockerfile \
    backend/.dockerignore \
    src/ \
    database/ \
    docker-compose.yml \
    package.json \
    vite.config.js \
    tailwind.config.js \
    postcss.config.js \
    index.html \
    livrables/INSTRUCTIONS_DOCKER.md \
    livrables/Road_Reporter_API.postman_collection.json

echo ""
echo "✅ Archive créée: $OUTPUT_DIR/$ARCHIVE_NAME"
echo ""
echo "Contenu de l'archive:"
tar -tzvf "$OUTPUT_DIR/$ARCHIVE_NAME" | head -30
echo "..."
