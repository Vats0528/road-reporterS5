require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Firebase Admin SDK pour l'upload vers Firebase Storage (optionnel)
let admin = null;
let bucket = null;
let firebaseAdminEnabled = false;

try {
  admin = require('firebase-admin');
  const serviceAccountPath = path.join(__dirname, 'firebase-admin-key.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require('./firebase-admin-key.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'routes-antananarivo.appspot.com'
    });
    bucket = admin.storage().bucket();
    firebaseAdminEnabled = true;
    console.log('[OK] Firebase Admin SDK initialisé');
    console.log('[OK] Storage Bucket:', bucket.name);
  } else {
    console.log('[WARN] firebase-admin-key.json non trouvé - Firebase Storage désactivé');
  }
} catch (err) {
  console.log('[WARN] Firebase Admin non disponible:', err.message);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Créer le dossier uploads s'il n'existe pas
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configuration de multer pour les uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const reportId = req.params.reportId || 'temp';
    const dir = path.join(UPLOADS_DIR, reportId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'), false);
    }
  }
});

// Middleware CORS - autoriser les requêtes cross-origin
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Servir les fichiers uploadés statiquement
app.use('/uploads', express.static(UPLOADS_DIR));

// ============================================================================
// UTILITAIRES AUTHENTIFICATION
// ============================================================================

// Hasher un mot de passe
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
};

// Vérifier un mot de passe
const verifyPassword = (password, storedHash, storedSalt) => {
  const hash = crypto.pbkdf2Sync(password, storedSalt, 1000, 64, 'sha512').toString('hex');
  return hash === storedHash;
};

// Générer un token simple
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Connexion PostgreSQL - supporte Docker ou local
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'road_reporter',
  user: process.env.PGUSER || 'road_user',
  password: process.env.PGPASSWORD || 'road_password'
});

// Test connexion
pool.connect((err, client, release) => {
  if (err) {
    console.error('[ERROR] Erreur connexion PostgreSQL:', err.message);
  } else {
    console.log('[OK] Connecté à PostgreSQL');
    release();
  }
});

// ============================================================================
// ROUTES HEALTH
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM report_stats');
    const pendingSync = await pool.query(
      'SELECT COUNT(*) as count FROM road_reports WHERE is_synced = FALSE'
    );
    res.json({
      database: 'connected',
      stats: result.rows[0],
      pendingSync: parseInt(pendingSync.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROUTES SIGNALEMENTS
// ============================================================================

// GET tous les signalements (ou filtrés par userId ou userEmail)
app.get('/api/reports', async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    
    let result;
    if (userId || userEmail) {
      // Filtrer par user_id OU user_email (pour supporter les deux cas)
      result = await pool.query(
        `SELECT * FROM road_reports 
         WHERE user_id = $1 OR user_email = $2 
         ORDER BY created_at DESC`,
        [userId || '', userEmail || userId || '']
      );
    } else {
      // Tous les signalements
      result = await pool.query(
        'SELECT * FROM road_reports ORDER BY created_at DESC'
      );
    }
    
    res.json({ reports: result.rows, error: null });
  } catch (error) {
    res.status(500).json({ reports: [], error: error.message });
  }
});

// GET un signalement par ID
app.get('/api/reports/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM road_reports WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ report: null, error: 'Non trouvé' });
    }
    res.json({ report: result.rows[0], error: null });
  } catch (error) {
    res.status(500).json({ report: null, error: error.message });
  }
});

// POST créer un signalement
app.post('/api/reports', async (req, res) => {
  try {
    const {
      userId, userEmail, type, description, latitude, longitude,
      quartier, arrondissement, images = []
    } = req.body;

    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO road_reports 
       (id, user_id, user_email, type, description, latitude, longitude, 
        quartier, arrondissement, images, status, is_synced)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'nouveau', FALSE)
       RETURNING *`,
      [id, userId, userEmail, type, description, latitude, longitude,
       quartier, arrondissement, JSON.stringify(images)]
    );

    // Log pour sync
    await pool.query(
      `INSERT INTO sync_log (table_name, record_id, operation, direction)
       VALUES ('road_reports', $1, 'create', 'to_firebase')`,
      [id]
    );

    res.status(201).json({ report: result.rows[0], error: null });
  } catch (error) {
    res.status(500).json({ report: null, error: error.message });
  }
});

// PUT mettre à jour un signalement (surface, budget, entreprise, etc.)
app.put('/api/reports/:id', async (req, res) => {
  try {
    const { type, description, quartier, arrondissement, images, surface, budget, entreprise, status, firebase_id } = req.body;
    
    const result = await pool.query(
      `UPDATE road_reports 
       SET type = COALESCE($1, type),
           description = COALESCE($2, description),
           quartier = COALESCE($3, quartier),
           arrondissement = COALESCE($4, arrondissement),
           images = COALESCE($5, images),
           surface = COALESCE($6, surface),
           budget = COALESCE($7, budget),
           entreprise_id = COALESCE($8, entreprise_id),
           status = COALESCE($9, status),
           firebase_id = COALESCE($10, firebase_id),
           is_synced = FALSE,
           updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [type, description, quartier, arrondissement, 
       images ? JSON.stringify(images) : null, 
       surface, budget, entreprise, status, firebase_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Non trouvé' });
    }

    console.log(`[INFO] Signalement modifié: ${req.params.id}`);

    // Log pour sync
    await pool.query(
      `INSERT INTO sync_log (table_name, record_id, operation, direction)
       VALUES ('road_reports', $1, 'update', 'to_firebase')`,
      [req.params.id]
    );

    res.json({ success: true, report: result.rows[0], error: null });
  } catch (error) {
    console.error('Erreur PUT /reports/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT mettre à jour le statut
app.put('/api/reports/:id/status', async (req, res) => {
  try {
    const { status, changedBy } = req.body;
    
    // Normaliser le statut
    const statusMap = {
      'nouveau': 'nouveau',
      'nouveaux': 'nouveau',
      'en-cours': 'en-cours',
      'en_cours': 'en-cours',
      'en cours': 'en-cours',
      'termine': 'termine',
      'terminé': 'termine',
      'termines': 'termine'
    };
    
    const normalizedStatus = statusMap[status?.toLowerCase()] || status;
    const validStatuses = ['nouveau', 'en-cours', 'termine'];
    
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ success: false, error: `Statut invalide: ${status}` });
    }

    // Récupérer le statut actuel
    const current = await pool.query(
      'SELECT status, status_history FROM road_reports WHERE id = $1',
      [req.params.id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Non trouvé' });
    }

    const previousStatus = current.rows[0].status;
    // Assurer que status_history est un tableau
    let statusHistory = [];
    if (Array.isArray(current.rows[0].status_history)) {
      statusHistory = current.rows[0].status_history;
    } else if (typeof current.rows[0].status_history === 'string') {
      try {
        statusHistory = JSON.parse(current.rows[0].status_history);
      } catch (e) {
        statusHistory = [];
      }
    }
    
    // Ajouter à l'historique
    statusHistory.push({
      previousStatus,
      newStatus: normalizedStatus,
      changedAt: new Date().toISOString(),
      changedBy: changedBy || 'local'
    });

    // Calculer les timestamps
    const now = new Date();
    const isEnCours = normalizedStatus === 'en-cours';
    const isTermine = normalizedStatus === 'termine';

    const result = await pool.query(
      `UPDATE road_reports 
       SET status = $1,
           status_history = $2::jsonb,
           started_at = CASE WHEN $3 = true AND started_at IS NULL THEN $5 ELSE started_at END,
           completed_at = CASE WHEN $4 = true AND completed_at IS NULL THEN $5 ELSE completed_at END,
           is_synced = FALSE
       WHERE id = $6
       RETURNING *`,
      [normalizedStatus, JSON.stringify(statusHistory), isEnCours, isTermine, now, req.params.id]
    );

    console.log(`[INFO] Statut mis à jour: ${req.params.id}  ->  ${normalizedStatus}`);

    // Log pour sync
    await pool.query(
      `INSERT INTO sync_log (table_name, record_id, operation, direction)
       VALUES ('road_reports', $1, 'update', 'to_firebase')`,
      [req.params.id]
    );

    res.json({ success: true, report: result.rows[0], error: null });
  } catch (error) {
    console.error('Erreur PUT /reports/:id/status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE supprimer un signalement
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM road_reports WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Non trouvé' });
    }

    // Log pour sync
    await pool.query(
      `INSERT INTO sync_log (table_name, record_id, operation, direction)
       VALUES ('road_reports', $1, 'delete', 'to_firebase')`,
      [req.params.id]
    );

    res.json({ success: true, error: null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ROUTES UTILISATEURS
// ============================================================================

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, display_name, role, created_at FROM users ORDER BY created_at DESC');
    res.json({ users: result.rows, error: null });
  } catch (error) {
    res.status(500).json({ users: [], error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { id, email, displayName, role = 'user' } = req.body;
    const result = await pool.query(
      `INSERT INTO users (id, email, display_name, role, is_synced)
       VALUES ($1, $2, $3, $4, FALSE)
       ON CONFLICT (id) DO UPDATE SET 
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         role = EXCLUDED.role
       RETURNING id, email, display_name, role`,
      [id || uuidv4(), email, displayName, role]
    );
    res.status(201).json({ user: result.rows[0], error: null });
  } catch (error) {
    res.status(500).json({ user: null, error: error.message });
  }
});

// PUT mettre à jour un utilisateur
app.put('/api/users/:id', async (req, res) => {
  try {
    const { displayName, role, phone, address } = req.body;
    const result = await pool.query(
      `UPDATE users 
       SET display_name = COALESCE($1, display_name),
           role = COALESCE($2, role),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address)
       WHERE id = $5
       RETURNING id, email, display_name, role`,
      [displayName, role, phone, address, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }
    
    res.json({ success: true, user: result.rows[0], error: null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE supprimer un utilisateur
app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }
    
    console.log(`[DELETE] Utilisateur supprimé: ${req.params.id}`);
    res.json({ success: true, error: null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ROUTES AUTHENTIFICATION LOCALE (OFFLINE)
// ============================================================================

// POST inscription locale
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName, role = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Cette adresse email est déjà utilisée' });
    }

    // Hasher le mot de passe
    const { salt, hash } = hashPassword(password);
    const id = uuidv4();
    const token = generateToken();

    const result = await pool.query(
      `INSERT INTO users (id, email, display_name, role, password_hash, password_salt, auth_token, is_synced)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
       RETURNING id, email, display_name, role, created_at`,
      [id, email, displayName || email.split('@')[0], role, hash, salt, token]
    );

    const user = result.rows[0];
    console.log(`[OK] Utilisateur créé localement: ${email} (${role})`);

    res.status(201).json({
      success: true,
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      },
      token,
      error: null
    });
  } catch (error) {
    console.error('[ERROR] Erreur inscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST connexion locale
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
    }

    // Chercher l'utilisateur
    const result = await pool.query(
      'SELECT id, email, display_name, role, password_hash, password_salt FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe
    if (!user.password_hash || !user.password_salt) {
      return res.status(401).json({ 
        success: false, 
        error: 'Cet utilisateur n\'a pas de mot de passe local. Inscrivez-vous localement.' 
      });
    }

    if (!verifyPassword(password, user.password_hash, user.password_salt)) {
      return res.status(401).json({ success: false, error: 'Mot de passe incorrect' });
    }

    // Générer un nouveau token
    const token = generateToken();
    await pool.query(
      'UPDATE users SET auth_token = $1, last_login = NOW() WHERE id = $2',
      [token, user.id]
    );

    console.log(`[OK] Connexion locale: ${email}`);

    res.json({
      success: true,
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      },
      token,
      error: null
    });
  } catch (error) {
    console.error('[ERROR] Erreur connexion:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST déconnexion locale
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (token) {
      await pool.query('UPDATE users SET auth_token = NULL WHERE auth_token = $1', [token]);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET vérifier token
app.get('/api/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ valid: false, error: 'Token manquant' });
    }

    const result = await pool.query(
      'SELECT id, email, display_name, role FROM users WHERE auth_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ valid: false, error: 'Token invalide' });
    }

    const user = result.rows[0];
    res.json({
      valid: true,
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ valid: false, error: error.message });
  }
});

// POST changer le mot de passe
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { userId, currentPassword, newPassword } = req.body;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Non authentifié' });
    }

    // Vérifier le token
    const userResult = await pool.query(
      'SELECT id, password_hash, password_salt FROM users WHERE id = $1 AND auth_token = $2',
      [userId, token]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Session invalide' });
    }

    const user = userResult.rows[0];

    // Vérifier l'ancien mot de passe
    if (!verifyPassword(currentPassword, user.password_hash, user.password_salt)) {
      return res.status(401).json({ success: false, error: 'Mot de passe actuel incorrect' });
    }

    // Hasher le nouveau mot de passe
    const { salt, hash } = hashPassword(newPassword);
    
    await pool.query(
      'UPDATE users SET password_hash = $1, password_salt = $2 WHERE id = $3',
      [hash, salt, userId]
    );

    console.log(`[AUTH] Mot de passe changé pour: ${userId}`);
    res.json({ success: true, error: null });
  } catch (error) {
    console.error('[ERROR] Erreur changement mot de passe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ROUTES SYNCHRONISATION
// ============================================================================

// GET éléments non synchronisés
app.get('/api/sync/pending', async (req, res) => {
  try {
    const reports = await pool.query(
      'SELECT * FROM road_reports WHERE is_synced = FALSE'
    );
    const users = await pool.query(
      'SELECT * FROM users WHERE is_synced = FALSE'
    );
    const entreprises = await pool.query(
      'SELECT * FROM entreprises WHERE is_synced = FALSE'
    );
    res.json({
      reports: reports.rows,
      users: users.rows,
      entreprises: entreprises.rows,
      totalPending: reports.rows.length + users.rows.length + entreprises.rows.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST marquer comme synchronisé
app.post('/api/sync/mark-synced', async (req, res) => {
  try {
    const { table, ids } = req.body;
    
    if (table === 'road_reports') {
      await pool.query(
        `UPDATE road_reports SET is_synced = TRUE, synced_at = NOW() 
         WHERE id = ANY($1)`,
        [ids]
      );
    } else if (table === 'users') {
      await pool.query(
        `UPDATE users SET is_synced = TRUE, synced_at = NOW() 
         WHERE id = ANY($1)`,
        [ids]
      );
    } else if (table === 'entreprises') {
      await pool.query(
        `UPDATE entreprises SET is_synced = TRUE, synced_at = NOW() 
         WHERE id = ANY($1)`,
        [ids]
      );
    }

    // Mettre à jour le log
    await pool.query(
      `UPDATE sync_log SET status = 'success', completed_at = NOW()
       WHERE record_id = ANY($1) AND status = 'pending'`,
      [ids]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST importer depuis Firebase
app.post('/api/sync/import', async (req, res) => {
  try {
    const { reports = [], users = [], entreprises = [] } = req.body;
    let importedUsers = 0;
    let skippedUsers = 0;
    let importedReports = 0;
    let skippedReports = 0;
    let importedEntreprises = 0;
    let skippedEntreprises = 0;
    const errors = [];

    console.log('[SYNC-IMPORT] Debut import: ' + reports.length + ' signalements, ' + users.length + ' utilisateurs, ' + entreprises.length + ' entreprises');

    // Importer les utilisateurs
    for (const user of users) {
      try {
        const userId = user.uid || user.id;
        
        // Verifier si l'utilisateur existe deja (par ID ou email)
        const existing = await pool.query(
          'SELECT id, email FROM users WHERE id = $1 OR email = $2',
          [userId, user.email]
        );
        
        if (existing.rows.length > 0) {
          // Utilisateur existe deja - mettre a jour seulement si c'est le meme ID
          if (existing.rows[0].id === userId) {
            await pool.query(
              `UPDATE users SET 
                 display_name = COALESCE($1, display_name),
                 role = COALESCE($2, role),
                 is_synced = TRUE,
                 synced_at = NOW()
               WHERE id = $3`,
              [user.displayName, user.role, userId]
            );
            importedUsers++;
            console.log('[SYNC-IMPORT] Utilisateur mis a jour: ' + user.email);
          } else {
            // Email existe avec un autre ID - ignorer
            skippedUsers++;
            console.log('[SYNC-IMPORT] Utilisateur ignore (email existe): ' + user.email);
          }
        } else {
          // Nouvel utilisateur
          await pool.query(
            `INSERT INTO users (id, email, display_name, role, created_at, is_synced, synced_at)
             VALUES ($1, $2, $3, $4, $5, TRUE, NOW())`,
            [userId, user.email, user.displayName, user.role, user.createdAt || new Date()]
          );
          importedUsers++;
          console.log('[SYNC-IMPORT] Utilisateur cree: ' + user.email);
        }
      } catch (err) {
        console.error('[SYNC-IMPORT] Erreur import user ' + user.email + ':', err.message);
        errors.push({ type: 'user', id: user.id, email: user.email, error: err.message });
      }
    }

    // Importer les signalements
    for (const report of reports) {
      try {
        // Convertir createdAt en format valide
        let createdAt = report.createdAt;
        if (typeof createdAt === 'object' && createdAt._seconds) {
          createdAt = new Date(createdAt._seconds * 1000);
        } else if (typeof createdAt === 'string') {
          createdAt = new Date(createdAt);
        } else if (!createdAt) {
          createdAt = new Date();
        }

        // Verifier si ce signalement existe deja (par firebase_id ou id)
        const existingByFirebaseId = await pool.query(
          'SELECT id FROM road_reports WHERE firebase_id = $1 OR id = $1',
          [report.id]
        );
        
        // Verifier aussi par localId si present
        let existingByLocalId = { rows: [] };
        if (report.localId) {
          existingByLocalId = await pool.query(
            'SELECT id FROM road_reports WHERE id = $1',
            [report.localId]
          );
        }

        if (existingByFirebaseId.rows.length > 0) {
          // Mettre a jour l'existant
          await pool.query(
            `UPDATE road_reports SET
               status = $1,
               images = $2,
               status_history = $3,
               firebase_id = $4,
               is_synced = TRUE,
               synced_at = NOW()
             WHERE firebase_id = $4 OR id = $4`,
            [report.status, JSON.stringify(report.images || []), 
             JSON.stringify(report.statusHistory || []), report.id]
          );
          skippedReports++;
          console.log('[SYNC-IMPORT] Signalement mis a jour: ' + report.id);
        } else if (existingByLocalId.rows.length > 0) {
          // Mettre a jour par localId et ajouter firebase_id
          await pool.query(
            `UPDATE road_reports SET
               status = $1,
               images = $2,
               status_history = $3,
               firebase_id = $4,
               is_synced = TRUE,
               synced_at = NOW()
             WHERE id = $5`,
            [report.status, JSON.stringify(report.images || []), 
             JSON.stringify(report.statusHistory || []), report.id, report.localId]
          );
          skippedReports++;
          console.log('[SYNC-IMPORT] Signalement lie: ' + report.localId + ' -> ' + report.id);
        } else {
          // Nouveau signalement - IMPORTER (on ne vérifie plus syncedFromLocal)
          // L'ID Firebase devient l'ID local pour éviter les doublons futurs
          const newLocalId = report.localId || require('crypto').randomUUID();
          
          // Vérifier si le user_id existe en local, sinon mettre NULL
          let validUserId = null;
          if (report.userId) {
            const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [report.userId]);
            if (userExists.rows.length > 0) {
              validUserId = report.userId;
            } else {
              console.log('[SYNC-IMPORT] user_id ' + report.userId + ' non trouvé, utilisation de NULL');
            }
          }
          
          await pool.query(
            `INSERT INTO road_reports 
             (id, user_id, user_email, type, description, latitude, longitude,
              quartier, arrondissement, status, images, status_history,
              created_at, is_synced, synced_at, firebase_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, NOW(), $14)
             ON CONFLICT (id) DO NOTHING`,
            [
              newLocalId, 
              validUserId,  // Utiliser NULL si l'utilisateur n'existe pas
              report.userEmail, 
              report.type, 
              report.description, 
              report.latitude, 
              report.longitude,
              report.quartier, 
              report.arrondissement, 
              report.status,
              JSON.stringify(report.images || []), 
              JSON.stringify(report.statusHistory || []),
              createdAt,
              report.id  // firebase_id
            ]
          );
          importedReports++;
          console.log('[SYNC-IMPORT] Signalement importe: ' + report.id + ' -> local:' + newLocalId + ' (' + report.type + ')');
        }
      } catch (err) {
        console.error('[SYNC-IMPORT] Erreur import report ' + report.id + ':', err.message);
        errors.push({ type: 'report', id: report.id, error: err.message });
      }
    }

    // Importer les entreprises
    for (const entreprise of entreprises) {
      try {
        // Verifier si l'entreprise existe deja
        const existing = await pool.query(
          'SELECT id FROM entreprises WHERE id = $1',
          [entreprise.id]
        );
        
        if (existing.rows.length > 0) {
          // Mettre a jour
          await pool.query(
            `UPDATE entreprises SET
               name = COALESCE($1, name),
               contact = COALESCE($2, contact),
               phone = COALESCE($3, phone),
               email = COALESCE($4, email),
               address = COALESCE($5, address),
               specialties = COALESCE($6, specialties),
               is_synced = TRUE,
               synced_at = NOW()
             WHERE id = $7`,
            [entreprise.name, entreprise.contact, entreprise.phone, 
             entreprise.email, entreprise.address, 
             JSON.stringify(entreprise.specialties || []), entreprise.id]
          );
          skippedEntreprises++;
          console.log('[SYNC-IMPORT] Entreprise mise a jour: ' + entreprise.name);
        } else {
          await pool.query(
            `INSERT INTO entreprises (id, name, contact, phone, email, address, specialties, is_synced, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())`,
            [entreprise.id, entreprise.name, entreprise.contact, entreprise.phone, 
             entreprise.email, entreprise.address, JSON.stringify(entreprise.specialties || [])]
          );
          importedEntreprises++;
          console.log('[SYNC-IMPORT] Entreprise creee: ' + entreprise.name);
        }
      } catch (err) {
        console.error('[SYNC-IMPORT] Erreur import entreprise ' + entreprise.id + ':', err.message);
        errors.push({ type: 'entreprise', id: entreprise.id, error: err.message });
      }
    }

    console.log('[SYNC-IMPORT] Termine - Utilisateurs: ' + importedUsers + ' importes, ' + skippedUsers + ' ignores');
    console.log('[SYNC-IMPORT] Termine - Signalements: ' + importedReports + ' importes, ' + skippedReports + ' ignores');
    console.log('[SYNC-IMPORT] Termine - Entreprises: ' + importedEntreprises + ' importees, ' + skippedEntreprises + ' ignorees');

    res.json({ 
      success: true, 
      imported: { reports: importedReports, users: importedUsers, entreprises: importedEntreprises },
      skipped: { reports: skippedReports, users: skippedUsers, entreprises: skippedEntreprises },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('[SYNC-IMPORT] Erreur generale:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ROUTES ENTREPRISES
// ============================================================================

// GET toutes les entreprises
app.get('/api/entreprises', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM entreprises ORDER BY name ASC'
    );
    res.json({ entreprises: result.rows });
  } catch (error) {
    console.error('[ERROR] Erreur récupération entreprises:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET une entreprise par ID
app.get('/api/entreprises/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM entreprises WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }
    res.json({ entreprise: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST créer une entreprise
app.post('/api/entreprises', async (req, res) => {
  try {
    const { id, name, contact, phone, email, address, specialties } = req.body;
    const entrepriseId = id || uuidv4();
    
    const result = await pool.query(
      `INSERT INTO entreprises (id, name, contact, phone, email, address, specialties, is_synced)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
       RETURNING *`,
      [entrepriseId, name, contact, phone, email, address, JSON.stringify(specialties || [])]
    );
    
    console.log(`[OK] Entreprise créée: ${name} (${entrepriseId})`);
    res.status(201).json({ entreprise: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] Erreur création entreprise:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT mettre à jour une entreprise
app.put('/api/entreprises/:id', async (req, res) => {
  try {
    const { name, contact, phone, email, address, specialties } = req.body;
    
    const result = await pool.query(
      `UPDATE entreprises SET 
         name = COALESCE($1, name),
         contact = COALESCE($2, contact),
         phone = COALESCE($3, phone),
         email = COALESCE($4, email),
         address = COALESCE($5, address),
         specialties = COALESCE($6, specialties),
         is_synced = FALSE
       WHERE id = $7
       RETURNING *`,
      [name, contact, phone, email, address, 
       specialties ? JSON.stringify(specialties) : null, 
       req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }
    
    res.json({ entreprise: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE supprimer une entreprise
app.delete('/api/entreprises/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM entreprises WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }
    
    res.json({ success: true, message: 'Entreprise supprimée' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET statistiques
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await pool.query('SELECT * FROM report_stats');
    const byType = await pool.query(
      `SELECT type, COUNT(*) as count FROM road_reports GROUP BY type`
    );
    const byQuartier = await pool.query(
      `SELECT quartier, COUNT(*) as count FROM road_reports 
       WHERE quartier IS NOT NULL GROUP BY quartier ORDER BY count DESC LIMIT 10`
    );
    
    res.json({
      ...stats.rows[0],
      byType: byType.rows,
      byQuartier: byQuartier.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROUTES UPLOAD D'IMAGES
// ============================================================================

// Upload d'images pour un signalement
app.post('/api/upload/:reportId?', upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucune image fournie' });
    }

    const baseUrl = `http://localhost:${PORT}`;
    const uploadedImages = req.files.map(file => ({
      url: `${baseUrl}/uploads/${req.params.reportId || 'temp'}/${file.filename}`,
      path: file.path,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({
      success: true,
      images: uploadedImages
    });
  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload une seule image
app.post('/api/upload-single/:reportId?', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image fournie' });
    }

    const baseUrl = `http://localhost:${PORT}`;
    const reportId = req.params.reportId || 'temp';

    res.json({
      success: true,
      url: `${baseUrl}/uploads/${reportId}/${req.file.filename}`,
      path: req.file.path,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// MIGRATION IMAGES VERS FIREBASE STORAGE
// ============================================================================

// Migrer une image locale vers Firebase Storage
app.post('/api/migrate-image-to-firebase', async (req, res) => {
  try {
    const { localUrl, reportId } = req.body;
    
    if (!localUrl || !reportId) {
      return res.status(400).json({ error: 'localUrl et reportId requis' });
    }

    // Extraire le chemin du fichier depuis l'URL locale
    // URL format: http://localhost:3001/uploads/{reportId}/{filename}
    const urlPath = localUrl.replace(`http://localhost:${PORT}/`, '');
    const localFilePath = path.join(__dirname, urlPath);

    // Vérifier que le fichier existe
    if (!fs.existsSync(localFilePath)) {
      return res.status(404).json({ error: 'Fichier local non trouvé', path: localFilePath });
    }

    // Générer un nom unique pour Firebase
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(localFilePath);
    const firebaseFileName = `report_images/${reportId}/${reportId}_${timestamp}_${randomStr}${extension}`;

    // Upload vers Firebase Storage
    await bucket.upload(localFilePath, {
      destination: firebaseFileName,
      metadata: {
        contentType: `image/${extension.replace('.', '') || 'jpeg'}`,
        metadata: {
          originalLocalUrl: localUrl,
          reportId: reportId,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Rendre le fichier public et obtenir l'URL
    const file = bucket.file(firebaseFileName);
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${firebaseFileName}`;
    
    console.log(`[OK] Image migrée vers Firebase: ${firebaseFileName}`);

    res.json({
      success: true,
      firebaseUrl: publicUrl,
      firebasePath: firebaseFileName,
      originalUrl: localUrl
    });
  } catch (error) {
    console.error('[ERROR] Migration image vers Firebase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Migrer toutes les images d'un signalement
app.post('/api/migrate-report-images/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const reportDir = path.join(UPLOADS_DIR, reportId);

    if (!fs.existsSync(reportDir)) {
      return res.json({ success: true, migrated: [], message: 'Aucune image à migrer' });
    }

    const files = fs.readdirSync(reportDir);
    const results = [];

    for (const filename of files) {
      const localFilePath = path.join(reportDir, filename);
      const localUrl = `http://localhost:${PORT}/uploads/${reportId}/${filename}`;
      
      try {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = path.extname(filename);
        const firebaseFileName = `report_images/${reportId}/${reportId}_${timestamp}_${randomStr}${extension}`;

        await bucket.upload(localFilePath, {
          destination: firebaseFileName,
          metadata: {
            contentType: `image/${extension.replace('.', '') || 'jpeg'}`
          }
        });

        const file = bucket.file(firebaseFileName);
        await file.makePublic();
        
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${firebaseFileName}`;
        
        results.push({
          originalUrl: localUrl,
          firebaseUrl: publicUrl,
          success: true
        });
        
        console.log(`   [OK] Migré: ${filename}`);
      } catch (err) {
        results.push({
          originalUrl: localUrl,
          error: err.message,
          success: false
        });
        console.error(`   [ERROR] Echec: ${filename}`, err.message);
      }
    }

    res.json({
      success: true,
      reportId,
      migrated: results,
      count: results.filter(r => r.success).length
    });
  } catch (error) {
    console.error('[ERROR] Migration images signalement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Supprimer une image
app.delete('/api/upload/:reportId/:filename', async (req, res) => {
  try {
    const { reportId, filename } = req.params;
    const filePath = path.join(UPLOADS_DIR, reportId, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Image supprimée' });
    } else {
      res.status(404).json({ error: 'Image non trouvée' });
    }
  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lister les images d'un signalement
app.get('/api/upload/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const dir = path.join(UPLOADS_DIR, reportId);

    if (!fs.existsSync(dir)) {
      return res.json({ images: [] });
    }

    const files = fs.readdirSync(dir);
    const baseUrl = `http://localhost:${PORT}`;
    const images = files.map(filename => ({
      url: `${baseUrl}/uploads/${reportId}/${filename}`,
      filename
    }));

    res.json({ images });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SETTINGS / CONFIGURATION BACKOFFICE
// ============================================================================

// GET - Récupérer tous les settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings ORDER BY id');
    res.json({ success: true, settings: result.rows });
  } catch (error) {
    console.error('Erreur GET /settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Récupérer un setting spécifique
app.get('/api/settings/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Setting non trouvé' });
    }
    res.json({ success: true, setting: result.rows[0] });
  } catch (error) {
    console.error('Erreur GET /settings/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Mettre à jour un setting
app.put('/api/settings/:id', async (req, res) => {
  try {
    const { value, updatedBy } = req.body;
    const result = await pool.query(
      `UPDATE settings SET value = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3 RETURNING *`,
      [JSON.stringify(value), updatedBy, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Setting non trouvé' });
    }
    console.log(`[OK] Setting mis à jour: ${req.params.id}`);
    res.json({ success: true, setting: result.rows[0] });
  } catch (error) {
    console.error('Erreur PUT /settings/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Calculer le budget automatiquement
app.get('/api/calculate-budget', async (req, res) => {
  try {
    const { niveau, surface } = req.query;
    
    if (!niveau || !surface) {
      return res.status(400).json({ success: false, error: 'niveau et surface requis' });
    }
    
    // Récupérer le prix par m²
    const settingResult = await pool.query('SELECT value FROM settings WHERE id = $1', ['prix_m2']);
    if (settingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Prix par m² non configuré' });
    }
    
    const prixM2 = settingResult.rows[0].value.amount;
    const niveauNum = parseInt(niveau);
    const surfaceNum = parseFloat(surface);
    
    // Formule: prix_par_m2 * niveau * surface_m2
    const budget = prixM2 * niveauNum * surfaceNum;
    
    res.json({ 
      success: true, 
      budget,
      details: {
        prixM2,
        niveau: niveauNum,
        surface: surfaceNum,
        formule: `${prixM2} × ${niveauNum} × ${surfaceNum} = ${budget}`
      }
    });
  } catch (error) {
    console.error('Erreur GET /calculate-budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Statistiques avec délais de traitement
app.get('/api/stats/delays', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'termine') as completed,
        COUNT(*) FILTER (WHERE status = 'en_cours') as in_progress,
        COUNT(*) FILTER (WHERE status = 'nouveau') as new,
        
        -- Délai moyen création -> assignation (en jours)
        ROUND((AVG(EXTRACT(EPOCH FROM (assigned_at - created_at)) / 86400) 
          FILTER (WHERE assigned_at IS NOT NULL))::numeric, 1) as avg_days_to_assign,
        
        -- Délai moyen assignation -> démarrage (en jours)
        ROUND((AVG(EXTRACT(EPOCH FROM (started_at - assigned_at)) / 86400) 
          FILTER (WHERE started_at IS NOT NULL AND assigned_at IS NOT NULL))::numeric, 1) as avg_days_to_start,
        
        -- Délai moyen démarrage -> fin (en jours)
        ROUND((AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 86400) 
          FILTER (WHERE completed_at IS NOT NULL AND started_at IS NOT NULL))::numeric, 1) as avg_days_to_complete,
        
        -- Délai moyen total création -> fin (en jours)
        ROUND((AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) 
          FILTER (WHERE completed_at IS NOT NULL))::numeric, 1) as avg_total_days,
        
        -- Budget total et moyen
        SUM(budget) as total_budget,
        ROUND(AVG(budget)::numeric, 0) as avg_budget,
        
        -- Surface totale et moyenne
        SUM(surface) as total_surface,
        ROUND(AVG(surface)::numeric, 1) as avg_surface,
        
        -- Par niveau
        ROUND(AVG(niveau)::numeric, 1) as avg_niveau
        
      FROM road_reports
    `);
    
    // Statistiques par type de dégradation
    const byType = await pool.query(`
      SELECT 
        type,
        COUNT(*) as count,
        ROUND(AVG(niveau)::numeric, 1) as avg_niveau,
        SUM(surface) as total_surface,
        SUM(budget) as total_budget,
        ROUND((AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) 
          FILTER (WHERE completed_at IS NOT NULL))::numeric, 1) as avg_days
      FROM road_reports
      GROUP BY type
      ORDER BY count DESC
    `);
    
    // Statistiques par entreprise
    const byEntreprise = await pool.query(`
      SELECT 
        e.name as entreprise_name,
        COUNT(r.id) as count,
        SUM(r.surface) as total_surface,
        SUM(r.budget) as total_budget,
        ROUND((AVG(EXTRACT(EPOCH FROM (r.completed_at - r.started_at)) / 86400) 
          FILTER (WHERE r.completed_at IS NOT NULL AND r.started_at IS NOT NULL))::numeric, 1) as avg_days_work
      FROM road_reports r
      LEFT JOIN entreprises e ON r.entreprise_id = e.id
      WHERE r.entreprise_id IS NOT NULL
      GROUP BY e.name
      ORDER BY count DESC
    `);
    
    res.json({ 
      success: true, 
      stats: result.rows[0],
      byType: byType.rows,
      byEntreprise: byEntreprise.rows
    });
  } catch (error) {
    console.error('Erreur GET /stats/delays:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Mettre à jour un signalement avec calcul automatique du budget
app.put('/api/reports/:id/with-budget', async (req, res) => {
  try {
    const { niveau, surface, status, entreprise_id } = req.body;
    
    // Récupérer le prix par m²
    const settingResult = await pool.query('SELECT value FROM settings WHERE id = $1', ['prix_m2']);
    const prixM2 = settingResult.rows.length > 0 ? settingResult.rows[0].value.amount : 50000;
    
    // Calculer le budget
    const niveauNum = parseInt(niveau) || 1;
    const surfaceNum = parseFloat(surface) || 0;
    const budget = prixM2 * niveauNum * surfaceNum;
    
    // Déterminer les timestamps selon le statut
    let assignedAt = null;
    let startedAt = null;
    let completedAt = null;
    
    // Récupérer les valeurs actuelles
    const current = await pool.query('SELECT * FROM road_reports WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Signalement non trouvé' });
    }
    
    const currentReport = current.rows[0];
    
    // Mettre à jour les dates selon le changement de statut
    if (entreprise_id && !currentReport.assigned_at) {
      assignedAt = new Date();
    }
    // Gérer les deux formats: en_cours et en-cours
    if ((status === 'en_cours' || status === 'en-cours') && !currentReport.started_at) {
      startedAt = new Date();
    }
    if ((status === 'termine' || status === 'terminé') && !currentReport.completed_at) {
      completedAt = new Date();
    }
    
    const result = await pool.query(
      `UPDATE road_reports 
       SET niveau = COALESCE($1, niveau),
           surface = COALESCE($2, surface),
           budget = $3,
           status = COALESCE($4, status),
           entreprise_id = COALESCE($5, entreprise_id),
           assigned_at = COALESCE($6, assigned_at),
           started_at = COALESCE($7, started_at),
           completed_at = COALESCE($8, completed_at),
           is_synced = FALSE,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [niveauNum, surfaceNum, budget, status, entreprise_id, assignedAt, startedAt, completedAt, req.params.id]
    );
    
    console.log(`[OK] Signalement mis à jour avec budget: ${req.params.id} (Budget: ${budget} MGA)`);
    
    res.json({ 
      success: true, 
      report: result.rows[0],
      budgetDetails: {
        prixM2,
        niveau: niveauNum,
        surface: surfaceNum,
        budget
      }
    });
  } catch (error) {
    console.error('Erreur PUT /reports/:id/with-budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 API Road Reporter démarrée sur http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Uploads disponibles sur http://localhost:${PORT}/uploads`);
});
