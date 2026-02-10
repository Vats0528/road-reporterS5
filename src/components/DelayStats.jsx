import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Building2, Wrench, Calendar, AlertCircle, RefreshCw } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

/**
 * Composant de statistiques des délais de traitement
 */
export default function DelayStats() {
  const [stats, setStats] = useState(null);
  const [byType, setByType] = useState([]);
  const [byEntreprise, setByEntreprise] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/stats/delays`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setByType(data.byType || []);
        setByEntreprise(data.byEntreprise || []);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatDays = (days) => {
    if (days === null || days === undefined) return '-';
    if (days < 1) return '< 1 jour';
    return `${days} jour${days > 1 ? 's' : ''}`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-MG', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(amount) + ' MGA';
  };

  const formatSurface = (surface) => {
    if (!surface) return '-';
    return `${parseFloat(surface).toFixed(1)} m²`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 text-blue-500 animate-spin mr-2" />
        <span>Chargement des statistiques...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Erreur: {error}</span>
        </div>
        <button 
          onClick={loadStats}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <Clock className="h-6 w-6 mr-2 text-blue-600" />
          Statistiques des Délais de Traitement
        </h2>
        <button 
          onClick={loadStats}
          className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Actualiser
        </button>
      </div>

      {/* Cartes de délais moyens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Délai d'assignation</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatDays(stats?.avg_days_to_assign)}
              </p>
              <p className="text-xs text-gray-400">Création → Assignation</p>
            </div>
            <Calendar className="h-8 w-8 text-yellow-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Délai de démarrage</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatDays(stats?.avg_days_to_start)}
              </p>
              <p className="text-xs text-gray-400">Assignation → Démarrage</p>
            </div>
            <Wrench className="h-8 w-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Durée des travaux</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatDays(stats?.avg_days_to_complete)}
              </p>
              <p className="text-xs text-gray-400">Démarrage → Fin</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Délai total moyen</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatDays(stats?.avg_total_days)}
              </p>
              <p className="text-xs text-gray-400">Création → Fin</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Volumes</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Total signalements</span>
              <span className="font-bold">{stats?.total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Terminés</span>
              <span className="font-bold text-green-600">{stats?.completed || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">En cours</span>
              <span className="font-bold text-blue-600">{stats?.in_progress || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nouveaux</span>
              <span className="font-bold text-yellow-600">{stats?.new || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Budgets</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Budget total</span>
              <span className="font-bold">{formatCurrency(stats?.total_budget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Budget moyen</span>
              <span className="font-bold">{formatCurrency(stats?.avg_budget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Surface totale</span>
              <span className="font-bold">{formatSurface(stats?.total_surface)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Niveau moyen</span>
              <span className="font-bold">{stats?.avg_niveau || '-'} / 10</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Taux d'achèvement</span>
              <span className="font-bold text-green-600">
                {stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Surface moyenne</span>
              <span className="font-bold">{formatSurface(stats?.avg_surface)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau par type de dégradation */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-700 flex items-center">
            <Wrench className="h-5 w-5 mr-2" />
            Par Type de Dégradation
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Niveau Moy.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Surface</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Budget</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Délai Moy.</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {byType.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{row.count}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{row.avg_niveau || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatSurface(row.total_surface)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(row.total_budget)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatDays(row.avg_days)}</td>
                </tr>
              ))}
              {byType.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-3 text-sm text-gray-500 text-center">
                    Aucune donnée disponible
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tableau par entreprise */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-700 flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Par Entreprise
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entreprise</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Chantiers</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Surface Totale</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Budget Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Durée Moy. Travaux</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {byEntreprise.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.entreprise_name || 'Non assigné'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{row.count}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatSurface(row.total_surface)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(row.total_budget)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatDays(row.avg_days_work)}</td>
                </tr>
              ))}
              {byEntreprise.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-3 text-sm text-gray-500 text-center">
                    Aucune donnée disponible
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
