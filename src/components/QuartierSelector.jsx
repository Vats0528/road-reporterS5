import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Search, ChevronDown, Check, X } from 'lucide-react';
import { 
  QUARTIERS, 
  ARRONDISSEMENTS, 
  getQuartiersForSelect, 
  searchQuartiers,
  findNearestQuartier,
  getLocationInfo 
} from '../data/quartiers';

/**
 * Sélecteur de quartier avec recherche
 */
export default function QuartierSelector({ 
  value, 
  onChange, 
  placeholder = "Sélectionner un quartier",
  showSearch = true,
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuartier, setSelectedQuartier] = useState(null);

  // Groupes de quartiers
  const groupedQuartiers = useMemo(() => getQuartiersForSelect(), []);

  // Quartiers filtrés par recherche
  const filteredQuartiers = useMemo(() => {
    if (!searchTerm) return null;
    return searchQuartiers(searchTerm);
  }, [searchTerm]);

  // Mettre à jour le quartier sélectionné quand la valeur change
  useEffect(() => {
    if (value) {
      const quartier = QUARTIERS.find(q => q.id === value);
      setSelectedQuartier(quartier);
    } else {
      setSelectedQuartier(null);
    }
  }, [value]);

  const handleSelect = (quartierId) => {
    onChange(quartierId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSelectedQuartier(null);
  };

  const getArrondissementColor = (arrId) => {
    const arr = ARRONDISSEMENTS.find(a => a.id === arrId);
    return arr?.color || '#6b7280';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bouton de sélection */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 rounded-lg border-2 text-left flex items-center gap-3
          transition-all duration-200
          ${disabled ? 'bg-slate-100 cursor-not-allowed' : 'bg-white hover:border-orange-400'}
          ${isOpen ? 'border-orange-500 ring-4 ring-orange-100' : 'border-slate-200'}
        `}
      >
        <MapPin className={`w-5 h-5 flex-shrink-0 ${selectedQuartier ? 'text-orange-500' : 'text-slate-400'}`} />
        
        <span className={`flex-1 ${selectedQuartier ? 'text-slate-800' : 'text-slate-400'}`}>
          {selectedQuartier ? selectedQuartier.name : placeholder}
        </span>

        {selectedQuartier && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-slate-100 rounded-full"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}

        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay pour fermer */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />

          {/* Menu déroulant */}
          <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-slide-up">
            {/* Recherche */}
            {showSearch && (
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher un quartier..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-orange-400"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Liste des quartiers */}
            <div className="max-h-64 overflow-y-auto">
              {filteredQuartiers ? (
                // Résultats de recherche
                filteredQuartiers.length > 0 ? (
                  <div className="py-2">
                    {filteredQuartiers.map(quartier => (
                      <QuartierOption
                        key={quartier.id}
                        quartier={quartier}
                        isSelected={value === quartier.id}
                        color={getArrondissementColor(quartier.arrondissement)}
                        onClick={() => handleSelect(quartier.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-sm">
                    Aucun quartier trouvé
                  </div>
                )
              ) : (
                // Groupes par arrondissement
                groupedQuartiers.map(group => (
                  <div key={group.label}>
                    <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide sticky top-0">
                      {group.label}
                    </div>
                    {group.options.map(option => {
                      const quartier = QUARTIERS.find(q => q.id === option.value);
                      return (
                        <QuartierOption
                          key={option.value}
                          quartier={quartier}
                          isSelected={value === option.value}
                          color={getArrondissementColor(quartier?.arrondissement)}
                          onClick={() => handleSelect(option.value)}
                        />
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Option de quartier dans le dropdown
 */
function QuartierOption({ quartier, isSelected, color, onClick }) {
  if (!quartier) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full px-4 py-2.5 flex items-center gap-3 text-left
        transition-colors
        ${isSelected ? 'bg-orange-50' : 'hover:bg-slate-50'}
      `}
    >
      <div 
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${isSelected ? 'text-orange-600' : 'text-slate-800'}`}>
          {quartier.name}
        </div>
        {quartier.description && (
          <div className="text-xs text-slate-500 truncate">
            {quartier.description}
          </div>
        )}
      </div>
      {isSelected && (
        <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
      )}
    </button>
  );
}

/**
 * Affichage du quartier détecté automatiquement
 */
export function LocationDisplay({ lat, lng, className = '' }) {
  const [locationInfo, setLocationInfo] = useState(null);

  useEffect(() => {
    if (lat && lng) {
      const info = getLocationInfo(lat, lng);
      setLocationInfo(info);
    }
  }, [lat, lng]);

  if (!locationInfo) return null;

  return (
    <div className={`flex items-start gap-3 p-3 bg-slate-50 rounded-lg ${className}`}>
      <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-800">
          {locationInfo.shortAddress}
        </div>
        <div className="text-sm text-slate-500">
          {locationInfo.arrondissement?.name}
        </div>
        {locationInfo.distance && (
          <div className="text-xs text-slate-400 mt-1">
            {locationInfo.isWithinQuartier 
              ? 'Dans le quartier'
              : `À ${locationInfo.distance.toFixed(1)} km du centre`
            }
          </div>
        )}
      </div>
      {!locationInfo.isWithinCity && (
        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
          Hors ville
        </span>
      )}
    </div>
  );
}

/**
 * Badge de quartier compact
 */
export function QuartierBadge({ quartierId, showArrondissement = false }) {
  const quartier = QUARTIERS.find(q => q.id === quartierId);
  
  if (!quartier) return null;

  const arrondissement = ARRONDISSEMENTS.find(a => a.id === quartier.arrondissement);

  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: `${arrondissement?.color}15`,
        color: arrondissement?.color
      }}
    >
      <span 
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: arrondissement?.color }}
      />
      {quartier.name}
      {showArrondissement && (
        <span className="text-slate-400">• {arrondissement?.name}</span>
      )}
    </span>
  );
}

/**
 * Carte miniature avec position du quartier
 */
export function QuartierMiniMap({ quartierId, size = 'md' }) {
  const quartier = QUARTIERS.find(q => q.id === quartierId);
  
  if (!quartier) return null;

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  // Calculer la position relative du quartier sur la mini-carte
  const bounds = {
    north: -18.82,
    south: -18.98,
    east: 47.58,
    west: 47.45
  };

  const x = ((quartier.center.lng - bounds.west) / (bounds.east - bounds.west)) * 100;
  const y = ((quartier.center.lat - bounds.north) / (bounds.south - bounds.north)) * 100;

  return (
    <div className={`${sizeClasses[size]} bg-slate-100 rounded-lg relative overflow-hidden`}>
      {/* Forme simple de la ville */}
      <div className="absolute inset-2 bg-slate-200 rounded opacity-50" />
      
      {/* Point du quartier */}
      <div 
        className="absolute w-3 h-3 bg-orange-500 rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${x}%`, top: `${y}%` }}
      >
        <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-75" />
      </div>
    </div>
  );
}
