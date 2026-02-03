import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Calendar, 
  MapPin, 
  ChevronDown, 
  ChevronUp,
  RotateCcw,
  SlidersHorizontal,
  Building2
} from 'lucide-react';
import { REPORT_TYPE_LABELS, REPORT_STATUS_LABELS } from '../utils/constants';
import { ARRONDISSEMENTS, QUARTIERS, getQuartiersByArrondissement } from '../data/quartiers';

/**
 * Composant de recherche et filtres avancés pour les signalements
 */
export default function SearchFilters({ 
  reports = [], 
  onFilteredResults, 
  showAdvanced = true,
  className = '' 
}) {
  // États des filtres
  const [searchText, setSearchText] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [budgetRange, setBudgetRange] = useState({ min: '', max: '' });
  const [surfaceRange, setSurfaceRange] = useState({ min: '', max: '' });
  const [selectedEntreprise, setSelectedEntreprise] = useState('');
  const [selectedArrondissement, setSelectedArrondissement] = useState('');
  const [selectedQuartier, setSelectedQuartier] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Liste des entreprises uniques
  const entreprises = useMemo(() => {
    const list = [...new Set(reports.filter(r => r.entreprise).map(r => r.entreprise))];
    return list.sort();
  }, [reports]);

  // Quartiers filtrés par arrondissement sélectionné
  const filteredQuartiers = useMemo(() => {
    if (selectedArrondissement) {
      return getQuartiersByArrondissement(selectedArrondissement);
    }
    return QUARTIERS;
  }, [selectedArrondissement]);

  // Fonction de filtrage
  const filterReports = useCallback(() => {
    let filtered = [...reports];

    // Recherche textuelle (description, type, entreprise)
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(report => {
        const description = (report.description || '').toLowerCase();
        const type = (report.type || '').toLowerCase();
        const typeLabel = (REPORT_TYPE_LABELS[report.type] || '').toLowerCase();
        const entreprise = (report.entreprise || '').toLowerCase();
        const id = (report.id || '').toLowerCase();
        
        return description.includes(searchLower) ||
               type.includes(searchLower) ||
               typeLabel.includes(searchLower) ||
               entreprise.includes(searchLower) ||
               id.includes(searchLower);
      });
    }

    // Filtre par type
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(report => selectedTypes.includes(report.type));
    }

    // Filtre par statut
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(report => selectedStatuses.includes(report.status));
    }

    // Filtre par date de création
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(report => {
        const reportDate = report.createdAt instanceof Date 
          ? report.createdAt 
          : new Date(report.createdAt);
        return reportDate >= startDate;
      });
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(report => {
        const reportDate = report.createdAt instanceof Date 
          ? report.createdAt 
          : new Date(report.createdAt);
        return reportDate <= endDate;
      });
    }

    // Filtre par budget
    if (budgetRange.min) {
      filtered = filtered.filter(report => 
        report.budget && report.budget >= parseFloat(budgetRange.min)
      );
    }
    if (budgetRange.max) {
      filtered = filtered.filter(report => 
        report.budget && report.budget <= parseFloat(budgetRange.max)
      );
    }

    // Filtre par surface
    if (surfaceRange.min) {
      filtered = filtered.filter(report => 
        report.surface && report.surface >= parseFloat(surfaceRange.min)
      );
    }
    if (surfaceRange.max) {
      filtered = filtered.filter(report => 
        report.surface && report.surface <= parseFloat(surfaceRange.max)
      );
    }

    // Filtre par entreprise
    if (selectedEntreprise) {
      filtered = filtered.filter(report => report.entreprise === selectedEntreprise);
    }

    // Filtre par arrondissement
    if (selectedArrondissement) {
      filtered = filtered.filter(report => report.arrondissement === selectedArrondissement);
    }

    // Filtre par quartier
    if (selectedQuartier) {
      filtered = filtered.filter(report => report.quartier === selectedQuartier);
    }

    return filtered;
  }, [reports, searchText, selectedTypes, selectedStatuses, dateRange, budgetRange, surfaceRange, selectedEntreprise, selectedArrondissement, selectedQuartier]);

  // Appliquer les filtres quand ils changent
  useEffect(() => {
    const filtered = filterReports();
    if (onFilteredResults) {
      onFilteredResults(filtered);
    }
  }, [filterReports, onFilteredResults]);

  // Réinitialiser tous les filtres
  const resetFilters = () => {
    setSearchText('');
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setDateRange({ start: '', end: '' });
    setBudgetRange({ min: '', max: '' });
    setSurfaceRange({ min: '', max: '' });
    setSelectedEntreprise('');
    setSelectedArrondissement('');
    setSelectedQuartier('');
  };

  // Toggle pour les types
  const toggleType = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Toggle pour les statuts
  const toggleStatus = (status) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = searchText || 
    selectedTypes.length > 0 || 
    selectedStatuses.length > 0 || 
    dateRange.start || 
    dateRange.end ||
    budgetRange.min ||
    budgetRange.max ||
    surfaceRange.min ||
    surfaceRange.max ||
    selectedEntreprise ||
    selectedArrondissement ||
    selectedQuartier;

  const filteredCount = filterReports().length;

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-slate-200 ${className}`}>
      {/* Barre de recherche principale */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Champ de recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Rechercher par description, type, entreprise..."
              className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            )}
          </div>

          {/* Bouton filtres avancés */}
          {showAdvanced && (
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className="h-5 w-5" />
              <span className="hidden sm:inline">Filtres</span>
              {hasActiveFilters && (
                <span className="bg-white text-orange-500 text-xs font-bold px-2 py-0.5 rounded-full">
                  {selectedTypes.length + selectedStatuses.length + (dateRange.start ? 1 : 0) + (dateRange.end ? 1 : 0) + (selectedEntreprise ? 1 : 0)}
                </span>
              )}
              {showAdvancedFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Résumé des résultats */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-slate-600">
            <span className="font-semibold text-slate-800">{filteredCount}</span> signalement{filteredCount !== 1 ? 's' : ''} trouvé{filteredCount !== 1 ? 's' : ''}
            {hasActiveFilters && (
              <span className="text-slate-500"> (sur {reports.length} au total)</span>
            )}
          </span>
          
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Filtres avancés */}
      {showAdvanced && showAdvancedFilters && (
        <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
          {/* Filtres par type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Type de problème
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => toggleType(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedTypes.includes(value)
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-white text-slate-700 border border-slate-300 hover:border-orange-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtres par statut */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Statut
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => {
                const colors = {
                  'nouveau': 'bg-red-500',
                  'en-cours': 'bg-amber-500',
                  'termine': 'bg-emerald-500'
                };
                return (
                  <button
                    key={value}
                    onClick={() => toggleStatus(value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedStatuses.includes(value)
                        ? `${colors[value]} text-white shadow-md`
                        : 'bg-white text-slate-700 border border-slate-300 hover:border-orange-400'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      selectedStatuses.includes(value) ? 'bg-white' : colors[value]
                    }`} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtres par date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Période
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Du</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Au</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Filtres par budget et surface */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Budget */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                💰 Budget estimé (MGA)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Min</label>
                  <input
                    type="number"
                    value={budgetRange.min}
                    onChange={(e) => setBudgetRange(prev => ({ ...prev, min: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Max</label>
                  <input
                    type="number"
                    value={budgetRange.max}
                    onChange={(e) => setBudgetRange(prev => ({ ...prev, max: e.target.value }))}
                    placeholder="∞"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Surface */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                📐 Surface (m²)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Min</label>
                  <input
                    type="number"
                    value={surfaceRange.min}
                    onChange={(e) => setSurfaceRange(prev => ({ ...prev, min: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Max</label>
                  <input
                    type="number"
                    value={surfaceRange.max}
                    onChange={(e) => setSurfaceRange(prev => ({ ...prev, max: e.target.value }))}
                    placeholder="∞"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filtre par entreprise */}
          {entreprises.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🏢 Entreprise assignée
              </label>
              <select
                value={selectedEntreprise}
                onChange={(e) => setSelectedEntreprise(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              >
                <option value="">Toutes les entreprises</option>
                {entreprises.map(ent => (
                  <option key={ent} value={ent}>{ent}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtre par localisation */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Localisation
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Arrondissement */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Arrondissement</label>
                <select
                  value={selectedArrondissement}
                  onChange={(e) => {
                    setSelectedArrondissement(e.target.value);
                    setSelectedQuartier(''); // Reset quartier when arrondissement changes
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                >
                  <option value="">Tous les arrondissements</option>
                  {Object.entries(ARRONDISSEMENTS).map(([key, arr]) => (
                    <option key={key} value={key}>{arr.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Quartier */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Quartier</label>
                <select
                  value={selectedQuartier}
                  onChange={(e) => setSelectedQuartier(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                >
                  <option value="">Tous les quartiers</option>
                  {filteredQuartiers.map(q => (
                    <option key={q.id} value={q.id}>{q.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tags des filtres actifs */}
      {hasActiveFilters && (
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {selectedTypes.map(type => (
            <span
              key={type}
              className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium"
            >
              {REPORT_TYPE_LABELS[type]}
              <button onClick={() => toggleType(type)} className="hover:bg-orange-200 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedStatuses.map(status => (
            <span
              key={status}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
            >
              {REPORT_STATUS_LABELS[status]}
              <button onClick={() => toggleStatus(status)} className="hover:bg-blue-200 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {dateRange.start && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              Depuis {dateRange.start}
              <button onClick={() => setDateRange(prev => ({ ...prev, start: '' }))} className="hover:bg-purple-200 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {dateRange.end && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              Jusqu'au {dateRange.end}
              <button onClick={() => setDateRange(prev => ({ ...prev, end: '' }))} className="hover:bg-purple-200 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedEntreprise && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
              {selectedEntreprise}
              <button onClick={() => setSelectedEntreprise('')} className="hover:bg-emerald-200 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedArrondissement && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
              <Building2 className="h-3 w-3" />
              {ARRONDISSEMENTS[selectedArrondissement]?.name}
              <button onClick={() => { setSelectedArrondissement(''); setSelectedQuartier(''); }} className="hover:bg-indigo-200 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedQuartier && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">
              <MapPin className="h-3 w-3" />
              {QUARTIERS.find(q => q.id === selectedQuartier)?.name}
              <button onClick={() => setSelectedQuartier('')} className="hover:bg-pink-200 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Barre de recherche simple (version compacte)
 */
export function SimpleSearchBar({ 
  value, 
  onChange, 
  placeholder = "Rechercher...",
  className = '' 
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="h-4 w-4 text-slate-400" />
        </button>
      )}
    </div>
  );
}

/**
 * Chips de filtres rapides par statut
 */
export function StatusFilterChips({ 
  selectedStatus, 
  onChange,
  counts = {},
  className = '' 
}) {
  const statuses = [
    { value: 'all', label: 'Tous', color: 'slate' },
    { value: 'nouveau', label: 'Nouveaux', color: 'red' },
    { value: 'en-cours', label: 'En cours', color: 'amber' },
    { value: 'termine', label: 'Terminés', color: 'emerald' }
  ];

  const colorClasses = {
    slate: { active: 'bg-slate-600 text-white', inactive: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
    red: { active: 'bg-red-500 text-white', inactive: 'bg-red-50 text-red-700 hover:bg-red-100' },
    amber: { active: 'bg-amber-500 text-white', inactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
    emerald: { active: 'bg-emerald-500 text-white', inactive: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {statuses.map(status => (
        <button
          key={status.value}
          onClick={() => onChange(status.value)}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            selectedStatus === status.value
              ? colorClasses[status.color].active
              : colorClasses[status.color].inactive
          }`}
        >
          {status.label}
          {counts[status.value] !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              selectedStatus === status.value
                ? 'bg-white/20'
                : 'bg-slate-200'
            }`}>
              {counts[status.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
