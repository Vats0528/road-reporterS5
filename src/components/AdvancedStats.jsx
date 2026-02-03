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
    const enCours = reports.filter(r => r.status === 'en-cours').length;
    const termine = reports.filter(r => r.status === 'termine').length;

    // Budget et surface
    const totalBudget = reports.reduce((sum, r) => sum + (r.budget || 0), 0);
    const totalSurface = reports.reduce((sum, r) => sum + (r.surface || 0), 0);
    const avgBudget = total > 0 ? totalBudget / total : 0;
    const avgSurface = total > 0 ? totalSurface / total : 0;

    // Par type
    const byType = {};
    reports.forEach(r => {
      byType[r.type] = (byType[r.type] || 0) + 1;
    });

    // Par arrondissement
    const byArrondissement = {};
    reports.forEach(r => {
      if (r.arrondissement) {
        byArrondissement[r.arrondissement] = (byArrondissement[r.arrondissement] || 0) + 1;
      }
    });

    // Par quartier (top 10)
    const byQuartier = {};
    reports.forEach(r => {
      if (r.quartier) {
        byQuartier[r.quartier] = (byQuartier[r.quartier] || 0) + 1;
      }
    });

    // Tendances par mois (6 derniers mois)
    const monthlyTrend = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend[key] = { total: 0, termine: 0 };
    }

    reports.forEach(r => {
      if (r.createdAt) {
        const date = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyTrend[key]) {
          monthlyTrend[key].total++;
          if (r.status === 'termine') {
            monthlyTrend[key].termine++;
          }
        }
      }
    });

    // Entreprises les plus actives
    const byEntreprise = {};
    reports.forEach(r => {
      if (r.entreprise) {
        if (!byEntreprise[r.entreprise]) {
          byEntreprise[r.entreprise] = { total: 0, termine: 0, budget: 0 };
        }
        byEntreprise[r.entreprise].total++;
        byEntreprise[r.entreprise].budget += r.budget || 0;
        if (r.status === 'termine') {
          byEntreprise[r.entreprise].termine++;
        }
      }
    });

    // Taux de résolution
    const resolutionRate = total > 0 ? Math.round((termine / total) * 100) : 0;

    // Délai moyen de résolution (jours)
    const resolvedReports = reports.filter(r => r.status === 'termine' && r.createdAt && r.updatedAt);
    let avgResolutionDays = 0;
    if (resolvedReports.length > 0) {
      const totalDays = resolvedReports.reduce((sum, r) => {
        const created = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
        const updated = r.updatedAt instanceof Date ? r.updatedAt : new Date(r.updatedAt);
        return sum + Math.max(0, (updated - created) / (1000 * 60 * 60 * 24));
      }, 0);
      avgResolutionDays = Math.round(totalDays / resolvedReports.length);
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
      avgResolutionDays
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

        {/* Délai moyen */}
        <div className="card bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium uppercase">Délai moyen</p>
              <p className="text-3xl font-bold mt-1">{stats.avgResolutionDays}j</p>
              <p className="text-blue-200 text-xs mt-1">
                pour résoudre
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

        {/* Répartition par arrondissement */}
        <div className="card">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            Par arrondissement
          </h3>
          {Object.keys(stats.byArrondissement).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.byArrondissement)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([arr, count]) => {
                  const arrInfo = ARRONDISSEMENTS[arr];
                  const percentage = Math.round((count / stats.total) * 100);
                  return (
                    <div key={arr}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          {arrInfo?.name || arr}
                        </span>
                        <span className="text-sm text-slate-500">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="h-full rounded-full"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: arrInfo?.color || '#6366f1'
                          }}
                        />
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

      {/* Tendances mensuelles */}
      <div className="card">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-500" />
          Tendances des 6 derniers mois
        </h3>
        <div className="flex items-end justify-between gap-2 h-40">
          {Object.entries(stats.monthlyTrend).map(([month, data]) => {
            const maxVal = Math.max(...Object.values(stats.monthlyTrend).map(d => d.total), 1);
            const heightPercent = (data.total / maxVal) * 100;
            const terminePct = data.total > 0 ? (data.termine / data.total) * 100 : 0;
            const monthName = new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short' });
            
            return (
              <div key={month} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end h-32">
                  <span className="text-xs font-medium text-slate-600 mb-1">{data.total}</span>
                  <div 
                    className="w-full max-w-12 bg-slate-200 rounded-t relative overflow-hidden"
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                  >
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-emerald-500"
                      style={{ height: `${terminePct}%` }}
                    />
                    <div 
                      className="absolute top-0 left-0 right-0 bg-orange-400"
                      style={{ height: `${100 - terminePct}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-500 mt-2 capitalize">{monthName}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-orange-400 rounded" /> Non terminés
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-emerald-500 rounded" /> Terminés
          </span>
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
