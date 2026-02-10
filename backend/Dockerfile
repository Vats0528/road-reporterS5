FROM node:18-alpine

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production uniquement
RUN npm ci --only=production

# Copier le code source (sauf ce qui est dans .dockerignore)
COPY server.js ./

# Créer le dossier uploads
RUN mkdir -p uploads

# Exposer le port
EXPOSE 3001

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3001/health || exit 1

# Démarrer le serveur
CMD ["node", "server.js"]
