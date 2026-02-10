import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import RoadMap from '../components/RoadMap';
import SummaryTable from '../components/SummaryTable';
import ImageGallery, { ImageThumbnailList } from '../components/ImageGallery';
import SearchFilters from '../components/SearchFilters';
import AdvancedStats from '../components/AdvancedStats';
import EntrepriseManager from '../components/EntrepriseManager';
import UserManager from '../components/UserManager';
import SyncButton from '../components/SyncButton';
import ReportHistory, { useLocalHistory, HISTORY_ACTIONS } from '../components/ReportHistory';
import DelayStats from '../components/DelayStats';
import PriceSettings from '../components/PriceSettings';
import { getAllReports, updateReport, updateReportStatus, deleteReport, getReportsStats } from '../services/localDbService';
import { downloadCSV, printReport, downloadJSON } from '../services/exportService';
import { validateReports, ValidationSummary } from '../services/validationService.jsx';
import { QUARTIERS, ARRONDISSEMENTS } from '../data/quartiers';
import { 
  RefreshCw, Edit, Save, X, Download, Trash2, AlertTriangle, Shield, Image, MapPin,
  FileText, BarChart3, Building2, History, CheckCircle, FileJson, Printer, Users,
  Clock, Settings
} from 'lucide-react';

// Liste des entreprises (à terme, à récupérer depuis la base)
const ENTREPRISES = [
  { id: 'ent1', name: 'Colas Madagascar' },
  { id: 'ent2', name: 'Sogea Satom' },
  { id: 'ent3', name: 'Razel-Bec' },
  { id: 'ent4', name: 'Enterprise Locale BTP' },
  { id: 'ent5', name: 'Madagascar Routes SA' },
];

const ManagerPanel = () => {
  const { userData } = useAuth();
  const { isManager, canDeleteReport, canChangeStatus, canEditReport } = usePermissions();
  const [reports, setReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingReport, setEditingReport] = useState(null);
  const [syncing, setSyncing] = useState(false);
  
  // Onglet actif
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Historique local
  const { history, addEntry } = useLocalHistory();
  
  // Validation des données
  const [validationReport, setValidationReport] = useState(null);

  // Callback pour les résultats filtrés
  const handleFilteredResults = useCallback((filtered) => {
    setFilteredReports(filtered);
  }, []);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadReports();
  }, []);

  // Afficher une notification temporaire
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadReports = async () => {
    setLoading(true);
    const result = await getAllReports();
    
    if (!result.error && result.reports) {
      setAllReports(result.reports);
      setReports(result.reports);
      setFilteredReports(result.reports);
      setStats(getReportsStats(result.reports));
      
      // Valider les données
      const validation = validateReports(result.reports);
      setValidationReport(validation);
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    await loadReports();
    setSyncing(false);
    showNotification('Synchronisation réussie avec Firebase !');
  };

  // Fonctions d'export
  const handleExportCSV = () => {
    downloadCSV(filteredReports, 'signalements_road_reporter');
    showNotification('Export CSV téléchargé !');
    addEntry(null, HISTORY_ACTIONS.UPDATE, userData?.id, userData?.displayName, {
      description: `Export CSV de ${filteredReports.length} signalements`
    });
  };

  const handleExportJSON = () => {
    downloadJSON(filteredReports, 'signalements_road_reporter');
    showNotification('Export JSON téléchargé !');
  };

  const handlePrintReport = () => {
    printReport(filteredReports, stats);
    addEntry(null, HISTORY_ACTIONS.UPDATE, userData?.id, userData?.displayName, {
      description: `Impression du rapport (${filteredReports.length} signalements)`
    });
  };

  const handleEditReport = (report) => {
    if (!canEditReport) {
      showNotification('Vous n\'avez pas la permission de modifier', 'error');
      return;
    }
    
    setEditingReport({
      id: report.id,
      type: report.type,
      surface: report.surface || '',
      budget: report.budget || '',
      niveau: report.niveau || 1,
      entreprise: report.entreprise_id || report.entreprise || '',
      status: report.status
    });
  };

  // Calculer le budget automatiquement
  const calculateBudget = async (niveau, surface) => {
    if (!niveau || !surface) return;
    try {
      const response = await fetch(`http://localhost:3001/api/calculate-budget?niveau=${niveau}&surface=${surface}`);
      const data = await response.json();
      if (data.success) {
        setEditingReport(prev => ({ ...prev, budget: data.budget }));
      }
    } catch (err) {
      console.error('Erreur calcul budget:', err);
    }
  };

  const handleSaveReport = async () => {
    if (!editingReport) return;

    // Utiliser l'endpoint avec calcul automatique du budget
    try {
      const response = await fetch(`http://localhost:3001/api/reports/${editingReport.id}/with-budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niveau: parseInt(editingReport.niveau) || 1,
          surface: parseFloat(editingReport.surface) || 0,
          status: editingReport.status,
          entreprise_id: editingReport.entreprise || null
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadReports();
        setEditingReport(null);
        showNotification(`Signalement mis à jour ! Budget: ${new Intl.NumberFormat('fr-MG').format(result.budgetDetails.budget)} MGA`);
      } else {
        showNotification(result.error || 'Erreur lors de la mise à jour', 'error');
      }
    } catch (err) {
      showNotification('Erreur: ' + err.message, 'error');
    }

    // Log dans l'historique
    addEntry(editingReport.id, HISTORY_ACTIONS.UPDATE, userData?.id, userData?.displayName, {
      description: 'Mise à jour surface/budget/niveau'
    });
  };

  const handleStatusChange = async (reportId, newStatus) => {
    if (!canChangeStatus) {
      showNotification('Vous n\'avez pas la permission de changer le statut', 'error');
      return;
    }

    const result = await updateReportStatus(reportId, newStatus, userData?.role, userData?.email);
    
    if (!result.error && result.success) {
      await loadReports();
      showNotification(`Statut changé en "${newStatus}"`);
    } else {
      showNotification(result.error || 'Erreur lors du changement de statut', 'error');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!canDeleteReport) {
      showNotification('Vous n\'avez pas la permission de supprimer', 'error');
      return;
    }

    const result = await deleteReport(reportId, userData?.role);
    
    if (!result.error && result.success) {
      await loadReports();
      setDeleteConfirm(null);
      showNotification('Signalement supprimé avec succès !');
    } else {
      showNotification(result.error || 'Erreur lors de la suppression', 'error');
    }
  };

  return (
    <div className="min-h-screen py-8">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg animate-slide-up ${
          notification.type === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-emerald-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="card max-w-md w-full animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Confirmer la suppression</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Êtes-vous sûr de vouloir supprimer ce signalement ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteReport(deleteConfirm)}
                className="flex-1 bg-red-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display font-bold text-slate-800 mb-2 flex items-center gap-3">
                <Shield className="h-10 w-10 text-orange-500" />
                Panneau de gestion
              </h1>
              <p className="text-slate-600">
                Manager : <span className="font-semibold text-orange-600">{userData?.displayName}</span>
                <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                  Accès complet
                </span>
              </p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Menu Export */}
              <div className="relative group">
                <button className="btn-secondary flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exporter
                </button>
                <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 py-2 min-w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4 text-emerald-500" />
                    Exporter en CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileJson className="h-4 w-4 text-blue-500" />
                    Exporter en JSON
                  </button>
                  <button
                    onClick={handlePrintReport}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4 text-purple-500" />
                    Imprimer le rapport
                  </button>
                </div>
              </div>

              {/* Utilisation du composant SyncButton */}
              <SyncButton 
                onSync={loadReports}
                variant="primary"
                size="md"
                label="Synchroniser"
                syncingLabel="Sync..."
                successLabel="Synchronisé !"
              />
            </div>
          </div>

          {/* Onglets de navigation */}
          <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'reports', label: 'Signalements', icon: MapPin },
              { id: 'delays', label: 'Délais', icon: Clock },
              { id: 'entreprises', label: 'Entreprises', icon: Building2 },
              { id: 'users', label: 'Utilisateurs', icon: Users },
              { id: 'settings', label: 'Paramètres', icon: Settings },
              { id: 'history', label: 'Historique', icon: History },
              { id: 'validation', label: 'Validation', icon: CheckCircle }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu par onglet */}
        {activeTab === 'dashboard' && (
          <>
            {/* Statistiques avancées */}
            <div className="mb-8">
              <AdvancedStats reports={allReports} />
            </div>

            {/* Recherche et Filtres */}
            <SearchFilters 
              reports={allReports}
              onFilteredResults={handleFilteredResults}
              showAdvanced={true}
              className="mb-8"
            />

            {/* Carte */}
            <div className="mb-8">
              {loading ? (
                <div className="card h-[500px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="spinner mx-auto mb-4"></div>
                    <p className="text-slate-600">Chargement...</p>
                  </div>
                </div>
              ) : (
                <div className="h-[500px]">
                  <RoadMap reports={filteredReports} />
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'reports' && (
          <>
            {/* Recherche et Filtres */}
            <SearchFilters 
              reports={allReports}
              onFilteredResults={handleFilteredResults}
              showAdvanced={true}
              className="mb-8"
            />

            {/* Contenu principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Liste des signalements */}
              <div className="lg:col-span-2">
                <div className="card">
                  <h3 className="text-xl font-display font-bold text-slate-800 mb-4">
                    Gestion des signalements ({filteredReports.length})
                  </h3>
                  
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {filteredReports.map(report => (
                      <div
                        key={report.id}
                    className="border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-all"
                  >
                    {editingReport?.id === report.id ? (
                      // Mode édition
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-slate-800">
                            Modifier #{String(report.id || '').slice(0, 8)}
                          </h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveReport}
                              className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingReport(null)}
                              className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Niveau de dégradation */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Niveau (1-10)
                            </label>
                            <select
                              value={editingReport.niveau}
                              onChange={(e) => {
                                const newNiveau = parseInt(e.target.value);
                                setEditingReport({
                                  ...editingReport,
                                  niveau: newNiveau
                                });
                                calculateBudget(newNiveau, editingReport.surface);
                              }}
                              className="input-field text-sm"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <option key={n} value={n}>
                                  {n} - {n <= 3 ? 'Léger' : n <= 6 ? 'Modéré' : n <= 8 ? 'Sévère' : 'Critique'}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Surface (m²)
                            </label>
                            <input
                              type="number"
                              value={editingReport.surface}
                              onChange={(e) => {
                                const newSurface = e.target.value;
                                setEditingReport({
                                  ...editingReport,
                                  surface: newSurface
                                });
                                calculateBudget(editingReport.niveau, newSurface);
                              }}
                              className="input-field text-sm"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Budget calculé (MGA)
                            </label>
                            <input
                              type="number"
                              value={editingReport.budget}
                              readOnly
                              className="input-field text-sm bg-gray-100 font-bold text-green-700"
                              placeholder="Automatique"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Prix/m² × Niveau × Surface
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Entreprise assignée
                            </label>
                            <select
                              value={editingReport.entreprise}
                              onChange={(e) => setEditingReport({
                                ...editingReport,
                                entreprise: e.target.value
                              })}
                              className="input-field text-sm"
                            >
                              <option value="">-- Sélectionner une entreprise --</option>
                              {ENTREPRISES.map(ent => (
                                <option key={ent.id} value={ent.id}>{ent.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Statut
                            </label>
                            <select
                              value={editingReport.status}
                              onChange={(e) => setEditingReport({
                                ...editingReport,
                                status: e.target.value
                              })}
                              className="input-field text-sm"
                            >
                              <option value="nouveau">Nouveau</option>
                              <option value="en-cours">En cours</option>
                              <option value="termine">Terminé</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Mode affichage
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-bold text-slate-800">
                              #{String(report.id || '').slice(0, 8)}
                            </h4>
                            <span className={`status-badge status-${report.status}`}>
                              {report.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditReport(report)}
                              className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(report.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <span className="text-slate-600">Type:</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {report.type}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Niveau:</span>
                            <span className={`ml-2 font-bold ${
                              (report.niveau || 1) <= 3 ? 'text-green-600' :
                              (report.niveau || 1) <= 6 ? 'text-yellow-600' :
                              (report.niveau || 1) <= 8 ? 'text-orange-600' : 'text-red-600'
                            }`}>
                              {report.niveau || 1}/10
                              <span className="font-normal text-xs ml-1">
                                ({(report.niveau || 1) <= 3 ? 'Léger' : 
                                  (report.niveau || 1) <= 6 ? 'Modéré' : 
                                  (report.niveau || 1) <= 8 ? 'Sévère' : 'Critique'})
                              </span>
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Surface:</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {report.surface ? `${report.surface} m²` : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Budget:</span>
                            <span className="ml-2 font-medium text-emerald-600">
                              {report.budget ? `${Number(report.budget).toLocaleString()} MGA` : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Entreprise:</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {ENTREPRISES.find(e => e.id === report.entreprise_id)?.name || report.entreprise || 'Non assignée'}
                            </span>
                          </div>
                        </div>

                        {/* Délais et dates */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-blue-500" />
                            <span className="text-slate-500">Créé:</span>
                            <span className="font-medium text-slate-700">
                              {report.created_at ? new Date(report.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-indigo-500" />
                            <span className="text-slate-500">Assigné:</span>
                            <span className="font-medium text-slate-700">
                              {report.assigned_at ? new Date(report.assigned_at).toLocaleDateString('fr-FR') : 'En attente'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-orange-500" />
                            <span className="text-slate-500">Démarré:</span>
                            <span className="font-medium text-slate-700">
                              {report.started_at ? new Date(report.started_at).toLocaleDateString('fr-FR') : 'Non démarré'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-emerald-500" />
                            <span className="text-slate-500">Terminé:</span>
                            <span className="font-medium text-slate-700">
                              {report.completed_at ? new Date(report.completed_at).toLocaleDateString('fr-FR') : 'En cours'}
                            </span>
                          </div>
                          
                          {/* Délai de démarrage (création -> démarrage) */}
                          {report.started_at && report.created_at && (
                            <div className="col-span-2 mt-1 pt-2 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">⏱️ Délai de démarrage:</span>
                                <span className="font-bold text-blue-600">
                                  {Math.round((new Date(report.started_at) - new Date(report.created_at)) / (1000 * 60 * 60 * 24))} jours
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Durée des travaux (démarrage -> fin) */}
                          {report.completed_at && report.started_at && (
                            <div className="col-span-2 mt-1 pt-2 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">🔧 Durée des travaux:</span>
                                <span className="font-bold text-emerald-600">
                                  {Math.round((new Date(report.completed_at) - new Date(report.started_at)) / (1000 * 60 * 60 * 24))} jours
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Localisation - Quartier */}
                        {(report.quartier || report.arrondissement) && (
                          <div className="mt-3 flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg">
                            <MapPin className="h-4 w-4 text-indigo-500" />
                            <div className="text-sm">
                              <span className="font-medium text-indigo-700">
                                {report.quartier ? QUARTIERS.find(q => q.id === report.quartier)?.name || report.quartier : ''}
                              </span>
                              {report.arrondissement && (
                                <span className="text-indigo-500 ml-1">
                                  ({ARRONDISSEMENTS[report.arrondissement]?.name || report.arrondissement})
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {report.description && (
                          <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">
                            {report.description}
                          </p>
                        )}

                        {/* Affichage des images */}
                        {report.images && report.images.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Image className="h-4 w-4 text-slate-500" />
                              <span className="text-xs font-semibold text-slate-600">
                                Photos ({report.images.length})
                              </span>
                            </div>
                            <ImageGallery images={report.images} maxVisible={3} />
                          </div>
                        )}

                        {/* Changement rapide de statut */}
                        <div className="mt-3 pt-3 border-t border-slate-200 flex space-x-2">
                          {['nouveau', 'en-cours', 'termine'].map(status => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(report.id, status)}
                              disabled={report.status === status}
                              className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                                report.status === status
                                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                  : 'bg-slate-100 text-slate-700 hover:bg-orange-100 hover:text-orange-700'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>

                        {/* Historique des statuts */}
                        {report.statusHistory && report.statusHistory.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-slate-500" />
                              <span className="text-xs font-semibold text-slate-600">
                                Historique des modifications
                              </span>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {report.statusHistory.map((entry, idx) => (
                                <div 
                                  key={idx} 
                                  className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                      entry.previousStatus === 'nouveau' ? 'bg-amber-100 text-amber-700' :
                                      entry.previousStatus === 'en-cours' ? 'bg-blue-100 text-blue-700' :
                                      'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {entry.previousStatus}
                                    </span>
                                    <span className="text-slate-400">→</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                      entry.newStatus === 'nouveau' ? 'bg-amber-100 text-amber-700' :
                                      entry.newStatus === 'en-cours' ? 'bg-blue-100 text-blue-700' :
                                      'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {entry.newStatus}
                                    </span>
                                  </div>
                                  <div className="text-right text-slate-400">
                                    <div>{new Date(entry.changedAt).toLocaleDateString('fr-FR')}</div>
                                    <div className="text-[9px]">{entry.changedBy?.split('@')[0]}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timestamps importants */}
                        <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                          <div className="text-center">
                            <div className="font-medium">Créé</div>
                            <div>{report.createdAt ? new Date(report.createdAt).toLocaleDateString('fr-FR') : '-'}</div>
                          </div>
                          {report.startedAt && (
                            <div className="text-center">
                              <div className="font-medium text-blue-600">Démarré</div>
                              <div>{new Date(report.startedAt.seconds ? report.startedAt.seconds * 1000 : report.startedAt).toLocaleDateString('fr-FR')}</div>
                            </div>
                          )}
                          {report.completedAt && (
                            <div className="text-center">
                              <div className="font-medium text-emerald-600">Terminé</div>
                              <div>{new Date(report.completedAt.seconds ? report.completedAt.seconds * 1000 : report.completedAt).toLocaleDateString('fr-FR')}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Statistiques (colonne droite) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {loading ? (
                <div className="card flex items-center justify-center py-12">
                  <div className="spinner"></div>
                </div>
              ) : (
                <SummaryTable stats={stats} />
              )}
            </div>
          </div>
        </div>
          </>
        )}

        {/* Onglet Délais et Statistiques */}
        {activeTab === 'delays' && (
          <DelayStats />
        )}

        {/* Onglet Paramètres */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <PriceSettings userId={userData?.id} />
          </div>
        )}

        {/* Onglet Entreprises */}
        {activeTab === 'entreprises' && (
          <EntrepriseManager reports={allReports} />
        )}

        {/* Onglet Historique */}
        {activeTab === 'history' && (
          <div className="card">
            <ReportHistory history={history} showFilters={true} maxItems={100} />
          </div>
        )}

        {/* Onglet Validation */}
        {activeTab === 'validation' && (
          <div className="space-y-6">
            {validationReport && (
              <ValidationSummary validationReport={validationReport} />
            )}
            
            {/* Liste des signalements avec problèmes */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Signalements nécessitant attention
                </h3>
                <span className="text-sm text-slate-500">
                  {validationReport?.results.filter(r => !r.isValid || r.warnings.length > 0).length || 0} signalement(s)
                </span>
              </div>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {validationReport?.results
                  .filter(r => !r.isValid || r.warnings.length > 0)
                  .slice(0, 20)
                  .map(result => {
                    const report = allReports.find(r => r.id === result.id);
                    return (
                      <div key={result.id} className="p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              result.isValid ? 'bg-amber-100' : 'bg-red-100'
                            }`}>
                              <AlertTriangle className={`h-5 w-5 ${
                                result.isValid ? 'text-amber-600' : 'text-red-600'
                              }`} />
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 block">
                                #{String(result.id || '').slice(0, 8)}
                              </span>
                              <span className="text-sm text-slate-500">
                                {report?.type || 'N/A'} • {report?.quartier || 'Quartier non défini'}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              result.completeness >= 80 ? 'bg-green-100 text-green-700' :
                              result.completeness >= 50 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {result.completeness}% complet
                            </span>
                            {report?.niveau && (
                              <span className={`text-xs font-medium ${
                                report.niveau <= 3 ? 'text-green-600' :
                                report.niveau <= 6 ? 'text-yellow-600' :
                                report.niveau <= 8 ? 'text-orange-600' : 'text-red-600'
                              }`}>
                                Niveau {report.niveau}/10
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Erreurs */}
                        {result.errors.length > 0 && (
                          <div className="mb-2 p-2 bg-red-50 rounded-lg border border-red-100">
                            <p className="text-xs font-semibold text-red-700 mb-1">Erreurs ({result.errors.length})</p>
                            {result.errors.map((e, i) => (
                              <p key={i} className="text-sm text-red-600 flex items-center gap-1">
                                <X className="h-3 w-3" /> {e.message}
                              </p>
                            ))}
                          </div>
                        )}
                        
                        {/* Avertissements */}
                        {result.warnings.length > 0 && (
                          <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                            <p className="text-xs font-semibold text-amber-700 mb-1">Avertissements ({result.warnings.length})</p>
                            {result.warnings.slice(0, 3).map((w, i) => (
                              <p key={i} className="text-sm text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> {w.message}
                              </p>
                            ))}
                            {result.warnings.length > 3 && (
                              <p className="text-xs text-amber-500 mt-1">
                                +{result.warnings.length - 3} autre(s) avertissement(s)
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Bouton d'action */}
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => {
                              setActiveTab('reports');
                              handleEditReport(report);
                            }}
                            className="text-xs px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Corriger
                          </button>
                        </div>
                      </div>
                    );
                  })}
                
                {validationReport?.results.filter(r => !r.isValid || r.warnings.length > 0).length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Tous les signalements sont complets !</p>
                    <p className="text-sm text-slate-500">Aucune action requise</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Onglet Utilisateurs */}
        {activeTab === 'users' && (
          <UserManager />
        )}
      </div>
    </div>
  );
};

export default ManagerPanel;