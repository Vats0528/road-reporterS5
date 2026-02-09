import React, { useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  MapPin,
  Calendar,
  DollarSign,
  Ruler,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';
import { QUARTIERS, ARRONDISSEMENTS } from '../data/quartiers';

// Liste des entreprises avec leurs IDs
const ENTREPRISES = {
  'ent1': 'Colas Madagascar',
  'ent2': 'Sogea Satom',
  'ent3': 'Razel-Bec',
  'ent4': 'Enterprise Locale BTP',
  'ent5': 'Madagascar Routes SA',
};

// Fonction pour obtenir le nom d'une entreprise à partir de son ID
const getEntrepriseName = (idOrName) => {
  if (!idOrName) return null;
  // Si c'est déjà un nom (pas dans la liste des IDs), le retourner
  if (!ENTREPRISES[idOrName]) return idOrName;
  // Sinon retourner le nom correspondant à l'ID
  return ENTREPRISES[idOrName];
};

/**
 * Dashboard de statistiques avancées pour le Manager
 */
export default function AdvancedStats({ reports = [] }) {
  // Calculs statistiques
  const stats = useMemo(() => {
    if (!reports.length) return null;

    // Statistiques de base
    const total = reports.length;
    const nouveau = reports.filter(r => r.status === 'nouveau').length;
    const enCours = reports.filter(r => r.status === 'en-cours' || r.status === 'en_cours').length;
    const termine = reports.filter(r => r.status === 'termine').length;

    // Budget et surface (conversion explicite en nombres)
    const totalBudget = reports.reduce((sum, r) => {
      const val = Number(r.budget) || 0;
      return sum + val;
    }, 0);
    const totalSurface = reports.reduce((sum, r) => {
      const val = Number(r.surface) || 0;
      return sum + val;
    }, 0);
    const avgBudget = total > 0 ? totalBudget / total : 0;
    const avgSurface = total > 0 ? totalSurface / total : 0;

    // Par type
    const byType = {};
    reports.forEach(r => {
      byType[r.type] = (byType[r.type] || 0) + 1;
    });

    // Par arrondissement - avec stats détaillées
    const byArrondissement = {};
    reports.forEach(r => {
      // Extraire l'arrondissement du quartier si pas défini
      let arr = r.arrondissement;
      if (!arr && r.quartier) {
        const quartier = QUARTIERS.find(q => q.id === r.quartier);
        arr = quartier?.arrondissement;
      }
      if (arr) {
        if (!byArrondissement[arr]) {
          byArrondissement[arr] = { total: 0, nouveau: 0, enCours: 0, termine: 0, budget: 0, surface: 0 };
        }
        byArrondissement[arr].total++;
        byArrondissement[arr].budget += Number(r.budget) || 0;
        byArrondissement[arr].surface += Number(r.surface) || 0;
        if (r.status === 'nouveau') byArrondissement[arr].nouveau++;
        else if (r.status === 'en-cours' || r.status === 'en_cours') byArrondissement[arr].enCours++;
        else if (r.status === 'termine') byArrondissement[arr].termine++;
      }
    });

    // Par quartier (top 10)
    const byQuartier = {};
    reports.forEach(r => {
      if (r.quartier) {
        byQuartier[r.quartier] = (byQuartier[r.quartier] || 0) + 1;
      }
    });

    // Tendances par mois (6 derniers mois) avec stats détaillées
    const monthlyTrend = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend[key] = { total: 0, nouveau: 0, enCours: 0, termine: 0, budget: 0 };
    }

    reports.forEach(r => {
      // Support snake_case et camelCase
      const createdAt = r.created_at || r.createdAt;
      if (createdAt) {
        const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
        if (!isNaN(date.getTime())) {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyTrend[key]) {
            monthlyTrend[key].total++;
            monthlyTrend[key].budget += Number(r.budget) || 0;
            if (r.status === 'nouveau') monthlyTrend[key].nouveau++;
            else if (r.status === 'en-cours' || r.status === 'en_cours') monthlyTrend[key].enCours++;
            else if (r.status === 'termine') monthlyTrend[key].termine++;
          }
        }
      }
    });

    // Entreprises les plus actives - convertir les IDs en noms
    const byEntreprise = {};
    reports.forEach(r => {
      const entrepriseId = r.entreprise_id || r.entreprise;
      if (entrepriseId) {
        const entrepriseName = getEntrepriseName(entrepriseId);
        if (entrepriseName) {
          if (!byEntreprise[entrepriseName]) {
            byEntreprise[entrepriseName] = { total: 0, termine: 0, budget: 0 };
          }
          byEntreprise[entrepriseName].total++;
          byEntreprise[entrepriseName].budget += Number(r.budget) || 0;
          if (r.status === 'termine') {
            byEntreprise[entrepriseName].termine++;
          }
        }
      }
    });

    // Taux de résolution
    const resolutionRate = total > 0 ? Math.round((termine / total) * 100) : 0;

    // Délai moyen de résolution (jours) - calculé dynamiquement
    // Utiliser completed_at si disponible, sinon updated_at
    const resolvedReports = reports.filter(r => r.status === 'termine');
    let avgResolutionDays = 0;
    if (resolvedReports.length > 0) {
      let totalDays = 0;
      let validCount = 0;
      resolvedReports.forEach(r => {
        // Support snake_case et camelCase
        const createdAt = r.created_at || r.createdAt;
        const completedAt = r.completed_at || r.completedAt || r.updated_at || r.updatedAt;
        
        if (createdAt && completedAt) {
          const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
          const completed = completedAt instanceof Date ? completedAt : new Date(completedAt);
          
          if (!isNaN(created.getTime()) && !isNaN(completed.getTime())) {
            const days = Math.max(0, (completed - created) / (1000 * 60 * 60 * 24));
            // Ignorer les délais anormalement longs (> 365 jours) qui sont des erreurs de données
            if (days <= 365) {
              totalDays += days;
              validCount++;
            }
          }
        }
      });
      avgResolutionDays = validCount > 0 ? Math.round(totalDays / validCount) : 0;
    }

    // Délai moyen pour les signalements en cours (depuis combien de temps ils attendent)
    const inProgressReports = reports.filter(r => r.status === 'en-cours' || r.status === 'en_cours');
    let avgInProgressDays = 0;
    if (inProgressReports.length > 0) {
      let totalDays = 0;
      let validCount = 0;
      const today = new Date();
      inProgressReports.forEach(r => {
        const createdAt = r.created_at || r.createdAt;
        if (createdAt) {
          const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
          if (!isNaN(created.getTime())) {
            const days = Math.max(0, (today - created) / (1000 * 60 * 60 * 24));
            if (days <= 365) {
              totalDays += days;
              validCount++;
            }
          }
        }
      });
      avgInProgressDays = validCount > 0 ? Math.round(totalDays / validCount) : 0;
    }

    return {
      total,
      nouveau,
      enCours,
      termine,
      totalBudget,
      totalSurface,
      avgBudget,
      avgSurface,
      byType,
      byArrondissement,
      byQuartier,
      monthlyTrend,
      byEntreprise,
      resolutionRate,
      avgResolutionDays,
      avgInProgressDays
    };
  }, [reports]);

  if (!stats) {
    return (
      <div className="card text-center py-12">
        <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Aucune donnée disponible</p>
      </div>
    );
  }

  const formatBudget = (budget) => {
    if (budget >= 1000000000) {
      return (budget / 1000000000).toFixed(1) + ' Mrd';
    } else if (budget >= 1000000) {
      return (budget / 1000000).toFixed(1) + ' M';
    } else if (budget >= 1000) {
      return (budget / 1000).toFixed(0) + ' K';
    }
    return budget.toLocaleString();
  };

  const TYPE_LABELS = {
    'nid-de-poule': { label: 'Nid de poule', emoji: '🕳️', color: 'bg-amber-500' },
    'fissure': { label: 'Fissure', emoji: '🔀', color: 'bg-orange-500' },
    'effondrement': { label: 'Effondrement', emoji: '⚠️', color: 'bg-red-500' },
    'inondation': { label: 'Inondation', emoji: '🌊', color: 'bg-blue-500' },
    'autre': { label: 'Autre', emoji: '📍', color: 'bg-slate-500' }
  };

  return (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taux de résolution */}
        <div className="card bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium uppercase">Taux de résolution</p>
              <p className="text-3xl font-bold mt-1">{stats.resolutionRate}%</p>
              <p className="text-emerald-200 text-xs mt-1">
                {stats.termine} sur {stats.total}
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <CheckCircle className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Délai moyen - amélioré */}
        <div className="card bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium uppercase">Délai moyen résolution</p>
              <p className="text-3xl font-bold mt-1">{stats.avgResolutionDays}j</p>
              <p className="text-blue-200 text-xs mt-1">
                En cours: ~{stats.avgInProgressDays}j
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <Clock className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Budget total */}
        <div className="card bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs font-medium uppercase">Budget total</p>
              <p className="text-3xl font-bold mt-1">{formatBudget(stats.totalBudget)}</p>
              <p className="text-orange-200 text-xs mt-1">
                MGA estimé
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <DollarSign className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Surface totale */}
        <div className="card bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs font-medium uppercase">Surface totale</p>
              <p className="text-3xl font-bold mt-1">{stats.totalSurface.toLocaleString()}</p>
              <p className="text-purple-200 text-xs mt-1">
                m² à traiter
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <Ruler className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par type */}
        <div className="card">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-orange-500" />
            Répartition par type
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const typeInfo = TYPE_LABELS[type] || { label: type, emoji: '📍', color: 'bg-slate-500' };
                const percentage = Math.round((count / stats.total) * 100);
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">
                        {typeInfo.emoji} {typeInfo.label}
                      </span>
                      <span className="text-sm text-slate-500">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${typeInfo.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Répartition par arrondissement - amélioré */}
        <div className="card">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            Répartition par arrondissement
          </h3>
          {Object.keys(stats.byArrondissement).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(stats.byArrondissement)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([arr, data]) => {
                  const arrInfo = ARRONDISSEMENTS.find(a => a.id === Number(arr)) || ARRONDISSEMENTS[Number(arr) - 1];
                  const percentage = Math.round((data.total / stats.total) * 100);
                  const tauxResolution = data.total > 0 ? Math.round((data.termine / data.total) * 100) : 0;
                  return (
                    <div key={arr} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-700">
                          {arrInfo?.name || `Arrondissement ${arr}`}
                        </span>
                        <span className="text-sm font-bold" style={{ color: arrInfo?.color || '#6366f1' }}>
                          {data.total} signalements
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: arrInfo?.color || '#6366f1'
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>🔴 {data.nouveau} new</span>
                        <span>🟡 {data.enCours} en cours</span>
                        <span>🟢 {data.termine} terminés</span>
                        <span className="font-medium">Taux: {tauxResolution}%</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <MapPin className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Pas de données de localisation</p>
            </div>
          )}
        </div>
      </div>

      {/* Tendances mensuelles - amélioré */}
      <div className="card">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-500" />
          Tendances des 6 derniers mois
        </h3>
        <div className="flex items-end justify-between gap-3 h-48">
          {Object.entries(stats.monthlyTrend).map(([month, data]) => {
            const maxVal = Math.max(...Object.values(stats.monthlyTrend).map(d => d.total), 1);
            const heightPercent = (data.total / maxVal) * 100;
            const monthName = new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short' });
            const yearNum = month.split('-')[0];
            
            return (
              <div key={month} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end h-36">
                  <span className="text-xs font-bold text-slate-700 mb-1">{data.total}</span>
                  <div 
                    className="w-full max-w-14 rounded-t overflow-hidden flex flex-col-reverse"
                    style={{ height: `${Math.max(heightPercent, 8)}%`, minHeight: '20px' }}
                  >
                    {/* Terminés - vert */}
                    {data.termine > 0 && (
                      <div 
                        className="bg-emerald-500 w-full transition-all"
                        style={{ height: `${(data.termine / Math.max(data.total, 1)) * 100}%` }}
                        title={`${data.termine} terminés`}
                      />
                    )}
                    {/* En cours - orange */}
                    {data.enCours > 0 && (
                      <div 
                        className="bg-amber-500 w-full transition-all"
                        style={{ height: `${(data.enCours / Math.max(data.total, 1)) * 100}%` }}
                        title={`${data.enCours} en cours`}
                      />
                    )}
                    {/* Nouveaux - rouge */}
                    {data.nouveau > 0 && (
                      <div 
                        className="bg-red-500 w-full transition-all"
                        style={{ height: `${(data.nouveau / Math.max(data.total, 1)) * 100}%` }}
                        title={`${data.nouveau} nouveaux`}
                      />
                    )}
                    {/* Si aucune donnée */}
                    {data.total === 0 && (
                      <div className="bg-slate-200 w-full h-full" />
                    )}
                  </div>
                </div>
                <div className="text-center mt-2">
                  <span className="text-xs font-medium text-slate-600 capitalize">{monthName}</span>
                  <span className="text-xs text-slate-400 block">{yearNum}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-500 rounded" /> Nouveaux
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-amber-500 rounded" /> En cours
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-emerald-500 rounded" /> Terminés
          </span>
        </div>
        {/* Résumé mensuel */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-500">Moyenne/mois</p>
              <p className="text-lg font-bold text-slate-700">
                {Math.round(Object.values(stats.monthlyTrend).reduce((s, d) => s + d.total, 0) / 6)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Mois le plus actif</p>
              <p className="text-lg font-bold text-orange-600">
                {(() => {
                  const entries = Object.entries(stats.monthlyTrend);
                  const max = entries.reduce((a, b) => b[1].total > a[1].total ? b : a);
                  return new Date(max[0] + '-01').toLocaleDateString('fr-FR', { month: 'short' });
                })()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Taux résolution moyen</p>
              <p className="text-lg font-bold text-emerald-600">
                {(() => {
                  const data = Object.values(stats.monthlyTrend);
                  const totalAll = data.reduce((s, d) => s + d.total, 0);
                  const termineTot = data.reduce((s, d) => s + d.termine, 0);
                  return totalAll > 0 ? Math.round((termineTot / totalAll) * 100) : 0;
                })()}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Entreprises */}
      {Object.keys(stats.byEntreprise).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Performance des entreprises
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                  <th className="pb-3 font-semibold">Entreprise</th>
                  <th className="pb-3 font-semibold text-center">Assignés</th>
                  <th className="pb-3 font-semibold text-center">Terminés</th>
                  <th className="pb-3 font-semibold text-center">Taux</th>
                  <th className="pb-3 font-semibold text-right">Budget géré</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(stats.byEntreprise)
                  .sort((a, b) => b[1].total - a[1].total)
                  .slice(0, 5)
                  .map(([name, data]) => {
                    const rate = Math.round((data.termine / data.total) * 100);
                    return (
                      <tr key={name} className="text-sm">
                        <td className="py-3 font-medium text-slate-800">{name}</td>
                        <td className="py-3 text-center text-slate-600">{data.total}</td>
                        <td className="py-3 text-center text-emerald-600 font-medium">{data.termine}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rate >= 70 ? 'bg-emerald-100 text-emerald-700' :
                            rate >= 40 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {rate}%
                          </span>
                        </td>
                        <td className="py-3 text-right text-slate-600">
                          {formatBudget(data.budget)} MGA
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top quartiers problématiques */}
      {Object.keys(stats.byQuartier).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Quartiers les plus signalés
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(stats.byQuartier)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([quartierId, count], index) => {
                const quartier = QUARTIERS.find(q => q.id === quartierId);
                const arrondissement = ARRONDISSEMENTS[quartier?.arrondissement];
                return (
                  <div 
                    key={quartierId}
                    className={`p-4 rounded-lg border-2 text-center ${
                      index === 0 ? 'border-red-300 bg-red-50' :
                      index === 1 ? 'border-orange-300 bg-orange-50' :
                      'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${
                      index === 0 ? 'text-red-600' :
                      index === 1 ? 'text-orange-600' :
                      'text-slate-600'
                    }`}>
                      {count}
                    </div>
                    <div className="text-sm font-medium text-slate-800 mt-1">
                      {quartier?.name || quartierId}
                    </div>
                    {arrondissement && (
                      <div className="text-xs text-slate-500">
                        {arrondissement.name}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Mini-widget de statistiques
 */
export function MiniStats({ reports = [] }) {
  const stats = useMemo(() => {
    const total = reports.length;
    const nouveau = reports.filter(r => r.status === 'nouveau').length;
    const enCours = reports.filter(r => r.status === 'en-cours').length;
    const termine = reports.filter(r => r.status === 'termine').length;
    
    return { total, nouveau, enCours, termine };
  }, [reports]);

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 bg-red-500 rounded-full" />
        {stats.nouveau} nouveaux
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 bg-amber-500 rounded-full" />
        {stats.enCours} en cours
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
        {stats.termine} terminés
      </span>
    </div>
  );
}
