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
import { getAllReports, updateReport, updateReportStatus, deleteReport, getReportsStats } from '../services/reportService';
import { downloadCSV, printReport, downloadJSON } from '../services/exportService';
import { validateReports, ValidationSummary } from '../services/validationService.jsx';
import { QUARTIERS, ARRONDISSEMENTS } from '../data/quartiers';
import { 
  RefreshCw, Edit, Save, X, Download, Trash2, AlertTriangle, Shield, Image, MapPin,
  FileText, BarChart3, Building2, History, CheckCircle, FileJson, Printer, Clock, Users
} from 'lucide-react';

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
      surface: report.surface || '',
      budget: report.budget || '',
      entreprise: report.entreprise || '',
      status: report.status
    });
  };

  const handleSaveReport = async () => {
    if (!editingReport) return;

    const updateData = {
      surface: parseFloat(editingReport.surface) || null,
      budget: parseFloat(editingReport.budget) || null,
      entreprise: editingReport.entreprise || null,
      status: editingReport.status
    };

    // Passer le rôle pour la vérification des permissions
    const result = await updateReport(editingReport.id, updateData, userData?.role);
    
    if (!result.error && result.success) {
      await loadReports();
      setEditingReport(null);
      showNotification('Signalement mis à jour avec succès !');
    } else {
      showNotification(result.error || 'Erreur lors de la mise à jour', 'error');
    }
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
              { id: 'entreprises', label: 'Entreprises', icon: Building2 },
              { id: 'users', label: 'Utilisateurs', icon: Users },
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
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Surface (m²)
                            </label>
                            <input
                              type="number"
                              value={editingReport.surface}
                              onChange={(e) => setEditingReport({
                                ...editingReport,
                                surface: e.target.value
                              })}
                              className="input-field text-sm"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Budget (MGA)
                            </label>
                            <input
                              type="number"
                              value={editingReport.budget}
                              onChange={(e) => setEditingReport({
                                ...editingReport,
                                budget: e.target.value
                              })}
                              className="input-field text-sm"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Entreprise
                            </label>
                            <input
                              type="text"
                              value={editingReport.entreprise}
                              onChange={(e) => setEditingReport({
                                ...editingReport,
                                entreprise: e.target.value
                              })}
                              className="input-field text-sm"
                              placeholder="Nom de l'entreprise"
                            />
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
                          <button
                            onClick={() => handleEditReport(report)}
                            className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <span className="text-slate-600">Type:</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {report.type}
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
                              {report.budget ? `${report.budget.toLocaleString()} MGA` : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Entreprise:</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {report.entreprise || 'N/A'}
                            </span>
                          </div>
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
              <h3 className="font-bold text-slate-800 mb-4">Signalements nécessitant attention</h3>
              <div className="space-y-3">
                {validationReport?.results
                  .filter(r => !r.isValid || r.warnings.length > 0)
                  .slice(0, 20)
                  .map(result => {
                    const report = allReports.find(r => r.id === result.id);
                    return (
                      <div key={result.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-slate-800">
                            #{String(result.id || '').slice(0, 8)} - {report?.type || 'N/A'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            result.isValid ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {result.completeness}% complet
                          </span>
                        </div>
                        <div className="space-y-1">
                          {result.errors.map((e, i) => (
                            <p key={i} className="text-sm text-red-600">❌ {e.message}</p>
                          ))}
                          {result.warnings.slice(0, 3).map((w, i) => (
                            <p key={i} className="text-sm text-amber-600">⚠️ {w.message}</p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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