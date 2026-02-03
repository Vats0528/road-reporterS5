/**
 * Service d'export des données - CSV et PDF
 * Permet aux managers d'exporter les signalements
 */

import { QUARTIERS, ARRONDISSEMENTS } from '../data/quartiers';

// =============================================================================
// UTILITAIRES
// =============================================================================

/**
 * Formate une date pour l'export
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formate un budget en MGA
 */
const formatBudget = (budget) => {
  if (!budget) return '';
  return new Intl.NumberFormat('fr-MG').format(budget);
};

/**
 * Obtient le nom du quartier
 */
const getQuartierName = (quartierId) => {
  if (!quartierId) return '';
  const q = QUARTIERS.find(q => q.id === quartierId);
  return q ? q.name : quartierId;
};

/**
 * Obtient le nom de l'arrondissement
 */
const getArrondissementName = (arrId) => {
  if (!arrId) return '';
  const arr = ARRONDISSEMENTS[arrId];
  return arr ? arr.name : arrId;
};

/**
 * Labels des types de problème
 */
const TYPE_LABELS = {
  'nid-de-poule': 'Nid de poule',
  'fissure': 'Fissure',
  'effondrement': 'Effondrement',
  'inondation': 'Inondation',
  'autre': 'Autre'
};

/**
 * Labels des statuts
 */
const STATUS_LABELS = {
  'nouveau': 'Nouveau',
  'en-cours': 'En cours',
  'termine': 'Terminé'
};

// =============================================================================
// EXPORT CSV
// =============================================================================

/**
 * Convertit les signalements en format CSV
 * @param {Array} reports - Liste des signalements
 * @returns {string} Contenu CSV
 */
export const reportsToCSV = (reports) => {
  // En-têtes
  const headers = [
    'ID',
    'Type',
    'Statut',
    'Description',
    'Quartier',
    'Arrondissement',
    'Latitude',
    'Longitude',
    'Surface (m²)',
    'Budget (MGA)',
    'Entreprise',
    'Date de création',
    'Date de mise à jour',
    'Nombre de photos'
  ];

  // Données
  const rows = reports.map(report => [
    report.id || '',
    TYPE_LABELS[report.type] || report.type || '',
    STATUS_LABELS[report.status] || report.status || '',
    `"${(report.description || '').replace(/"/g, '""')}"`, // Escape quotes
    getQuartierName(report.quartier),
    getArrondissementName(report.arrondissement),
    report.latitude || '',
    report.longitude || '',
    report.surface || '',
    report.budget || '',
    `"${(report.entreprise || '').replace(/"/g, '""')}"`,
    formatDate(report.createdAt),
    formatDate(report.updatedAt),
    report.images?.length || 0
  ]);

  // Construire le CSV
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  return csvContent;
};

/**
 * Télécharge un fichier CSV
 * @param {Array} reports - Liste des signalements
 * @param {string} filename - Nom du fichier (sans extension)
 */
export const downloadCSV = (reports, filename = 'signalements') => {
  const csvContent = reportsToCSV(reports);
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM pour Excel
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// =============================================================================
// EXPORT PDF (HTML à imprimer)
// =============================================================================

/**
 * Génère un rapport HTML imprimable (format PDF via impression)
 * @param {Array} reports - Liste des signalements
 * @param {Object} stats - Statistiques
 * @param {Object} options - Options d'export
 */
export const generatePrintableReport = (reports, stats = {}, options = {}) => {
  const {
    title = 'Rapport des Signalements Routiers',
    subtitle = 'Road Reporter - Antananarivo',
    includeStats = true,
    includeMap = false
  } = options;

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Compter par type et statut
  const byType = {};
  const byStatus = {};
  const byArrondissement = {};

  reports.forEach(r => {
    byType[r.type] = (byType[r.type] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.arrondissement) {
      byArrondissement[r.arrondissement] = (byArrondissement[r.arrondissement] || 0) + 1;
    }
  });

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #1e293b;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #f97316;
      margin-bottom: 20px;
    }
    .header h1 { font-size: 24px; color: #1e293b; margin-bottom: 5px; }
    .header h2 { font-size: 14px; color: #64748b; font-weight: normal; }
    .header .date { font-size: 11px; color: #94a3b8; margin-top: 10px; }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    .stat-card {
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card.total { background: linear-gradient(135deg, #f97316, #ef4444); color: white; }
    .stat-card.nouveau { background: #fef2f2; border: 1px solid #fecaca; }
    .stat-card.en-cours { background: #fffbeb; border: 1px solid #fde68a; }
    .stat-card.termine { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .stat-card .value { font-size: 28px; font-weight: bold; }
    .stat-card .label { font-size: 11px; margin-top: 5px; text-transform: uppercase; }
    .stat-card.nouveau .value { color: #dc2626; }
    .stat-card.en-cours .value { color: #d97706; }
    .stat-card.termine .value { color: #16a34a; }
    
    .section { margin-bottom: 25px; }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #f97316;
      border-bottom: 2px solid #fed7aa;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th, td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      font-size: 10px;
    }
    tr:hover { background: #fafaf9; }
    
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
    }
    .badge-nouveau { background: #fef2f2; color: #dc2626; }
    .badge-en-cours { background: #fffbeb; color: #d97706; }
    .badge-termine { background: #f0fdf4; color: #16a34a; }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 25px;
    }
    .summary-card {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
    }
    .summary-card h4 {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .summary-item:last-child { border-bottom: none; }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛣️ ${title}</h1>
    <h2>${subtitle}</h2>
    <p class="date">Généré le ${currentDate}</p>
  </div>

  ${includeStats ? `
  <div class="stats-grid">
    <div class="stat-card total">
      <div class="value">${reports.length}</div>
      <div class="label">Total signalements</div>
    </div>
    <div class="stat-card nouveau">
      <div class="value">${byStatus['nouveau'] || 0}</div>
      <div class="label">Nouveaux</div>
    </div>
    <div class="stat-card en-cours">
      <div class="value">${byStatus['en-cours'] || 0}</div>
      <div class="label">En cours</div>
    </div>
    <div class="stat-card termine">
      <div class="value">${byStatus['termine'] || 0}</div>
      <div class="label">Terminés</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <h4>📊 Par Type</h4>
      ${Object.entries(byType).map(([type, count]) => `
        <div class="summary-item">
          <span>${TYPE_LABELS[type] || type}</span>
          <strong>${count}</strong>
        </div>
      `).join('')}
    </div>
    
    <div class="summary-card">
      <h4>📍 Par Arrondissement</h4>
      ${Object.entries(byArrondissement).slice(0, 6).map(([arr, count]) => `
        <div class="summary-item">
          <span>${getArrondissementName(arr)}</span>
          <strong>${count}</strong>
        </div>
      `).join('') || '<p style="color: #94a3b8; font-style: italic;">Aucune donnée</p>'}
    </div>
    
    <div class="summary-card">
      <h4>💰 Budget Total</h4>
      <div class="summary-item">
        <span>Estimé</span>
        <strong>${formatBudget(stats.totalBudget || reports.reduce((sum, r) => sum + (r.budget || 0), 0))} MGA</strong>
      </div>
      <div class="summary-item">
        <span>Surface totale</span>
        <strong>${stats.totalSurface || reports.reduce((sum, r) => sum + (r.surface || 0), 0)} m²</strong>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h3 class="section-title">📋 Liste des Signalements (${reports.length})</h3>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Type</th>
          <th>Statut</th>
          <th>Quartier</th>
          <th>Surface</th>
          <th>Budget</th>
          <th>Entreprise</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${reports.map(r => `
          <tr>
            <td>${(r.id || '').substring(0, 8)}</td>
            <td>${TYPE_LABELS[r.type] || r.type || '-'}</td>
            <td><span class="badge badge-${r.status}">${STATUS_LABELS[r.status] || r.status}</span></td>
            <td>${getQuartierName(r.quartier) || '-'}</td>
            <td>${r.surface ? r.surface + ' m²' : '-'}</td>
            <td>${r.budget ? formatBudget(r.budget) + ' MGA' : '-'}</td>
            <td>${r.entreprise || '-'}</td>
            <td>${formatDate(r.createdAt)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Road Reporter - Système de signalement des dégradations routières d'Antananarivo</p>
    <p>Document généré automatiquement - ${currentDate}</p>
  </div>

  <script>
    // Auto-print si ouvert dans une nouvelle fenêtre
    if (window.opener) {
      window.onload = function() {
        window.print();
      };
    }
  </script>
</body>
</html>
  `;

  return html;
};

/**
 * Ouvre une fenêtre d'impression avec le rapport
 * @param {Array} reports - Liste des signalements
 * @param {Object} stats - Statistiques
 */
export const printReport = (reports, stats = {}) => {
  const html = generatePrintableReport(reports, stats);
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    alert('Veuillez autoriser les popups pour imprimer le rapport.');
  }
};

// =============================================================================
// EXPORT JSON
// =============================================================================

/**
 * Télécharge les données en JSON
 * @param {Array} reports - Liste des signalements
 * @param {string} filename - Nom du fichier
 */
export const downloadJSON = (reports, filename = 'signalements') => {
  const data = {
    exportDate: new Date().toISOString(),
    totalCount: reports.length,
    reports: reports.map(r => ({
      ...r,
      quartierName: getQuartierName(r.quartier),
      arrondissementName: getArrondissementName(r.arrondissement),
      typeName: TYPE_LABELS[r.type] || r.type,
      statusName: STATUS_LABELS[r.status] || r.status
    }))
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default {
  reportsToCSV,
  downloadCSV,
  generatePrintableReport,
  printReport,
  downloadJSON
};
