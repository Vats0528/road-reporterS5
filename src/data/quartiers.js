/**
 * Données géographiques d'Antananarivo
 * Quartiers, arrondissements et zones de la ville
 */

// Centre d'Antananarivo
export const ANTANANARIVO_CENTER = {
  lat: -18.8792,
  lng: 47.5079
};

// Limites de la ville (bounding box approximatif)
export const ANTANANARIVO_BOUNDS = {
  north: -18.82,
  south: -18.98,
  east: 47.58,
  west: 47.45
};

/**
 * Arrondissements d'Antananarivo
 * La ville est divisée en 6 arrondissements
 */
export const ARRONDISSEMENTS = [
  {
    id: 1,
    name: '1er Arrondissement',
    description: 'Centre-ville historique',
    color: '#ef4444' // Rouge
  },
  {
    id: 2,
    name: '2ème Arrondissement',
    description: 'Zone nord',
    color: '#f97316' // Orange
  },
  {
    id: 3,
    name: '3ème Arrondissement',
    description: 'Zone est',
    color: '#eab308' // Jaune
  },
  {
    id: 4,
    name: '4ème Arrondissement',
    description: 'Zone sud-est',
    color: '#22c55e' // Vert
  },
  {
    id: 5,
    name: '5ème Arrondissement',
    description: 'Zone sud',
    color: '#3b82f6' // Bleu
  },
  {
    id: 6,
    name: '6ème Arrondissement',
    description: 'Zone ouest',
    color: '#8b5cf6' // Violet
  }
];

/**
 * Quartiers principaux d'Antananarivo avec leurs coordonnées approximatives
 * Organisés par arrondissement
 */
export const QUARTIERS = [
  // 1er Arrondissement - Centre historique
  {
    id: 'analakely',
    name: 'Analakely',
    arrondissement: 1,
    center: { lat: -18.9137, lng: 47.5265 },
    radius: 0.8, // km
    description: 'Centre commercial et administratif'
  },
  {
    id: 'antaninarenina',
    name: 'Antaninarenina',
    arrondissement: 1,
    center: { lat: -18.9167, lng: 47.5233 },
    radius: 0.5,
    description: 'Quartier des affaires'
  },
  {
    id: 'isoraka',
    name: 'Isoraka',
    arrondissement: 1,
    center: { lat: -18.9100, lng: 47.5300 },
    radius: 0.6,
    description: 'Zone résidentielle centrale'
  },
  {
    id: 'faravohitra',
    name: 'Faravohitra',
    arrondissement: 1,
    center: { lat: -18.9050, lng: 47.5350 },
    radius: 0.7,
    description: 'Quartier résidentiel'
  },
  {
    id: 'ambohijatovo',
    name: 'Ambohijatovo',
    arrondissement: 1,
    center: { lat: -18.9180, lng: 47.5280 },
    radius: 0.5,
    description: 'Près du jardin botanique'
  },

  // 2ème Arrondissement - Zone nord
  {
    id: 'ankorondrano',
    name: 'Ankorondrano',
    arrondissement: 2,
    center: { lat: -18.8850, lng: 47.5200 },
    radius: 1.2,
    description: 'Zone commerciale moderne'
  },
  {
    id: 'ankadimbahoaka',
    name: 'Ankadimbahoaka',
    arrondissement: 2,
    center: { lat: -18.8750, lng: 47.5150 },
    radius: 0.8,
    description: 'Quartier universitaire'
  },
  {
    id: 'ambodivona',
    name: 'Ambodivona',
    arrondissement: 2,
    center: { lat: -18.8900, lng: 47.5100 },
    radius: 0.6,
    description: 'Zone résidentielle'
  },
  {
    id: 'antanimena',
    name: 'Antanimena',
    arrondissement: 2,
    center: { lat: -18.8980, lng: 47.5180 },
    radius: 0.7,
    description: 'Quartier central nord'
  },
  {
    id: 'andravoahangy',
    name: 'Andravoahangy',
    arrondissement: 2,
    center: { lat: -18.8920, lng: 47.5350 },
    radius: 1.0,
    description: 'Grand marché et commerce'
  },

  // 3ème Arrondissement - Zone est
  {
    id: 'besarety',
    name: 'Besarety',
    arrondissement: 3,
    center: { lat: -18.9000, lng: 47.5450 },
    radius: 0.8,
    description: 'Zone industrielle et commerciale'
  },
  {
    id: 'ampasampito',
    name: 'Ampasampito',
    arrondissement: 3,
    center: { lat: -18.8950, lng: 47.5500 },
    radius: 0.7,
    description: 'Quartier résidentiel est'
  },
  {
    id: 'ankaditoho',
    name: 'Ankaditoho',
    arrondissement: 3,
    center: { lat: -18.9100, lng: 47.5480 },
    radius: 0.6,
    description: 'Zone résidentielle'
  },
  {
    id: 'ambohimanarina',
    name: 'Ambohimanarina',
    arrondissement: 3,
    center: { lat: -18.8880, lng: 47.5420 },
    radius: 0.8,
    description: 'Quartier sur colline'
  },

  // 4ème Arrondissement - Zone sud-est
  {
    id: 'isotry',
    name: 'Isotry',
    arrondissement: 4,
    center: { lat: -18.9280, lng: 47.5250 },
    radius: 0.9,
    description: 'Zone populaire et marché'
  },
  {
    id: 'mahamasina',
    name: 'Mahamasina',
    arrondissement: 4,
    center: { lat: -18.9220, lng: 47.5200 },
    radius: 0.7,
    description: 'Stade et zone sportive'
  },
  {
    id: 'anosy',
    name: 'Anosy',
    arrondissement: 4,
    center: { lat: -18.9150, lng: 47.5180 },
    radius: 0.6,
    description: 'Lac Anosy et monuments'
  },
  {
    id: 'ampefiloha',
    name: 'Ampefiloha',
    arrondissement: 4,
    center: { lat: -18.9200, lng: 47.5120 },
    radius: 0.8,
    description: 'Zone administrative'
  },
  {
    id: 'ambanidia',
    name: 'Ambanidia',
    arrondissement: 4,
    center: { lat: -18.9250, lng: 47.5350 },
    radius: 0.6,
    description: 'Quartier résidentiel'
  },

  // 5ème Arrondissement - Zone sud
  {
    id: 'andoharanofotsy',
    name: 'Andoharanofotsy',
    arrondissement: 5,
    center: { lat: -18.9600, lng: 47.5200 },
    radius: 1.5,
    description: 'Zone périurbaine sud'
  },
  {
    id: 'ankadikely',
    name: 'Ankadikely',
    arrondissement: 5,
    center: { lat: -18.9450, lng: 47.5150 },
    radius: 1.0,
    description: 'Zone résidentielle sud'
  },
  {
    id: 'ambohimanambola',
    name: 'Ambohimanambola',
    arrondissement: 5,
    center: { lat: -18.9500, lng: 47.5300 },
    radius: 0.8,
    description: 'Quartier sud-est'
  },
  {
    id: 'tanjombato',
    name: 'Tanjombato',
    arrondissement: 5,
    center: { lat: -18.9550, lng: 47.5100 },
    radius: 1.2,
    description: 'Zone commerciale sud'
  },

  // 6ème Arrondissement - Zone ouest
  {
    id: 'andohalo',
    name: 'Andohalo',
    arrondissement: 6,
    center: { lat: -18.9180, lng: 47.5080 },
    radius: 0.5,
    description: 'Haute-ville historique'
  },
  {
    id: 'ambohidahy',
    name: 'Ambohidahy',
    arrondissement: 6,
    center: { lat: -18.9100, lng: 47.5050 },
    radius: 0.6,
    description: 'Quartier résidentiel ouest'
  },
  {
    id: 'ambatomena',
    name: 'Ambatomena',
    arrondissement: 6,
    center: { lat: -18.9050, lng: 47.5000 },
    radius: 0.7,
    description: 'Zone ouest'
  },
  {
    id: 'anosizato',
    name: 'Anosizato',
    arrondissement: 6,
    center: { lat: -18.9000, lng: 47.4900 },
    radius: 1.2,
    description: 'Zone industrielle ouest'
  },
  {
    id: '67ha',
    name: '67 Ha',
    arrondissement: 6,
    center: { lat: -18.8950, lng: 47.5020 },
    radius: 1.5,
    description: 'Grand quartier ouest'
  },
  {
    id: 'ivandry',
    name: 'Ivandry',
    arrondissement: 6,
    center: { lat: -18.8800, lng: 47.5050 },
    radius: 1.0,
    description: 'Zone résidentielle moderne'
  }
];

/**
 * Obtenir un quartier par son ID
 */
export function getQuartierById(id) {
  return QUARTIERS.find(q => q.id === id);
}

/**
 * Obtenir les quartiers d'un arrondissement
 */
export function getQuartiersByArrondissement(arrondissementId) {
  return QUARTIERS.filter(q => q.arrondissement === arrondissementId);
}

/**
 * Obtenir l'arrondissement par ID
 */
export function getArrondissementById(id) {
  return ARRONDISSEMENTS.find(a => a.id === id);
}

/**
 * Calculer la distance entre deux points (formule de Haversine)
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lng1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lng2 - Longitude du point 2
 * @returns {number} Distance en kilomètres
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Trouver le quartier le plus proche d'un point
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object|null} Quartier le plus proche avec la distance
 */
export function findNearestQuartier(lat, lng) {
  let nearest = null;
  let minDistance = Infinity;

  for (const quartier of QUARTIERS) {
    const distance = calculateDistance(lat, lng, quartier.center.lat, quartier.center.lng);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearest = {
        ...quartier,
        distance: distance,
        isWithinRadius: distance <= quartier.radius
      };
    }
  }

  return nearest;
}

/**
 * Trouver tous les quartiers dans un rayon donné
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Rayon en km
 * @returns {Array} Liste des quartiers avec leur distance
 */
export function findQuartiersInRadius(lat, lng, radius = 2) {
  return QUARTIERS
    .map(quartier => ({
      ...quartier,
      distance: calculateDistance(lat, lng, quartier.center.lat, quartier.center.lng)
    }))
    .filter(q => q.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Vérifier si un point est dans les limites d'Antananarivo
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean}
 */
export function isWithinAntananarivo(lat, lng) {
  return (
    lat >= ANTANANARIVO_BOUNDS.south &&
    lat <= ANTANANARIVO_BOUNDS.north &&
    lng >= ANTANANARIVO_BOUNDS.west &&
    lng <= ANTANANARIVO_BOUNDS.east
  );
}

/**
 * Obtenir l'adresse formatée à partir des coordonnées
 * (Utilise les données locales, pas d'API externe)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} Informations de localisation
 */
export function getLocationInfo(lat, lng) {
  const quartier = findNearestQuartier(lat, lng);
  
  if (!quartier) {
    return {
      quartier: null,
      arrondissement: null,
      address: 'Position inconnue',
      isWithinCity: false
    };
  }

  const arrondissement = getArrondissementById(quartier.arrondissement);
  const isWithinCity = isWithinAntananarivo(lat, lng);

  return {
    quartier: quartier,
    arrondissement: arrondissement,
    address: `${quartier.name}, ${arrondissement?.name || ''}, Antananarivo`,
    shortAddress: quartier.name,
    isWithinCity: isWithinCity,
    distance: quartier.distance,
    isWithinQuartier: quartier.isWithinRadius
  };
}

/**
 * Liste des quartiers pour un select/dropdown
 */
export function getQuartiersForSelect() {
  return ARRONDISSEMENTS.map(arr => ({
    label: arr.name,
    options: QUARTIERS
      .filter(q => q.arrondissement === arr.id)
      .map(q => ({
        value: q.id,
        label: q.name,
        description: q.description
      }))
  }));
}

/**
 * Rechercher des quartiers par nom
 * @param {string} searchTerm - Terme de recherche
 * @returns {Array} Quartiers correspondants
 */
export function searchQuartiers(searchTerm) {
  if (!searchTerm || searchTerm.length < 2) return [];
  
  const term = searchTerm.toLowerCase();
  return QUARTIERS.filter(q => 
    q.name.toLowerCase().includes(term) ||
    q.description.toLowerCase().includes(term)
  );
}

/**
 * Alias pour findNearestQuartier - obtenir un quartier par coordonnées
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object|null} Quartier le plus proche ou null
 */
export function getQuartierByCoordinates(lat, lng) {
  return findNearestQuartier(lat, lng);
}
