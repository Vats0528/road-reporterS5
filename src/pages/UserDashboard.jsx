import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import RoadMap from '../components/RoadMap';
import SummaryTable from '../components/SummaryTable';
import ReportForm from '../components/ReportForm';
import SearchFilters from '../components/SearchFilters';
import { getUserReports, getAllReports, getReportsStats } from '../services/localDbService';
import { PlusCircle, Filter, RefreshCw, User, Globe, List } from 'lucide-react';

const UserDashboard = () => {
  const { currentUser, userData } = useAuth();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showMyReports, setShowMyReports] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [addMarkerMode, setAddMarkerMode] = useState(false);

  // Callback pour les résultats filtrés
  const handleFilteredResults = useCallback((filtered) => {
    setFilteredReports(filtered);
    setStats(getReportsStats(filtered));
  }, []);

  useEffect(() => {
    // Attendre que currentUser soit disponible avant de charger
    if (currentUser) {
      loadReports();
    }
  }, [showMyReports, currentUser]);

  const loadReports = async () => {
    setLoading(true);
    
    let result;
    if (showMyReports && currentUser?.uid) {
      console.log('Chargement des signalements pour userId:', currentUser.uid, 'email:', currentUser.email);
      result = await getUserReports(currentUser.uid, currentUser.email);
      console.log('Résultat getUserReports:', result);
    } else {
      result = await getAllReports();
    }
    
    if (!result.error && result.reports) {
      setReports(result.reports);
      setFilteredReports(result.reports);
      setStats(getReportsStats(result.reports));
    }
    setLoading(false);
  };

  const handleAddMarker = (latlng) => {
    setSelectedPosition(latlng);
    setShowReportForm(true);
    setAddMarkerMode(false);
  };

  const handleReportCreated = () => {
    loadReports();
    setSelectedPosition(null);
    setShowReportForm(false);
  };

  const toggleAddMarkerMode = () => {
    setAddMarkerMode(!addMarkerMode);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-slate-800 mb-2">
            Tableau de bord
          </h1>
          <p className="text-slate-600">
            Bienvenue, <span className="font-semibold text-orange-600">{userData?.displayName}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <button
            onClick={toggleAddMarkerMode}
            className={`btn-primary flex items-center space-x-2 ${
              addMarkerMode ? 'ring-4 ring-orange-300' : ''
            }`}
          >
            <PlusCircle className="h-5 w-5" />
            <span>{addMarkerMode ? 'Cliquez sur la carte' : 'Nouveau signalement'}</span>
          </button>

          {/* Toggle Mes signalements / Tous les signalements */}
          <div className="flex rounded-lg overflow-hidden border border-slate-300 shadow-sm">
            <button
              onClick={() => setShowMyReports(true)}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-all ${
                showMyReports 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Mes signalements</span>
            </button>
            <button
              onClick={() => setShowMyReports(false)}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-all ${
                !showMyReports 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>Tous les signalements</span>
            </button>
          </div>

          <button
            onClick={loadReports}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Actualiser</span>
          </button>
        </div>

        {addMarkerMode && (
          <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
            <p className="text-sm text-orange-800 font-medium">
              🗺️ Mode ajout activé : Cliquez sur la carte pour placer un signalement
            </p>
          </div>
        )}

        {/* Recherche et Filtres */}
        <SearchFilters 
          reports={reports}
          onFilteredResults={handleFilteredResults}
          showAdvanced={true}
          className="mb-6"
        />

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Carte */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="card h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-slate-600">Chargement...</p>
                </div>
              </div>
            ) : (
              <div className="h-[600px]">
                <RoadMap
                  reports={filteredReports}
                  onAddMarker={handleAddMarker}
                  addMarkerEnabled={addMarkerMode}
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
                  {/* Indicateur du type d'affichage */}
                  <div className={`mb-4 p-4 border rounded-xl ${
                    showMyReports 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {showMyReports ? (
                        <>
                          <User className="h-5 w-5 text-blue-600" />
                          <p className="text-sm text-blue-800 font-semibold">
                            Mes signalements ({reports.length})
                          </p>
                        </>
                      ) : (
                        <>
                          <Globe className="h-5 w-5 text-emerald-600" />
                          <p className="text-sm text-emerald-800 font-semibold">
                            Tous les signalements ({reports.length})
                          </p>
                        </>
                      )}
                    </div>
                    {showMyReports && reports.length === 0 && (
                      <p className="text-xs text-blue-600 mt-2">
                        Vous n'avez pas encore créé de signalement. Cliquez sur "Nouveau signalement" pour commencer.
                      </p>
                    )}
                  </div>
                  <SummaryTable stats={stats} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire de signalement */}
      {showReportForm && (
        <ReportForm
          selectedPosition={selectedPosition}
          onClose={() => {
            setShowReportForm(false);
            setSelectedPosition(null);
          }}
          onReportCreated={handleReportCreated}
        />
      )}
    </div>
  );
};

export default UserDashboard;