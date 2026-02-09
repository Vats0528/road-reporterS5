import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { QUARTIERS, ARRONDISSEMENTS } from '../data/quartiers';

// Configuration des tuiles
const TILE_CONFIG = {
  // Mode offline: utilise le serveur local Docker (tuiles téléchargées)
  offline: {
    url: 'http://localhost:8080/tiles/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap (cache local)',
    maxZoom: 19,
    minZoom: 8
  },
  // Mode online: utilise OpenStreetMap directement
  online: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    minZoom: 1
  }
};

// Détecter si le serveur de tuiles local est disponible
const checkOfflineAvailable = async () => {
  try {
    const response = await fetch('http://localhost:8080/health', { 
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Icônes personnalisées par statut
const createCustomIcon = (status) => {
  const colors = {
    'nouveau': '#ef4444',      // Rouge
    'en-cours': '#f59e0b',     // Orange/Jaune
    'termine': '#22c55e',      // Vert
    'default': '#6b7280'       // Gris
  };

  const color = colors[status] || colors.default;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-size: 12px;
          font-weight: bold;
        ">
          ${status === 'nouveau' ? '!' : status === 'en-cours' ? '⚙' : status === 'termine' ? '✓' : '?'}
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

// Icône pour le mode ajout
const addMarkerIcon = L.divIcon({
  className: 'add-marker-icon',
  html: `
    <div style="
      background-color: #3b82f6;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 1.5s infinite;
    ">
      <span style="color: white; font-size: 20px; font-weight: bold;">+</span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

// Composant pour gérer les événements de la carte
const MapEventHandler = ({ addMarkerEnabled, onAddMarker, onMapReady }) => {
  const map = useMap();

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  useMapEvents({
    click(e) {
      if (addMarkerEnabled && onAddMarker) {
        onAddMarker(e.latlng);
      }
    }
  });

  return null;
};

// Composant pour ajuster la vue sur les signalements
const FitBoundsToMarkers = ({ reports }) => {
  const map = useMap();

  useEffect(() => {
    if (reports && reports.length > 0) {
      const validReports = reports.filter(r => r.latitude && r.longitude);
      
      if (validReports.length > 0) {
        const bounds = L.latLngBounds(
          validReports.map(r => [r.latitude, r.longitude])
        );
        
        // Ajouter un padding pour ne pas couper les marqueurs
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 15
        });
      }
    }
  }, [reports, map]);

  return null;
};

// Formater la date
const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Formater le budget
const formatBudget = (budget) => {
  if (!budget) return 'Non estimé';
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    maximumFractionDigits: 0
  }).format(budget);
};

// Obtenir le label du statut
const getStatusLabel = (status) => {
  const labels = {
    'nouveau': 'Nouveau',
    'en-cours': 'En cours',
    'termine': 'Terminé'
  };
  return labels[status] || status;
};

// Obtenir la couleur du badge de statut
const getStatusBadgeStyle = (status) => {
  const styles = {
    'nouveau': 'background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca;',
    'en-cours': 'background-color: #fffbeb; color: #d97706; border: 1px solid #fde68a;',
    'termine': 'background-color: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'
  };
  return styles[status] || 'background-color: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb;';
};

// Obtenir le label du type
const getTypeLabel = (type) => {
  const types = {
    'nid-de-poule': '🕳️ Nid-de-poule',
    'fissure': '🔀 Fissure',
    'effondrement': '⚠️ Effondrement',
    'inondation': '🌊 Inondation',
    'autre': '📍 Autre'
  };
  return types[type] || type;
};

// Composant pour afficher les images dans le popup
const PopupImageGallery = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!images || images.length === 0) return null;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(2, 1fr)',
        gap: '6px'
      }}>
        {images.slice(0, 4).map((img, index) => (
          <div
            key={index}
            style={{
              position: 'relative',
              paddingBottom: images.length === 1 ? '60%' : '75%',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              overflow: 'hidden',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedImage(img)}
          >
            <img
              src={img.url || img}
              alt={`Photo ${index + 1}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            {index === 3 && images.length > 4 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                +{images.length - 4}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Lightbox simple */}
      {selectedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage.url || selectedImage}
            alt="Agrandissement"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
          <button
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setSelectedImage(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

// Composant Popup personnalisé
const ReportPopup = ({ report }) => {
  // Obtenir le nom du quartier
  const getQuartierName = () => {
    if (report.quartier) {
      const q = QUARTIERS.find(q => q.id === report.quartier);
      return q ? q.name : report.quartier;
    }
    return null;
  };

  // Obtenir le nom de l'arrondissement
  const getArrondissementName = () => {
    if (report.arrondissement) {
      const arr = ARRONDISSEMENTS[report.arrondissement];
      return arr ? arr.name : report.arrondissement;
    }
    return null;
  };

  const quartierName = getQuartierName();
  const arrondissementName = getArrondissementName();

  return (
    <div style={{ minWidth: '250px', maxWidth: '300px' }}>
      {/* En-tête */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
          {getTypeLabel(report.type)}
        </span>
        <span style={{
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          ...Object.fromEntries(
            getStatusBadgeStyle(report.status).split(';')
              .filter(s => s.trim())
              .map(s => {
                const [key, value] = s.split(':').map(x => x.trim());
                return [key.replace(/-([a-z])/g, g => g[1].toUpperCase()), value];
              })
          )
        }}>
          {getStatusLabel(report.status)}
        </span>
      </div>

      {/* Images */}
      <PopupImageGallery images={report.images} />

      {/* Description */}
      {report.description && (
        <p style={{ 
          fontSize: '13px', 
          color: '#475569', 
          marginBottom: '12px',
          lineHeight: '1.4'
        }}>
          {report.description}
        </p>
      )}

      {/* Localisation (Quartier/Arrondissement) */}
      {(quartierName || arrondissementName) && (
        <div style={{
          background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)',
          padding: '10px',
          borderRadius: '8px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>📍</span>
          <div>
            {quartierName && (
              <div style={{ fontWeight: '600', fontSize: '13px', color: '#4338ca' }}>
                {quartierName}
              </div>
            )}
            {arrondissementName && (
              <div style={{ fontSize: '11px', color: '#6366f1' }}>
                {arrondissementName}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Détails */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '8px',
        fontSize: '12px',
        marginBottom: '12px'
      }}>
        <div>
          <span style={{ color: '#94a3b8' }}>📅 Date:</span>
          <div style={{ color: '#334155', fontWeight: '500' }}>
            {formatDate(report.createdAt)}
          </div>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>📐 Surface:</span>
          <div style={{ color: '#334155', fontWeight: '500' }}>
            {report.surface ? `${report.surface} m²` : 'N/A'}
          </div>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>💰 Budget:</span>
          <div style={{ color: '#059669', fontWeight: '500' }}>
            {formatBudget(report.budget)}
          </div>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>🏢 Entreprise:</span>
          <div style={{ color: '#334155', fontWeight: '500' }}>
            {report.entreprise || 'Non assigné'}
          </div>
        </div>
      </div>

      {/* Coordonnées */}
      <div style={{
        background: '#f8fafc',
        padding: '8px',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#64748b'
      }}>
        🧭 GPS: {parseFloat(report.latitude)?.toFixed(6)}, {parseFloat(report.longitude)?.toFixed(6)}
      </div>
    </div>
  );
};

// Composant Tooltip au survol (aperçu rapide)
const HoverTooltip = ({ report }) => {
  const handleViewPhotos = (e) => {
    e.stopPropagation();
    // Ouvrir les photos dans un nouvel onglet ou modal
    if (report.images && report.images.length > 0) {
      const imageUrl = report.images[0].url || report.images[0];
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div style={{ minWidth: '150px', padding: '4px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '6px'
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e293b' }}>
          {getTypeLabel(report.type)}
        </span>
        <span style={{
          padding: '2px 6px',
          borderRadius: '8px',
          fontSize: '10px',
          fontWeight: '600',
          ...Object.fromEntries(
            getStatusBadgeStyle(report.status).split(';')
              .filter(s => s.trim())
              .map(s => {
                const [key, value] = s.split(':').map(x => x.trim());
                return [key.replace(/-([a-z])/g, g => g[1].toUpperCase()), value];
              })
          )
        }}>
          {getStatusLabel(report.status)}
        </span>
      </div>
      
      {/* Miniature image si disponible avec lien */}
      {report.images && report.images.length > 0 && (
        <div style={{ marginBottom: '6px' }}>
          <div style={{
            width: '100%',
            height: '60px',
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '4px',
            cursor: 'pointer',
            position: 'relative',
            backgroundColor: '#f1f5f9'
          }}
          onClick={handleViewPhotos}
          title="Cliquer pour agrandir">
            <img
              src={report.images[0].url || report.images[0]}
              alt="Aperçu"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '1px 4px',
              borderRadius: '4px',
              fontSize: '9px'
            }}>
              📷 {report.images.length}
            </div>
          </div>
          <button
            onClick={handleViewPhotos}
            style={{
              width: '100%',
              padding: '4px 8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            📷 Voir les photos ({report.images.length})
          </button>
        </div>
      )}
      
      {report.description && (
        <p style={{ 
          fontSize: '11px', 
          color: '#64748b', 
          marginBottom: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '180px'
        }}>
          {report.description}
        </p>
      )}
      
      <div style={{ 
        fontSize: '10px', 
        color: '#94a3b8',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>📅 {formatDate(report.createdAt).split(' ')[0]}</span>
        <span style={{ fontStyle: 'italic' }}>Cliquer pour détails</span>
      </div>
    </div>
  );
};

// Composant Marker avec survol
const HoverableMarker = ({ report, icon }) => {
  const markerRef = useRef(null);
  
  // Ouvrir le tooltip au survol
  const eventHandlers = useMemo(() => ({
    mouseover: () => {
      if (markerRef.current) {
        markerRef.current.openTooltip();
      }
    },
    mouseout: () => {
      if (markerRef.current) {
        markerRef.current.closeTooltip();
      }
    }
  }), []);

  return (
    <Marker
      ref={markerRef}
      position={[report.latitude, report.longitude]}
      icon={icon}
      eventHandlers={eventHandlers}
    >
      {/* Tooltip au survol */}
      <Tooltip 
        direction="top" 
        offset={[0, -30]} 
        opacity={1}
        className="custom-tooltip"
      >
        <HoverTooltip report={report} />
      </Tooltip>
      
      {/* Popup au clic */}
      <Popup maxWidth={350} className="custom-popup">
        <ReportPopup report={report} />
      </Popup>
    </Marker>
  );
};

// Composant principal RoadMap
export default function RoadMap({ 
  reports = [], 
  onAddMarker, 
  addMarkerEnabled = false,
  showFitBounds = true,
  height = '100%'
}) {
  const [tempMarker, setTempMarker] = useState(null);
  // Utiliser OpenStreetMap online (tuiles offline non disponibles)
  const [useOfflineTiles, setUseOfflineTiles] = useState(false);
  const [tileServerChecked, setTileServerChecked] = useState(true);
  const mapRef = useRef(null);

  // Centre de la carte (Antananarivo)
  const defaultCenter = [-18.8769, 47.5333];
  const defaultZoom = 12;

  // Mode online - tuiles OpenStreetMap
  useEffect(() => {
    console.log('🗺️ Mode online - Utilisation des tuiles OpenStreetMap');
  }, []);

  // Configuration des tuiles selon le mode
  const tileConfig = useMemo(() => {
    return useOfflineTiles ? TILE_CONFIG.offline : TILE_CONFIG.online;
  }, [useOfflineTiles]);

  // Gérer le clic pour ajouter un marqueur temporaire
  const handleMapClick = useCallback((latlng) => {
    if (addMarkerEnabled) {
      setTempMarker(latlng);
      if (onAddMarker) {
        onAddMarker(latlng);
      }
    }
  }, [addMarkerEnabled, onAddMarker]);

  // Réinitialiser le marqueur temporaire quand le mode ajout est désactivé
  useEffect(() => {
    if (!addMarkerEnabled) {
      setTempMarker(null);
    }
  }, [addMarkerEnabled]);

  // Mémoriser les icônes pour éviter les recréations inutiles
  const markerIcons = useMemo(() => ({
    'nouveau': createCustomIcon('nouveau'),
    'en-cours': createCustomIcon('en-cours'),
    'termine': createCustomIcon('termine'),
    'default': createCustomIcon('default')
  }), []);

  // Callback pour récupérer la référence de la carte
  const handleMapReady = useCallback((map) => {
    mapRef.current = map;
  }, []);

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      {/* Indicateur mode offline/online */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        zIndex: 1000,
        background: useOfflineTiles ? '#10b981' : '#3b82f6',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        {useOfflineTiles ? '📴 Offline' : '🌐 Online'}
      </div>

      {/* Légende */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '12px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}>
          Légende
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: '#ef4444' 
            }}></div>
            <span>Nouveau</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: '#f59e0b' 
            }}></div>
            <span>En cours</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: '#22c55e' 
            }}></div>
            <span>Terminé</span>
          </div>
        </div>
      </div>

      {/* Indicateur mode ajout */}
      {addMarkerEnabled && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          fontSize: '14px',
          fontWeight: '600',
          animation: 'pulse 2s infinite'
        }}>
          📍 Cliquez sur la carte pour placer un signalement
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        className="rounded-lg shadow-lg"
      >
        <TileLayer
          url={tileConfig.url}
          attribution={tileConfig.attribution}
          maxZoom={tileConfig.maxZoom}
          minZoom={tileConfig.minZoom}
          errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />
        
        {/* Gestionnaire d'événements */}
        <MapEventHandler 
          addMarkerEnabled={addMarkerEnabled} 
          onAddMarker={handleMapClick}
          onMapReady={handleMapReady}
        />

        {/* Ajuster la vue sur les signalements */}
        {showFitBounds && reports.length > 0 && (
          <FitBoundsToMarkers reports={reports} />
        )}

        {/* Marqueurs des signalements existants avec survol */}
        {reports.map((report) => {
          if (!report.latitude || !report.longitude) return null;
          
          return (
            <HoverableMarker
              key={report.id}
              report={report}
              icon={markerIcons[report.status] || markerIcons.default}
            />
          );
        })}

        {/* Marqueur temporaire pour l'ajout */}
        {tempMarker && (
          <Marker
            position={[tempMarker.lat, tempMarker.lng]}
            icon={addMarkerIcon}
          >
            <Popup>
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  📍 Nouveau signalement
                </p>
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  Position: {tempMarker.lat.toFixed(6)}, {tempMarker.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Styles CSS pour les animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .add-marker-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
        }
        
        .leaflet-popup-content {
          margin: 12px !important;
        }
        
        .leaflet-popup-tip {
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
        }
        
        /* Styles pour le tooltip au survol */
        .custom-tooltip .leaflet-tooltip-content-wrapper,
        .leaflet-tooltip {
          background: white !important;
          border: none !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15) !important;
          padding: 0 !important;
        }
        
        .leaflet-tooltip-top:before,
        .leaflet-tooltip-bottom:before,
        .leaflet-tooltip-left:before,
        .leaflet-tooltip-right:before {
          border-top-color: white !important;
        }
        
        .leaflet-tooltip {
          padding: 8px 10px !important;
          transition: opacity 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
}
