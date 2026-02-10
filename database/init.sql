-- Initialisation de la base de données Road Reporter
-- Structure miroir de Firebase Firestore

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    phone VARCHAR(50),
    address TEXT,
    password_hash VARCHAR(255),
    password_salt VARCHAR(255),
    auth_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    synced_at TIMESTAMP,
    is_synced BOOLEAN DEFAULT FALSE
);

-- Table des signalements
CREATE TABLE IF NOT EXISTS road_reports (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    type VARCHAR(100) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    quartier VARCHAR(100),
    arrondissement VARCHAR(100),
    status VARCHAR(50) DEFAULT 'nouveau',
    entreprise_id VARCHAR(128),
    images JSONB DEFAULT '[]',
    status_history JSONB DEFAULT '[]',
    niveau INTEGER DEFAULT 1 CHECK (niveau >= 1 AND niveau <= 10),
    budget DECIMAL(15, 2),
    surface DECIMAL(10, 2),
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    validated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP,
    is_synced BOOLEAN DEFAULT FALSE,
    firebase_id VARCHAR(128)
);

-- Table des entreprises
CREATE TABLE IF NOT EXISTS entreprises (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    specialties JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP,
    is_synced BOOLEAN DEFAULT FALSE
);

-- Table de configuration (backoffice)
CREATE TABLE IF NOT EXISTS settings (
    id VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(128)
);

-- Valeurs par défaut
INSERT INTO settings (id, value, description) 
VALUES ('prix_m2', '{"amount": 50000, "currency": "MGA"}', 'Prix forfaitaire par m² pour le calcul du budget')
ON CONFLICT (id) DO NOTHING;

-- Table de synchronisation (log des opérations)
CREATE TABLE IF NOT EXISTS sync_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(128) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
    direction VARCHAR(20) NOT NULL, -- 'to_firebase', 'from_firebase'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'error'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON road_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON road_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_location ON road_reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_reports_synced ON road_reports(is_synced);
CREATE INDEX IF NOT EXISTS idx_reports_created ON road_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON road_reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON road_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entreprises_updated_at ON entreprises;
CREATE TRIGGER update_entreprises_updated_at
    BEFORE UPDATE ON entreprises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Vue pour les statistiques
CREATE OR REPLACE VIEW report_stats AS
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'nouveau') as nouveau,
    COUNT(*) FILTER (WHERE status = 'en-cours') as en_cours,
    COUNT(*) FILTER (WHERE status = 'termine') as termine,
    COUNT(*) FILTER (WHERE is_synced = FALSE) as pending_sync
FROM road_reports;

-- Insérer un utilisateur manager par défaut
INSERT INTO users (id, email, display_name, role, is_synced) 
VALUES ('local_manager', 'manager@routestana.mg', 'Manager Local', 'manager', TRUE)
ON CONFLICT (id) DO NOTHING;
