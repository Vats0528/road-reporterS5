// Constantes de l'application Routes Tana

// ============================================================================
// CONFIGURATION DE SÉCURITÉ
// ============================================================================

// Limite de tentatives de connexion (paramétrable)
export const LOGIN_ATTEMPT_LIMIT = 3;

// Durée de blocage après dépassement des tentatives (en minutes)
export const LOGIN_BLOCK_DURATION = 15;

// Durée de vie de session (en millisecondes) - 8 heures par défaut
export const SESSION_LIFETIME = 8 * 60 * 60 * 1000;

// Durée avant avertissement d'expiration (en millisecondes) - 5 minutes
export const SESSION_WARNING_BEFORE_EXPIRY = 5 * 60 * 1000;

// ============================================================================
// CONFIGURATION CARTE
// ============================================================================

// Position par défaut de la carte (Centre d'Antananarivo)
export const DEFAULT_MAP_CENTER = [-18.8792, 47.5079];
export const DEFAULT_MAP_ZOOM = 13;

// Types de problèmes routiers
export const REPORT_TYPES = {
  NID_DE_POULE: 'nid-de-poule',
  FISSURE: 'fissure',
  AFFAISSEMENT: 'affaissement',
  INONDATION: 'inondation',
  AUTRE: 'autre'
};

export const REPORT_TYPE_LABELS = {
  'nid-de-poule': 'Nid de poule',
  'fissure': 'Fissure',
  'affaissement': 'Affaissement',
  'inondation': "Problème d'inondation",
  'autre': 'Autre'
};

// Statuts des signalements
export const REPORT_STATUS = {
  NOUVEAU: 'nouveau',
  EN_COURS: 'en-cours',
  TERMINE: 'termine'
};

export const REPORT_STATUS_LABELS = {
  'nouveau': 'Nouveau',
  'en-cours': 'En cours',
  'termine': 'Terminé'
};

export const REPORT_STATUS_COLORS = {
  'nouveau': {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  'en-cours': {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200'
  },
  'termine': {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  }
};

// Rôles utilisateurs
export const USER_ROLES = {
  VISITOR: 'visitor',   // Visiteur non connecté - lecture seule
  USER: 'user',         // Utilisateur connecté - peut créer des signalements
  MANAGER: 'manager'    // Manager - accès complet
};

// Permissions par rôle
export const ROLE_PERMISSIONS = {
  visitor: {
    canViewMap: true,
    canViewReports: true,
    canViewStats: true,
    canCreateReport: false,
    canEditReport: false,
    canDeleteReport: false,
    canChangeStatus: false,
    canAssignEntreprise: false,
    canManageUsers: false,
    canExportData: false,
    canAccessDashboard: false,
    canAccessManagerPanel: false
  },
  user: {
    canViewMap: true,
    canViewReports: true,
    canViewStats: true,
    canCreateReport: true,
    canEditReport: false,      // Seulement ses propres signalements (géré séparément)
    canDeleteReport: false,
    canChangeStatus: false,
    canAssignEntreprise: false,
    canManageUsers: false,
    canExportData: false,
    canAccessDashboard: true,
    canAccessManagerPanel: false
  },
  manager: {
    canViewMap: true,
    canViewReports: true,
    canViewStats: true,
    canCreateReport: true,
    canEditReport: true,
    canDeleteReport: true,
    canChangeStatus: true,
    canAssignEntreprise: true,
    canManageUsers: true,
    canExportData: true,
    canAccessDashboard: true,
    canAccessManagerPanel: true
  }
};

// Liste des permissions disponibles
export const PERMISSIONS = {
  VIEW_MAP: 'canViewMap',
  VIEW_REPORTS: 'canViewReports',
  VIEW_STATS: 'canViewStats',
  CREATE_REPORT: 'canCreateReport',
  EDIT_REPORT: 'canEditReport',
  DELETE_REPORT: 'canDeleteReport',
  CHANGE_STATUS: 'canChangeStatus',
  ASSIGN_ENTREPRISE: 'canAssignEntreprise',
  MANAGE_USERS: 'canManageUsers',
  EXPORT_DATA: 'canExportData',
  ACCESS_DASHBOARD: 'canAccessDashboard',
  ACCESS_MANAGER_PANEL: 'canAccessManagerPanel'
};

// Collections Firebase
export const FIREBASE_COLLECTIONS = {
  USERS: 'users',
  REPORTS: 'road_reports'
};

// Messages d'erreur
export const ERROR_MESSAGES = {
  AUTH_INVALID_EMAIL: 'Adresse email invalide',
  AUTH_USER_NOT_FOUND: 'Utilisateur non trouvé',
  AUTH_WRONG_PASSWORD: 'Mot de passe incorrect',
  AUTH_EMAIL_IN_USE: 'Cette adresse email est déjà utilisée',
  AUTH_WEAK_PASSWORD: 'Le mot de passe doit contenir au moins 6 caractères',
  NETWORK_ERROR: 'Erreur de connexion au serveur',
  GENERIC_ERROR: 'Une erreur est survenue'
};

// Limites
export const LIMITS = {
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_SURFACE: 10000, // m²
  MAX_BUDGET: 100000000, // MGA
  MIN_PASSWORD_LENGTH: 6
};

// Formats
export const DATE_FORMAT = {
  LOCALE: 'fr-FR',
  OPTIONS: {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
};

export const CURRENCY_FORMAT = {
  LOCALE: 'fr-FR',
  CURRENCY: 'MGA',
  OPTIONS: {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }
};

// URLs et liens
export const LINKS = {
  OPENSTREETMAP: 'https://www.openstreetmap.org',
  FIREBASE: 'https://firebase.google.com',
  GITHUB: 'https://github.com',
  SUPPORT_EMAIL: 'support@routestana.mg'
};

// Metadata
export const APP_INFO = {
  NAME: 'Routes Tana',
  FULL_NAME: 'Signalement Routes Antananarivo',
  VERSION: '1.0.0',
  DESCRIPTION: 'Application de signalement et suivi des problèmes routiers à Antananarivo',
  AUTHOR: 'Routes Tana Team',
  LOCATION: 'Antananarivo, Madagascar'
};