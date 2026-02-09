import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import RoadMap from '../components/RoadMap';
import SummaryTable from '../components/SummaryTable';
import SearchFilters from '../components/SearchFilters';
import { getAllReports, getReportsStats } from '../services/localDbService';
import { usePermissions } from '../hooks/usePermissions';
import { MapPin, LogIn, UserPlus, RefreshCw, Eye, Lock } from 'lucide-react';

/**
 * Page publique pour les visiteurs (non connectés)
 * Permet de visualiser la carte et les statistiques en lecture seule
 */
const PublicMapPage = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isVisitor, canCreateReport } = usePermissions();

  // Callback pour les résultats filtrés
  const handleFilteredResults = useCallback((filtered) => {
    setFilteredReports(filtered);
    setStats(getReportsStats(filtered));
  }, []);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getAllReports();
      
      if (result.error) {
        setError(result.error);
      } else {
        setReports(result.reports || []);
        setFilteredReports(result.reports || []);
        setStats(getReportsStats(result.reports || []));
      }
    } catch (err) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display font-bold text-slate-800 mb-2 flex items-center gap-3">
                <MapPin className="h-10 w-10 text-orange-500" />
                Carte des Signalements
              </h1>
              <p className="text-slate-600">
                Visualisez tous les signalements de problèmes routiers à Antananarivo
              </p>
            </div>
            
            {/* Indicateur mode visiteur */}
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl">
              <Eye className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">Mode lecture seule</span>
            </div>
          </div>
        </div>

        {/* Message pour les visiteurs */}
        {isVisitor && (
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                <Lock className="h-6 w-6 text-orange-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-800">
                    Connectez-vous pour signaler un problème
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    En tant que visiteur, vous pouvez uniquement consulter la carte et les statistiques.
                    Créez un compte ou connectez-vous pour signaler des problèmes routiers.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Link
                  to="/login"
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <LogIn className="h-4 w-4" />
                  Se connecter
                </Link>
                <Link
                  to="/register"
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <UserPlus className="h-4 w-4" />
                  S'inscrire
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <button
            onClick={loadReports}
            disabled={loading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>

        {/* Recherche et Filtres */}
        <SearchFilters 
          reports={reports}
          onFilteredResults={handleFilteredResults}
          showAdvanced={true}
          className="mb-6"
        />

        {/* Erreur */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Carte */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="card h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-slate-600">Chargement de la carte...</p>
                </div>
              </div>
            ) : (
              <div className="h-[600px]">
                <RoadMap
                  reports={filteredReports}
                  addMarkerEnabled={false}
                  showFitBounds={true}
                />
              </div>
            )}
          </div>

          {/* Statistiques */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {loading ? (
                <div className="card flex items-center justify-center py-12">
                  <div className="spinner"></div>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Statistiques en temps réel
                    </p>
                  </div>
                  <SummaryTable stats={stats} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Section d'appel à l'action */}
        <div className="mt-12 text-center">
          <div className="card bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <h2 className="text-2xl font-bold mb-3">
              Participez à l'amélioration des routes d'Antananarivo
            </h2>
            <p className="text-orange-100 mb-6 max-w-2xl mx-auto">
              Rejoignez notre communauté et aidez à identifier les problèmes routiers 
              pour une ville plus sûre et mieux entretenue.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white text-orange-600 font-semibold px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <UserPlus className="h-5 w-5" />
                Créer un compte gratuit
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicMapPage;
