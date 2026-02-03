/**
 * Service de validation des données
 * Vérifie les données manquantes et la cohérence des signalements
 */

import { QUARTIERS, ARRONDISSEMENTS, getQuartierByCoordinates } from '../data/quartiers';

// =============================================================================
// RÈGLES DE VALIDATION
// =============================================================================

/**
 * Champs requis pour un signalement
 */
export const REQUIRED_FIELDS = {
  type: {
    label: 'Type de problème',
    validate: (value) => !!value && value.trim() !== '',
    message: 'Le type de problème est requis'
  },
  latitude: {
    label: 'Latitude',
    validate: (value) => typeof value === 'number' && !isNaN(value) && value >= -90 && value <= 90,
    message: 'La latitude doit être un nombre valide entre -90 et 90'
  },
  longitude: {
    label: 'Longitude',
    validate: (value) => typeof value === 'number' && !isNaN(value) && value >= -180 && value <= 180,
    message: 'La longitude doit être un nombre valide entre -180 et 180'
  }
};

/**
 * Champs optionnels mais recommandés
 */
export const RECOMMENDED_FIELDS = {
  description: {
    label: 'Description',
    validate: (value) => !!value && value.trim().length >= 10,
    message: 'Une description détaillée (min 10 caractères) est recommandée'
  },
  surface: {
    label: 'Surface',
    validate: (value) => typeof value === 'number' && value > 0,
    message: 'La surface devrait être estimée'
  },
  images: {
    label: 'Photos',
    validate: (value) => Array.isArray(value) && value.length > 0,
    message: 'Au moins une photo est recommandée pour le diagnostic'
  },
  quartier: {
    label: 'Quartier',
    validate: (value) => !!value,
    message: 'Le quartier devrait être identifié'
  }
};

/**
 * Champs pour le manager
 */
export const MANAGER_FIELDS = {
  budget: {
    label: 'Budget estimé',
    validate: (value) => typeof value === 'number' && value > 0,
    message: 'Le budget devrait être estimé pour la planification'
  },
  entreprise: {
    label: 'Entreprise assignée',
    validate: (value) => !!value && value.trim() !== '',
    message: 'Une entreprise devrait être assignée pour le suivi'
  }
};

// =============================================================================
// FONCTIONS DE VALIDATION
// =============================================================================

/**
 * Valider un signalement
 * @param {Object} report - Le signalement à valider
 * @returns {Object} Résultat de la validation
 */
export const validateReport = (report) => {
  const errors = [];
  const warnings = [];
  const suggestions = [];

  // Vérifier les champs requis
  Object.entries(REQUIRED_FIELDS).forEach(([field, config]) => {
    if (!config.validate(report[field])) {
      errors.push({
        field,
        label: config.label,
        message: config.message,
        type: 'error'
      });
    }
  });

  // Vérifier les champs recommandés
  Object.entries(RECOMMENDED_FIELDS).forEach(([field, config]) => {
    if (!config.validate(report[field])) {
      warnings.push({
        field,
        label: config.label,
        message: config.message,
        type: 'warning'
      });
    }
  });

  // Vérifications spécifiques
  
  // Position hors d'Antananarivo
  if (report.latitude && report.longitude) {
    const isInTana = 
      report.latitude >= -19.1 && report.latitude <= -18.7 &&
      report.longitude >= 47.4 && report.longitude <= 47.7;
    
    if (!isInTana) {
      warnings.push({
        field: 'position',
        label: 'Position',
        message: 'La position semble être en dehors d\'Antananarivo',
        type: 'warning'
      });
    }

    // Détecter le quartier si non défini
    if (!report.quartier) {
      const detected = getQuartierByCoordinates(report.latitude, report.longitude);
      if (detected) {
        suggestions.push({
          field: 'quartier',
          label: 'Quartier suggéré',
          message: `Quartier détecté: ${detected.name}`,
          suggestedValue: detected.id,
          type: 'suggestion'
        });
      }
    }
  }

  // Surface trop grande ou trop petite
  if (report.surface) {
    if (report.surface < 0.1) {
      warnings.push({
        field: 'surface',
        label: 'Surface',
        message: 'La surface semble très petite (< 0.1 m²)',
        type: 'warning'
      });
    } else if (report.surface > 1000) {
      warnings.push({
        field: 'surface',
        label: 'Surface',
        message: 'La surface semble très grande (> 1000 m²)',
        type: 'warning'
      });
    }
  }

  // Budget incohérent avec la surface
  if (report.budget && report.surface) {
    const pricePerSqm = report.budget / report.surface;
    if (pricePerSqm < 1000) {
      warnings.push({
        field: 'budget',
        label: 'Budget',
        message: 'Le budget semble très bas par rapport à la surface',
        type: 'warning'
      });
    } else if (pricePerSqm > 1000000) {
      warnings.push({
        field: 'budget',
        label: 'Budget',
        message: 'Le budget semble très élevé par rapport à la surface',
        type: 'warning'
      });
    }
  }

  // Calcul du score de complétude
  const allFields = [...Object.keys(REQUIRED_FIELDS), ...Object.keys(RECOMMENDED_FIELDS)];
  const filledFields = allFields.filter(field => {
    const value = report[field];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'number') return !isNaN(value) && value !== 0;
    return !!value;
  });
  const completeness = Math.round((filledFields.length / allFields.length) * 100);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    completeness,
    filledFields: filledFields.length,
    totalFields: allFields.length
  };
};

/**
 * Valider plusieurs signalements et générer un rapport
 * @param {Array} reports - Liste des signalements
 * @returns {Object} Rapport de validation
 */
export const validateReports = (reports) => {
  const results = reports.map(report => ({
    id: report.id,
    ...validateReport(report)
  }));

  const stats = {
    total: reports.length,
    valid: results.filter(r => r.isValid).length,
    withErrors: results.filter(r => !r.isValid).length,
    withWarnings: results.filter(r => r.warnings.length > 0).length,
    averageCompleteness: Math.round(
      results.reduce((sum, r) => sum + r.completeness, 0) / results.length
    )
  };

  // Identifier les champs les plus souvent manquants
  const missingFieldsCount = {};
  results.forEach(r => {
    [...r.errors, ...r.warnings].forEach(issue => {
      missingFieldsCount[issue.field] = (missingFieldsCount[issue.field] || 0) + 1;
    });
  });

  const mostMissingFields = Object.entries(missingFieldsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([field, count]) => ({ field, count, percentage: Math.round((count / reports.length) * 100) }));

  return {
    results,
    stats,
    mostMissingFields
  };
};

/**
 * Suggérer des corrections automatiques
 * @param {Object} report - Le signalement
 * @returns {Object} Suggestions de corrections
 */
export const suggestCorrections = (report) => {
  const corrections = {};

  // Auto-détecter le quartier
  if (!report.quartier && report.latitude && report.longitude) {
    const detected = getQuartierByCoordinates(report.latitude, report.longitude);
    if (detected) {
      corrections.quartier = detected.id;
      corrections.arrondissement = detected.arrondissement;
    }
  }

  // Estimer le budget si surface connue (prix moyen au m²)
  if (!report.budget && report.surface) {
    const avgPricePerSqm = {
      'nid-de-poule': 50000,
      'fissure': 30000,
      'effondrement': 100000,
      'inondation': 80000,
      'autre': 40000
    };
    const price = avgPricePerSqm[report.type] || 50000;
    corrections.suggestedBudget = Math.round(report.surface * price);
  }

  // Normaliser le type
  if (report.type) {
    const normalizedType = report.type.toLowerCase().trim()
      .replace(/\s+/g, '-')
      .replace(/nid\s*de\s*poule/i, 'nid-de-poule');
    if (normalizedType !== report.type) {
      corrections.type = normalizedType;
    }
  }

  return corrections;
};

// =============================================================================
// COMPOSANT DE VALIDATION
// =============================================================================

import React from 'react';

/**
 * Badge de complétude
 */
export function CompletenessBadge({ completeness, size = 'md' }) {
  const color = 
    completeness >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
    completeness >= 50 ? 'bg-amber-100 text-amber-700 border-amber-300' :
    'bg-red-100 text-red-700 border-red-300';

  const sizes = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${color} ${sizes[size]}`}>
      {completeness}%
    </span>
  );
}

/**
 * Liste des problèmes de validation
 */
export function ValidationIssues({ validation, showSuggestions = true }) {
  if (!validation) return null;

  const { errors, warnings, suggestions } = validation;

  if (errors.length === 0 && warnings.length === 0 && suggestions.length === 0) {
    return (
      <div className="text-sm text-emerald-600 flex items-center gap-2">
        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
        Toutes les données sont valides
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Erreurs */}
      {errors.map((error, index) => (
        <div key={`error-${index}`} className="flex items-start gap-2 text-sm">
          <span className="w-2 h-2 mt-1.5 bg-red-500 rounded-full flex-shrink-0" />
          <div>
            <span className="font-medium text-red-700">{error.label}:</span>
            <span className="text-red-600 ml-1">{error.message}</span>
          </div>
        </div>
      ))}

      {/* Avertissements */}
      {warnings.map((warning, index) => (
        <div key={`warning-${index}`} className="flex items-start gap-2 text-sm">
          <span className="w-2 h-2 mt-1.5 bg-amber-500 rounded-full flex-shrink-0" />
          <div>
            <span className="font-medium text-amber-700">{warning.label}:</span>
            <span className="text-amber-600 ml-1">{warning.message}</span>
          </div>
        </div>
      ))}

      {/* Suggestions */}
      {showSuggestions && suggestions.map((suggestion, index) => (
        <div key={`suggestion-${index}`} className="flex items-start gap-2 text-sm">
          <span className="w-2 h-2 mt-1.5 bg-blue-500 rounded-full flex-shrink-0" />
          <div>
            <span className="font-medium text-blue-700">{suggestion.label}:</span>
            <span className="text-blue-600 ml-1">{suggestion.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Résumé de validation pour une liste de signalements
 */
export function ValidationSummary({ validationReport }) {
  if (!validationReport) return null;

  const { stats, mostMissingFields } = validationReport;

  return (
    <div className="card">
      <h3 className="font-bold text-slate-800 mb-4">Rapport de validation des données</h3>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-slate-50 rounded-lg">
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <p className="text-2xl font-bold text-emerald-600">{stats.valid}</p>
          <p className="text-xs text-emerald-500">Valides</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-2xl font-bold text-red-600">{stats.withErrors}</p>
          <p className="text-xs text-red-500">Avec erreurs</p>
        </div>
        <div className="text-center p-3 bg-amber-50 rounded-lg">
          <p className="text-2xl font-bold text-amber-600">{stats.withWarnings}</p>
          <p className="text-xs text-amber-500">Incomplets</p>
        </div>
      </div>

      {/* Complétude moyenne */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Complétude moyenne</span>
          <CompletenessBadge completeness={stats.averageCompleteness} />
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className={`h-full rounded-full ${
              stats.averageCompleteness >= 80 ? 'bg-emerald-500' :
              stats.averageCompleteness >= 50 ? 'bg-amber-500' :
              'bg-red-500'
            }`}
            style={{ width: `${stats.averageCompleteness}%` }}
          />
        </div>
      </div>

      {/* Champs les plus manquants */}
      {mostMissingFields.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Champs les plus souvent manquants</h4>
          <div className="space-y-2">
            {mostMissingFields.map(({ field, count, percentage }) => (
              <div key={field} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 capitalize">{field.replace(/_/g, ' ')}</span>
                <span className="text-slate-500">{count} ({percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
