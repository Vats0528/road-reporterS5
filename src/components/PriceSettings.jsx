import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

/**
 * Composant de configuration du prix par m²
 */
export default function PriceSettings({ userId }) {
  const [prixM2, setPrixM2] = useState(50000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/settings/prix_m2`);
      const data = await response.json();
      
      if (data.success && data.setting) {
        setPrixM2(data.setting.value.amount);
        setLastUpdate(data.setting.updated_at);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`${API_URL}/settings/prix_m2`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: { amount: prixM2, currency: 'MGA' },
          updatedBy: userId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Prix par m² mis à jour avec succès !');
        setLastUpdate(new Date().toISOString());
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(amount) + ' MGA';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('fr-FR');
  };

  // Exemples de calcul
  const examples = [
    { surface: 10, niveau: 3 },
    { surface: 50, niveau: 5 },
    { surface: 100, niveau: 7 },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 text-blue-500 animate-spin mr-2" />
        <span>Chargement...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Configuration du Prix par m²
        </h3>
        <button 
          onClick={loadSettings}
          className="text-gray-500 hover:text-gray-700"
          title="Actualiser"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Messages */}
        {error && (
          <div className="flex items-center p-3 bg-red-50 text-red-700 rounded-lg">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="flex items-center p-3 bg-green-50 text-green-700 rounded-lg">
            <CheckCircle className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}

        {/* Champ de saisie */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prix forfaitaire par m² (en Ariary)
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              value={prixM2}
              onChange={(e) => setPrixM2(parseInt(e.target.value) || 0)}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="1000"
            />
            <span className="text-gray-500">MGA / m²</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </button>
          </div>
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-1">
              Dernière modification: {formatDate(lastUpdate)}
            </p>
          )}
        </div>

        {/* Formule */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Formule de calcul du budget</h4>
          <p className="text-blue-700 font-mono text-lg">
            Budget = Prix/m² × Niveau × Surface
          </p>
          <p className="text-blue-600 text-sm mt-1">
            Budget = {formatCurrency(prixM2)} × Niveau (1-10) × Surface (m²)
          </p>
        </div>

        {/* Exemples */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Exemples de calcul</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Surface</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Niveau</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Calcul</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {examples.map((ex, idx) => {
                  const budget = prixM2 * ex.niveau * ex.surface;
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-700">{ex.surface} m²</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          ex.niveau <= 3 ? 'bg-green-100 text-green-800' :
                          ex.niveau <= 6 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {ex.niveau}/10
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 font-mono">
                        {formatCurrency(prixM2)} × {ex.niveau} × {ex.surface}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 font-bold text-right">
                        {formatCurrency(budget)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Légende des niveaux */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Échelle des niveaux de dégradation</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div 
                key={n}
                className={`p-2 rounded text-center text-sm ${
                  n <= 3 ? 'bg-green-100 text-green-800' :
                  n <= 6 ? 'bg-yellow-100 text-yellow-800' :
                  n <= 8 ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}
              >
                <span className="font-bold">Niveau {n}</span>
                <span className="block text-xs">
                  {n <= 3 ? 'Léger' : n <= 6 ? 'Modéré' : n <= 8 ? 'Sévère' : 'Critique'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
