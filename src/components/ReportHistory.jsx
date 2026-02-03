import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Clock,
  User,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight,
  Eye,
  ArrowRight
} from 'lucide-react';

/**
 * Types d'actions pour l'historique
 */
export const HISTORY_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  STATUS_CHANGE: 'status_change',
  DELETE: 'delete',
  ASSIGN: 'assign'
};

/**
 * Labels et couleurs des actions
 */
const ACTION_CONFIG = {
  [HISTORY_ACTIONS.CREATE]: {
    label: 'Création',
    color: 'bg-emerald-100 text-emerald-700',
    icon: Plus,
    description: 'Nouveau signalement créé'
  },
  [HISTORY_ACTIONS.UPDATE]: {
    label: 'Modification',
    color: 'bg-blue-100 text-blue-700',
    icon: Edit,
    description: 'Signalement modifié'
  },
  [HISTORY_ACTIONS.STATUS_CHANGE]: {
    label: 'Changement de statut',
    color: 'bg-amber-100 text-amber-700',
    icon: RefreshCw,
    description: 'Statut mis à jour'
  },
  [HISTORY_ACTIONS.DELETE]: {
    label: 'Suppression',
    color: 'bg-red-100 text-red-700',
    icon: Trash2,
    description: 'Signalement supprimé'
  },
  [HISTORY_ACTIONS.ASSIGN]: {
    label: 'Assignation',
    color: 'bg-purple-100 text-purple-700',
    icon: User,
    description: 'Entreprise assignée'
  }
};

/**
 * Créer une entrée d'historique
 */
export const createHistoryEntry = (reportId, action, userId, userName, details = {}) => {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    reportId,
    action,
    userId,
    userName: userName || 'Utilisateur inconnu',
    timestamp: new Date().toISOString(),
    details
  };
};

/**
 * Composant d'affichage de l'historique
 */
export default function ReportHistory({ 
  history = [], 
  reportId = null,
  showFilters = true,
  maxItems = 50,
  compact = false
}) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState({});

  // Filtrer l'historique
  const filteredHistory = useMemo(() => {
    let filtered = reportId 
      ? history.filter(h => h.reportId === reportId)
      : history;

    if (filter !== 'all') {
      filtered = filtered.filter(h => h.action === filter);
    }

    return filtered
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, maxItems);
  }, [history, reportId, filter, maxItems]);

  // Grouper par date
  const groupedHistory = useMemo(() => {
    const groups = {};
    
    filteredHistory.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    return groups;
  }, [filteredHistory]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleExpanded = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {filteredHistory.slice(0, 5).map(entry => {
          const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG[HISTORY_ACTIONS.UPDATE];
          const Icon = config.icon;

          return (
            <div
              key={entry.id}
              className="flex items-center gap-3 text-sm"
            >
              <div className={`p-1.5 rounded-full ${config.color}`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-700 truncate">
                  {config.label}
                  {entry.details?.field && ` - ${entry.details.field}`}
                </p>
                <p className="text-xs text-slate-400">
                  {entry.userName} • {formatTime(entry.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <History className="h-5 w-5 text-slate-500" />
          Historique des modifications
        </h3>
        
        {showFilters && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Toutes les actions</option>
              {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Liste groupée par date */}
      {Object.keys(groupedHistory).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedHistory).map(([date, entries]) => (
            <div key={date}>
              {/* En-tête de date */}
              <div className="flex items-center gap-3 mb-3">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-600">{date}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Entrées du jour */}
              <div className="space-y-2 ml-2">
                {entries.map(entry => {
                  const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG[HISTORY_ACTIONS.UPDATE];
                  const Icon = config.icon;
                  const isExpanded = expanded[entry.id];

                  return (
                    <div
                      key={entry.id}
                      className="relative"
                    >
                      {/* Ligne de connexion */}
                      <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-200" />
                      
                      <div className="flex gap-3">
                        {/* Icône */}
                        <div className={`relative z-10 p-2 rounded-full ${config.color} flex-shrink-0`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 pb-4">
                          <div
                            className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => entry.details && Object.keys(entry.details).length > 0 && toggleExpanded(entry.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-slate-800">
                                  {config.label}
                                </p>
                                <p className="text-sm text-slate-500 mt-0.5">
                                  {config.description}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-medium text-slate-600">
                                  {formatTime(entry.timestamp)}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {entry.userName}
                                </p>
                              </div>
                            </div>

                            {/* Détails (si expandable) */}
                            {entry.details && Object.keys(entry.details).length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-100">
                                <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  {isExpanded ? 'Masquer les détails' : 'Voir les détails'}
                                </button>

                                {isExpanded && (
                                  <div className="mt-2 space-y-1 text-sm">
                                    {entry.details.field && (
                                      <p className="text-slate-600">
                                        Champ: <span className="font-medium">{entry.details.field}</span>
                                      </p>
                                    )}
                                    {entry.details.oldValue !== undefined && (
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs">
                                          {String(entry.details.oldValue) || '(vide)'}
                                        </span>
                                        <ArrowRight className="h-3 w-3 text-slate-400" />
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs">
                                          {String(entry.details.newValue) || '(vide)'}
                                        </span>
                                      </div>
                                    )}
                                    {entry.details.description && (
                                      <p className="text-slate-500 italic">
                                        {entry.details.description}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucun historique disponible</p>
        </div>
      )}

      {/* Afficher plus */}
      {filteredHistory.length >= maxItems && (
        <div className="text-center">
          <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            Charger plus d'entrées...
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Hook pour gérer l'historique localement
 */
export function useLocalHistory(storageKey = 'roadreporter_history') {
  const [history, setHistory] = useState([]);

  // Charger depuis localStorage au montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  }, [storageKey]);

  // Sauvegarder dans localStorage
  const saveHistory = (newHistory) => {
    try {
      // Garder seulement les 500 dernières entrées
      const trimmed = newHistory.slice(-500);
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
      setHistory(trimmed);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'historique:', error);
    }
  };

  // Ajouter une entrée
  const addEntry = (reportId, action, userId, userName, details = {}) => {
    const entry = createHistoryEntry(reportId, action, userId, userName, details);
    saveHistory([...history, entry]);
    return entry;
  };

  // Obtenir l'historique d'un signalement
  const getReportHistory = (reportId) => {
    return history.filter(h => h.reportId === reportId);
  };

  // Effacer l'historique
  const clearHistory = () => {
    localStorage.removeItem(storageKey);
    setHistory([]);
  };

  return {
    history,
    addEntry,
    getReportHistory,
    clearHistory
  };
}

/**
 * Mini timeline pour affichage compact
 */
export function MiniTimeline({ history = [], maxItems = 3 }) {
  const recentHistory = history
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, maxItems);

  if (recentHistory.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic">Aucune activité récente</p>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {recentHistory.map((entry, index) => {
        const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG[HISTORY_ACTIONS.UPDATE];
        const Icon = config.icon;

        return (
          <div
            key={entry.id}
            className={`p-1 rounded-full ${config.color}`}
            title={`${config.label} - ${entry.userName}`}
          >
            <Icon className="h-3 w-3" />
          </div>
        );
      })}
      {history.length > maxItems && (
        <span className="text-xs text-slate-400 ml-1">
          +{history.length - maxItems}
        </span>
      )}
    </div>
  );
}
