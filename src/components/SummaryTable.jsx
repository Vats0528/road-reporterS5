import React from 'react';
import { Trash2, Eye, TrendingUp, MapPin, Clock, CheckCircle, AlertCircle, DollarSign, Ruler } from 'lucide-react';

// Composant pour afficher les statistiques
const StatsDisplay = ({ stats }) => {
  const {
    total = 0,
    nouveau = 0,
    enCours = 0,
    termine = 0,
    totalSurface = 0,
    totalBudget = 0,
    avancement = 0
  } = stats || {};

  const formatBudget = (budget) => {
    if (!budget) return '0 MGA';
    return new Intl.NumberFormat('fr-MG', {
      maximumFractionDigits: 0
    }).format(budget) + ' MGA';
  };

  return (
    <div className="space-y-4">
      {/* Carte principale - Total */}
      <div className="card bg-gradient-to-br from-orange-500 to-red-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm font-medium">Total signalements</p>
            <p className="text-4xl font-bold mt-1">{total}</p>
          </div>
          <MapPin className="h-12 w-12 text-orange-200 opacity-80" />
        </div>
      </div>

      {/* Grille des statuts */}
      <div className="grid grid-cols-3 gap-3">
        {/* Nouveaux */}
        <div className="card bg-red-50 border border-red-200 p-4">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
            <p className="text-2xl font-bold text-red-600">{nouveau}</p>
            <p className="text-xs text-red-500 font-medium">Nouveaux</p>
          </div>
        </div>

        {/* En cours */}
        <div className="card bg-amber-50 border border-amber-200 p-4">
          <div className="flex flex-col items-center text-center">
            <Clock className="h-6 w-6 text-amber-500 mb-2" />
            <p className="text-2xl font-bold text-amber-600">{enCours}</p>
            <p className="text-xs text-amber-500 font-medium">En cours</p>
          </div>
        </div>

        {/* Terminés */}
        <div className="card bg-emerald-50 border border-emerald-200 p-4">
          <div className="flex flex-col items-center text-center">
            <CheckCircle className="h-6 w-6 text-emerald-500 mb-2" />
            <p className="text-2xl font-bold text-emerald-600">{termine}</p>
            <p className="text-xs text-emerald-500 font-medium">Terminés</p>
          </div>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            Progression globale
          </span>
          <span className="text-lg font-bold text-orange-600">{avancement}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${avancement}%`,
              background: 'linear-gradient(90deg, #f97316 0%, #22c55e 100%)'
            }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Surface et Budget */}
      <div className="grid grid-cols-2 gap-3">
        {/* Surface totale */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Ruler className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Surface totale</p>
              <p className="text-lg font-bold text-slate-800">
                {totalSurface.toFixed(1)} m²
              </p>
            </div>
          </div>
        </div>

        {/* Budget total */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Budget total</p>
              <p className="text-lg font-bold text-emerald-600">
                {formatBudget(totalBudget)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="text-center text-xs text-slate-400 pt-2">
        Dernière mise à jour : {new Date().toLocaleTimeString('fr-FR')}
      </div>
    </div>
  );
};

// Composant pour afficher la liste des signalements
const ReportsTable = ({ reports, isManager = false }) => {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTypeLabel = (type) => {
    const types = {
      'nid-de-poule': 'Nid-de-poule',
      'fissure': 'Fissure',
      'effondrement': 'Effondrement',
      'inondation': 'Inondation',
      'autre': 'Autre'
    };
    return types[type] || type;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'nouveau': 'Nouveau',
      'en-cours': 'En cours',
      'termine': 'Terminé'
    };
    return labels[status] || status;
  };

  return (
    <div className="card overflow-x-auto">
      <h3 className="text-lg font-bold text-slate-800 mb-4">
        Liste des signalements ({reports.length})
      </h3>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 font-semibold text-slate-900">Date</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-900">Type</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-900">Description</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-900">Statut</th>
            {isManager && (
              <th className="text-left py-3 px-4 font-semibold text-slate-900">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="py-3 px-4 text-slate-600 text-sm">
                {formatDate(report.createdAt)}
              </td>
              <td className="py-3 px-4 text-slate-600 text-sm">
                {getTypeLabel(report.type)}
              </td>
              <td className="py-3 px-4 text-slate-600 truncate max-w-xs text-sm">
                {report.description || 'Aucune description'}
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                  ${report.status === 'nouveau' 
                    ? 'bg-red-100 text-red-700 border border-red-200' 
                    : report.status === 'en-cours'
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : report.status === 'termine'
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {getStatusLabel(report.status)}
                </span>
              </td>
              {isManager && (
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye size={16} />
                    </button>
                    <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Composant principal qui gère les deux cas
export default function SummaryTable({ stats, reports = [], isManager = false }) {
  // Si stats est fourni, afficher les statistiques
  if (stats) {
    return <StatsDisplay stats={stats} />;
  }

  // Sinon, afficher la table des signalements
  if (!reports || reports.length === 0) {
    return (
      <div className="card text-center py-12">
        <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 text-lg font-medium">
          Aucun signalement pour le moment
        </p>
        <p className="text-slate-400 mt-2 text-sm">
          Vos signalements apparaîtront ici une fois créés.
        </p>
      </div>
    );
  }

  return <ReportsTable reports={reports} isManager={isManager} />;
}
