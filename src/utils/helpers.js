// Utilitaires de formatage pour l'application Routes Tana

/**
 * Formate une date en français
 */
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('fr-FR', defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date invalide';
  }
};

/**
 * Formate une date avec l'heure
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Date invalide';
  }
};

/**
 * Formate un montant en Ariary malgache
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'N/A';
  
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${amount} MGA`;
  }
};

/**
 * Formate un nombre avec séparateurs de milliers
 */
export const formatNumber = (number, decimals = 2) => {
  if (number === null || number === undefined) return 'N/A';
  
  try {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  } catch (error) {
    console.error('Error formatting number:', error);
    return number.toString();
  }
};

/**
 * Formate une surface en m²
 */
export const formatSurface = (surface) => {
  if (surface === null || surface === undefined) return 'N/A';
  return `${formatNumber(surface, 2)} m²`;
};

/**
 * Obtient le label d'un statut
 */
export const getStatusLabel = (status) => {
  const labels = {
    'nouveau': 'Nouveau',
    'en-cours': 'En cours',
    'termine': 'Terminé'
  };
  return labels[status] || status;
};

/**
 * Obtient le label d'un type de problème
 */
export const getTypeLabel = (type) => {
  const labels = {
    'nid-de-poule': 'Nid de poule',
    'fissure': 'Fissure',
    'affaissement': 'Affaissement',
    'inondation': "Problème d'inondation",
    'autre': 'Autre'
  };
  return labels[type] || type;
};

/**
 * Obtient la classe CSS pour un statut
 */
export const getStatusClass = (status) => {
  const classes = {
    'nouveau': 'status-nouveau',
    'en-cours': 'status-en-cours',
    'termine': 'status-termine'
  };
  return classes[status] || '';
};

/**
 * Obtient la couleur d'un statut (hex)
 */
export const getStatusColor = (status) => {
  const colors = {
    'nouveau': '#3b82f6',
    'en-cours': '#f59e0b',
    'termine': '#10b981'
  };
  return colors[status] || '#64748b';
};

/**
 * Tronque un texte à une longueur donnée
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Calcule le temps écoulé depuis une date
 */
export const timeAgo = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now - dateObj;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffSeconds < 60) return 'À l\'instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 30) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    if (diffMonths < 12) return `Il y a ${diffMonths} mois`;
    return `Il y a ${diffYears} an${diffYears > 1 ? 's' : ''}`;
  } catch (error) {
    console.error('Error calculating time ago:', error);
    return 'N/A';
  }
};

/**
 * Valide une adresse email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valide un mot de passe (min 6 caractères)
 */
export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

/**
 * Formate des coordonnées géographiques
 */
export const formatCoordinates = (lat, lng, decimals = 6) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return 'N/A';
  }
  return `${lat.toFixed(decimals)}, ${lng.toFixed(decimals)}`;
};

/**
 * Calcule la distance entre deux points (en km)
 * Utilise la formule de Haversine
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

/**
 * Génère un ID court pour affichage
 */
export const generateShortId = (fullId) => {
  if (!fullId) return 'N/A';
  return fullId.slice(0, 8);
};