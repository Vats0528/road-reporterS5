import React, { useState, useEffect } from 'react';
import { MapPin, FileText, X, Loader, Camera, AlertCircle, Navigation } from 'lucide-react';
import { createReport, updateReport } from '../services/localDbService';
import { uploadMultipleImagesLocal } from '../services/localImageService';
import { useAuth } from '../context/AuthContext';
import ImageUpload, { UploadProgress } from './ImageUpload';
import { LocationDisplay } from './QuartierSelector';
import { getLocationInfo } from '../data/quartiers';

const ReportForm = ({ selectedPosition, onClose, onReportCreated }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    description: '',
    type: 'nid-de-poule'
  });
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [step, setStep] = useState(1); // 1: formulaire, 2: images
  const [locationInfo, setLocationInfo] = useState(null);

  // Détecter le quartier automatiquement quand la position change
  useEffect(() => {
    if (selectedPosition) {
      const info = getLocationInfo(selectedPosition.lat, selectedPosition.lng);
      setLocationInfo(info);
    }
  }, [selectedPosition]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImagesChange = ({ newFiles }) => {
    setImageFiles(newFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Étape 1: Créer le signalement avec les infos de quartier
      const reportData = {
        ...formData,
        latitude: selectedPosition.lat,
        longitude: selectedPosition.lng,
        // Informations de localisation
        quartier: locationInfo?.quartier?.id || null,
        quartierName: locationInfo?.quartier?.name || null,
        arrondissement: locationInfo?.arrondissement?.id || null,
        arrondissementName: locationInfo?.arrondissement?.name || null,
        address: locationInfo?.address || null,
        // Autres champs
        userId: currentUser.uid,
        userEmail: currentUser.email,
        status: 'nouveau',
        surface: null,
        budget: null,
        entreprise: null,
        images: [] // Sera mis à jour après l'upload
      };

      const result = await createReport(reportData);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const reportId = result.id;

      // Étape 2: Upload des images (si présentes)
      if (imageFiles.length > 0) {
        setUploadingImages(true);
        
        const uploadResult = await uploadMultipleImagesLocal(
          imageFiles,
          reportId,
          (progress) => setUploadProgress(progress)
        );

        if (uploadResult.errors && uploadResult.errors.length > 0) {
          console.warn('Erreurs upload:', uploadResult.errors);
        }

        // Mettre à jour le signalement avec les URLs des images (local)
        if (uploadResult.urls && uploadResult.urls.length > 0) {
          await updateReport(reportId, {
            images: uploadResult.urls.map(url => ({
              url: url,
              path: url,
              fileName: url.split('/').pop()
            }))
          });
        }

        setUploadingImages(false);
      }

      // Succès
      onReportCreated();
      onClose();
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la création du signalement');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  if (!selectedPosition) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="card max-w-lg w-full animate-slide-up my-8 max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-display font-bold text-slate-800">
            Nouveau Signalement
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            step === 1 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">1</span>
            Informations
          </div>
          <div className="flex-1 h-0.5 bg-slate-200"></div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            step === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">2</span>
            Photos
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Progression d'upload */}
        {uploadingImages && (
          <div className="mb-4">
            <UploadProgress progress={uploadProgress} fileName="Upload des images..." />
          </div>
        )}

        {/* Position */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex flex-col space-y-2">
            {/* Affichage du quartier détecté */}
            {locationInfo?.quartier ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {locationInfo.quartier.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {locationInfo.arrondissement?.name || locationInfo.quartier.arrondissement} Arrondissement
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100">
                  <MapPin className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Position personnalisée
                  </p>
                  <p className="text-xs text-slate-500">
                    Hors zone quartier définie
                  </p>
                </div>
              </div>
            )}
            
            {/* Coordonnées GPS */}
            <div className="flex items-center space-x-2 text-xs text-slate-500 ml-10">
              <span>📍 GPS: {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Étape 1: Informations */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Type de problème *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="nid-de-poule">🕳️ Nid de poule</option>
                  <option value="fissure">🔀 Fissure</option>
                  <option value="affaissement">⬇️ Affaissement</option>
                  <option value="effondrement">⚠️ Effondrement</option>
                  <option value="inondation">🌊 Problème d'inondation</option>
                  <option value="signalisation">🚧 Signalisation endommagée</option>
                  <option value="autre">📍 Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description *
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="input-field pl-12 min-h-[120px] resize-none"
                    placeholder="Décrivez le problème en détail (taille approximative, danger potentiel, etc.)..."
                    required
                    maxLength={500}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1 text-right">
                  {formData.description.length}/500 caractères
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  <Camera className="h-5 w-5" />
                  Ajouter des photos
                </button>
              </div>
            </>
          )}

          {/* Étape 2: Photos */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Photos du problème (optionnel)
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Ajoutez des photos pour aider à identifier et évaluer le problème
                </p>
                <ImageUpload 
                  onImagesChange={handleImagesChange}
                  maxImages={5}
                  disabled={loading}
                />
              </div>

              {imageFiles.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-700">
                    ✓ {imageFiles.length} image{imageFiles.length > 1 ? 's' : ''} prête{imageFiles.length > 1 ? 's' : ''} à être envoyée{imageFiles.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 btn-secondary"
                >
                  ← Retour
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      <span>{uploadingImages ? 'Upload...' : 'Envoi...'}</span>
                    </>
                  ) : (
                    <span>Créer le signalement</span>
                  )}
                </button>
              </div>

              {/* Option pour sauter les photos */}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2"
              >
                Passer cette étape et créer sans photo
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ReportForm;