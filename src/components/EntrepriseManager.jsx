import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Star,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Calendar,
  Eye,
  DollarSign,
  Ruler,
  Clock,
  AlertCircle
} from 'lucide-react';
import { REPORT_TYPE_LABELS } from '../utils/constants';

// Liste des entreprises prédéfinies avec plus de détails
const DEFAULT_ENTREPRISES = [
  { id: 'ent1', name: 'Colas Madagascar', contact: '+261 20 22 123 45', email: 'contact@colas.mg', specialite: 'Travaux routiers', rating: 4.5 },
  { id: 'ent2', name: 'Sogea Satom', contact: '+261 20 22 234 56', email: 'info@sogea-satom.mg', specialite: 'Infrastructure', rating: 4.2 },
  { id: 'ent3', name: 'Razel-Bec', contact: '+261 20 22 345 67', email: 'razel@orange.mg', specialite: 'BTP & Génie civil', rating: 4.0 },
  { id: 'ent4', name: 'Enterprise Locale BTP', contact: '+261 20 22 456 78', email: 'contact@localbtp.mg', specialite: 'BTP Local', rating: 3.8 },
  { id: 'ent5', name: 'Madagascar Routes SA', contact: '+261 20 22 567 89', email: 'info@mdgroutes.mg', specialite: 'Travaux publics', rating: 4.3 },
];

/**
 * Composant de gestion des entreprises
 */
export default function EntrepriseManager({ reports = [], onAssignEntreprise }) {
  const [entreprises, setEntreprises] = useState(DEFAULT_ENTREPRISES);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedEntreprise, setExpandedEntreprise] = useState(null);
  const [sortBy, setSortBy] = useState('budget'); // 'budget', 'total', 'rate'
  const [newEntreprise, setNewEntreprise] = useState({
    name: '',
    contact: '',
    email: '',
    specialite: ''
  });

  // Statistiques par entreprise - calcul dynamique
  const entrepriseStats = useMemo(() => {
    const stats = {};
    
    // Initialiser les stats pour chaque entreprise
    entreprises.forEach(e => {
      stats[e.id] = {
        total: 0,
        nouveau: 0,
        enCours: 0,
        termine: 0,
        totalBudget: 0,
        totalSurface: 0,
        reports: []
      };
    });
    
    reports.forEach(report => {
      // Trouver l'entreprise assignée (par id ou par nom)
      const entrepriseId = report.entreprise_id || report.entreprise;
      if (entrepriseId && stats[entrepriseId]) {
        const status = (report.status || 'nouveau').toLowerCase();
        stats[entrepriseId].total++;
        stats[entrepriseId].totalBudget += Number(report.budget) || 0;
        stats[entrepriseId].totalSurface += Number(report.surface) || 0;
        stats[entrepriseId].reports.push(report);
        
        if (status === 'nouveau' || status === 'nouveaux') {
          stats[entrepriseId].nouveau++;
        } else if (status === 'en-cours' || status === 'en_cours') {
          stats[entrepriseId].enCours++;
        } else if (status === 'termine' || status === 'terminé') {
          stats[entrepriseId].termine++;
        }
      }
    });

    return stats;
  }, [reports, entreprises]);

  // Signalements par entreprise
  const getReportsByEntreprise = (entrepriseId) => {
    return entrepriseStats[entrepriseId]?.reports || [];
  };

  // Formater la date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Obtenir la couleur du statut
  const getStatusColor = (status) => {
    switch(status) {
      case 'nouveau': return 'bg-red-100 text-red-700 border-red-200';
      case 'en-cours': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'termine': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Obtenir le label du statut
  const getStatusLabel = (status) => {
    switch(status) {
      case 'nouveau': return 'Nouveau';
      case 'en-cours': return 'En cours';
      case 'termine': return 'Terminé';
      default: return status;
    }
  };

  // Filtrer les entreprises
  const filteredEntreprises = useMemo(() => {
    if (!searchTerm.trim()) return entreprises;
    const term = searchTerm.toLowerCase();
    return entreprises.filter(e => 
      e.name.toLowerCase().includes(term) ||
      e.specialite?.toLowerCase().includes(term)
    );
  }, [entreprises, searchTerm]);

  // Ajouter une entreprise
  const handleAddEntreprise = () => {
    if (!newEntreprise.name.trim()) return;

    const newEntry = {
      id: Date.now().toString(),
      ...newEntreprise,
      rating: 0
    };

    setEntreprises([...entreprises, newEntry]);
    setNewEntreprise({ name: '', contact: '', email: '', specialite: '' });
    setShowAddForm(false);
  };

  // Supprimer une entreprise
  const handleDeleteEntreprise = (id) => {
    setEntreprises(entreprises.filter(e => e.id !== id));
  };

  // Formater le budget
  const formatBudget = (budget) => {
    if (budget >= 1000000) {
      return (budget / 1000000).toFixed(1) + ' M';
    } else if (budget >= 1000) {
      return (budget / 1000).toFixed(0) + ' K';
    }
    return budget.toLocaleString();
  };

  // Calculer le taux de complétion
  const getCompletionRate = (entrepriseId) => {
    const stats = entrepriseStats[entrepriseId];
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.termine / stats.total) * 100);
  };

  // Trier les entreprises
  const sortedEntreprises = useMemo(() => {
    let filtered = [...entreprises];
    
    // Filtrer par recherche
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(term) ||
        e.specialite?.toLowerCase().includes(term)
      );
    }
    
    // Trier
    filtered.sort((a, b) => {
      const statsA = entrepriseStats[a.id] || { total: 0, totalBudget: 0, termine: 0 };
      const statsB = entrepriseStats[b.id] || { total: 0, totalBudget: 0, termine: 0 };
      
      if (sortBy === 'budget') {
        return statsB.totalBudget - statsA.totalBudget;
      } else if (sortBy === 'total') {
        return statsB.total - statsA.total;
      } else if (sortBy === 'rate') {
        const rateA = statsA.total > 0 ? (statsA.termine / statsA.total) : 0;
        const rateB = statsB.total > 0 ? (statsB.termine / statsB.total) : 0;
        return rateB - rateA;
      }
      return 0;
    });
    
    return filtered;
  }, [entreprises, searchTerm, sortBy, entrepriseStats]);

  // Calcul des totaux globaux
  const globalStats = useMemo(() => {
    let totalBudget = 0;
    let totalAssigned = 0;
    let totalTermine = 0;
    
    Object.values(entrepriseStats).forEach(stats => {
      totalBudget += stats.totalBudget;
      totalAssigned += stats.total;
      totalTermine += stats.termine;
    });
    
    return {
      totalBudget,
      totalAssigned,
      totalTermine,
      avgRate: totalAssigned > 0 ? Math.round((totalTermine / totalAssigned) * 100) : 0
    };
  }, [entrepriseStats]);

  return (
    <div className="space-y-6">
      {/* Stats globales des entreprises */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium">Entreprises actives</p>
              <p className="text-2xl font-bold mt-1">{entreprises.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-200" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium">Budget total géré</p>
              <p className="text-2xl font-bold mt-1">{formatBudget(globalStats.totalBudget)}</p>
              <p className="text-emerald-200 text-xs">MGA</p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-200" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs font-medium">Travaux assignés</p>
              <p className="text-2xl font-bold mt-1">{globalStats.totalAssigned}</p>
              <p className="text-orange-200 text-xs">{globalStats.totalTermine} terminés</p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-200" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs font-medium">Taux complétion moyen</p>
              <p className="text-2xl font-bold mt-1">{globalStats.avgRate}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-500" />
            Gestion des Entreprises
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {entreprises.length} entreprises enregistrées
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Tri */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="budget">Trier par budget</option>
            <option value="total">Trier par travaux</option>
            <option value="rate">Trier par performance</option>
          </select>

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
            />
          </div>

          {/* Bouton ajouter */}
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="card bg-blue-50 border-2 border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-4">Nouvelle entreprise</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              value={newEntreprise.name}
              onChange={(e) => setNewEntreprise({ ...newEntreprise, name: e.target.value })}
              placeholder="Nom de l'entreprise *"
              className="input-field"
            />
            <input
              type="text"
              value={newEntreprise.contact}
              onChange={(e) => setNewEntreprise({ ...newEntreprise, contact: e.target.value })}
              placeholder="Téléphone"
              className="input-field"
            />
            <input
              type="email"
              value={newEntreprise.email}
              onChange={(e) => setNewEntreprise({ ...newEntreprise, email: e.target.value })}
              placeholder="Email"
              className="input-field"
            />
            <input
              type="text"
              value={newEntreprise.specialite}
              onChange={(e) => setNewEntreprise({ ...newEntreprise, specialite: e.target.value })}
              placeholder="Spécialité"
              className="input-field"
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleAddEntreprise}
              disabled={!newEntreprise.name.trim()}
              className="btn-primary"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Liste des entreprises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedEntreprises.map(entreprise => {
          const stats = entrepriseStats[entreprise.id] || { total: 0, nouveau: 0, enCours: 0, termine: 0, totalBudget: 0, totalSurface: 0 };
          const completionRate = getCompletionRate(entreprise.id);

          return (
            <div
              key={entreprise.id}
              className={`card hover:shadow-lg transition-shadow ${stats.total > 0 ? 'border-l-4 border-l-blue-500' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{entreprise.name}</h3>
                    {entreprise.specialite && (
                      <p className="text-sm text-slate-500">{entreprise.specialite}</p>
                    )}
                    {/* Rating */}
                    {entreprise.rating > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < Math.floor(entreprise.rating)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-slate-500 ml-1">
                          ({entreprise.rating})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingId(editingId === entreprise.id ? null : entreprise.id)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntreprise(entreprise.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Contact */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {entreprise.contact && (
                  <span className="flex items-center gap-1 text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {entreprise.contact}
                  </span>
                )}
                {entreprise.email && (
                  <span className="flex items-center gap-1 text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {entreprise.email}
                  </span>
                )}
              </div>

              {/* Statistiques */}
              {stats.total > 0 ? (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      Performance
                    </span>
                    <span className={`text-sm font-bold ${
                      completionRate >= 70 ? 'text-emerald-600' :
                      completionRate >= 40 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {completionRate}% terminés
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-full rounded-full ${
                        completionRate >= 70 ? 'bg-emerald-500' :
                        completionRate >= 40 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="font-bold text-slate-800">{stats.total}</p>
                      <p className="text-slate-500">Total</p>
                    </div>
                    <div className="bg-red-50 p-2 rounded">
                      <p className="font-bold text-red-600">{stats.nouveau || 0}</p>
                      <p className="text-red-500">Nouveaux</p>
                    </div>
                    <div className="bg-amber-50 p-2 rounded">
                      <p className="font-bold text-amber-600">{stats.enCours || 0}</p>
                      <p className="text-amber-500">En cours</p>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded">
                      <p className="font-bold text-emerald-600">{stats.termine || 0}</p>
                      <p className="text-emerald-500">Terminés</p>
                    </div>
                  </div>

                  {/* Budget et Surface */}
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="text-xs text-emerald-600">Budget géré</p>
                        <p className="font-bold text-emerald-700">{formatBudget(stats.totalBudget)} MGA</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <Ruler className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-blue-600">Surface totale</p>
                        <p className="font-bold text-blue-700">{stats.totalSurface.toFixed(0)} m²</p>
                      </div>
                    </div>
                  </div>

                  {/* Bouton pour voir les travaux assignés */}
                  <button
                    onClick={() => setExpandedEntreprise(
                      expandedEntreprise === entreprise.id ? null : entreprise.id
                    )}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    Voir les travaux assignés ({stats.total})
                    {expandedEntreprise === entreprise.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-slate-200 text-center py-4">
                  <p className="text-slate-400 text-sm">Aucun travail assigné</p>
                </div>
              )}

              {/* Liste des travaux assignés (expansible) */}
              {expandedEntreprise === entreprise.id && stats.total > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    Travaux assignés à {entreprise.name}
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getReportsByEntreprise(entreprise.id).map(report => (
                      <div
                        key={report.id}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-800">
                                {REPORT_TYPE_LABELS[report.type] || report.type}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(report.status)}`}>
                                {getStatusLabel(report.status)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 truncate">
                              {report.description || 'Pas de description'}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(report.created_at || report.createdAt)}
                              </span>
                              {report.quartier && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {report.quartier}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {report.budget && (
                              <p className="text-sm font-semibold text-emerald-600">
                                {formatBudget(Number(report.budget))} MGA
                              </p>
                            )}
                            {report.surface && (
                              <p className="text-xs text-slate-500">
                                {report.surface} m²
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bouton assigner */}
              {onAssignEntreprise && (
                <button
                  onClick={() => onAssignEntreprise(entreprise.id)}
                  className="mt-4 w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Sélectionner pour assignation
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Message si aucun résultat */}
      {sortedEntreprises.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucune entreprise trouvée</p>
        </div>
      )}
    </div>
  );
}

/**
 * Sélecteur d'entreprise (dropdown)
 */
export function EntrepriseSelector({ value, onChange, entreprises = DEFAULT_ENTREPRISES }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="input-field"
    >
      <option value="">Sélectionner une entreprise...</option>
      {entreprises.map(e => (
        <option key={e.id} value={e.name}>
          {e.name}
        </option>
      ))}
    </select>
  );
}

/**
 * Badge entreprise
 */
export function EntrepriseBadge({ name, showRemove = false, onRemove }) {
  if (!name) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
      <Building2 className="h-3 w-3" />
      {name}
      {showRemove && onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
        >
          <XCircle className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
