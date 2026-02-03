import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader, AlertCircle, Check } from 'lucide-react';
import { validateImage, createPreviewURL, revokePreviewURL, IMAGE_CONFIG } from '../services/imageService';

/**
 * Composant d'upload d'images avec prévisualisation
 * @param {Function} onImagesChange - Callback appelé quand les images changent
 * @param {Array} initialImages - Images existantes (pour édition)
 * @param {number} maxImages - Nombre maximum d'images autorisées
 * @param {boolean} disabled - Désactiver l'upload
 */
const ImageUpload = ({ 
  onImagesChange, 
  initialImages = [], 
  maxImages = IMAGE_CONFIG.maxImagesPerReport,
  disabled = false 
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState(initialImages.map(img => ({
    url: img.url,
    isExisting: true,
    path: img.path
  })));
  const [errors, setErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Gérer la sélection de fichiers
  const handleFileSelect = useCallback((files) => {
    const fileArray = Array.from(files);
    const newErrors = [];
    const validFiles = [];
    const newPreviews = [];

    // Vérifier le nombre total d'images
    const totalImages = previews.length + fileArray.length;
    if (totalImages > maxImages) {
      newErrors.push(`Maximum ${maxImages} images autorisées. Vous avez déjà ${previews.length} image(s).`);
      setErrors(newErrors);
      return;
    }

    fileArray.forEach((file) => {
      const validation = validateImage(file);
      
      if (!validation.valid) {
        newErrors.push(`${file.name}: ${validation.error}`);
      } else {
        validFiles.push(file);
        newPreviews.push({
          file,
          url: createPreviewURL(file),
          isExisting: false,
          name: file.name
        });
      }
    });

    setErrors(newErrors);
    
    if (validFiles.length > 0) {
      const updatedPreviews = [...previews, ...newPreviews];
      const updatedFiles = [...selectedFiles, ...validFiles];
      
      setPreviews(updatedPreviews);
      setSelectedFiles(updatedFiles);
      
      // Notifier le parent
      if (onImagesChange) {
        onImagesChange({
          newFiles: updatedFiles,
          existingImages: updatedPreviews.filter(p => p.isExisting),
          allPreviews: updatedPreviews
        });
      }
    }
  }, [previews, selectedFiles, maxImages, onImagesChange]);

  // Gérer le clic sur le bouton d'upload
  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Gérer le changement du input file
  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
    // Réinitialiser l'input pour permettre de sélectionner le même fichier
    e.target.value = '';
  };

  // Gérer le drag & drop
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (!disabled && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Supprimer une image
  const handleRemoveImage = (index) => {
    const preview = previews[index];
    
    // Révoquer l'URL de prévisualisation si c'est un nouveau fichier
    if (!preview.isExisting) {
      revokePreviewURL(preview.url);
    }

    const updatedPreviews = previews.filter((_, i) => i !== index);
    const updatedFiles = selectedFiles.filter((_, i) => {
      // Trouver l'index correspondant dans selectedFiles
      const previewIndex = previews.findIndex((p, pi) => pi === index && !p.isExisting);
      return i !== previewIndex;
    });

    // Recalculer les fichiers sélectionnés
    const newSelectedFiles = [];
    updatedPreviews.forEach((p) => {
      if (!p.isExisting && p.file) {
        newSelectedFiles.push(p.file);
      }
    });

    setPreviews(updatedPreviews);
    setSelectedFiles(newSelectedFiles);
    setErrors([]);

    // Notifier le parent
    if (onImagesChange) {
      onImagesChange({
        newFiles: newSelectedFiles,
        existingImages: updatedPreviews.filter(p => p.isExisting),
        allPreviews: updatedPreviews,
        removedImage: preview
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Zone de drop */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200
          ${disabled 
            ? 'border-slate-200 bg-slate-50 cursor-not-allowed' 
            : isDragging
            ? 'border-orange-500 bg-orange-50'
            : 'border-slate-300 hover:border-orange-400 hover:bg-orange-50/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_CONFIG.allowedTypes.join(',')}
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`
            p-3 rounded-full 
            ${isDragging ? 'bg-orange-100' : 'bg-slate-100'}
          `}>
            <Upload className={`h-6 w-6 ${isDragging ? 'text-orange-600' : 'text-slate-500'}`} />
          </div>
          
          <div>
            <p className="text-sm font-medium text-slate-700">
              {isDragging 
                ? 'Déposez les images ici' 
                : 'Glissez-déposez vos photos ici'
              }
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ou cliquez pour sélectionner
            </p>
          </div>

          <div className="text-xs text-slate-400">
            {IMAGE_CONFIG.allowedExtensions.join(', ').toUpperCase()} • Max {IMAGE_CONFIG.maxSizeMB}MB • {maxImages} images max
          </div>
        </div>

        {/* Indicateur du nombre d'images */}
        {previews.length > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
            {previews.length}/{maxImages}
          </div>
        )}
      </div>

      {/* Erreurs */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Prévisualisations */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {previews.map((preview, index) => (
            <div 
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200"
            >
              <img
                src={preview.url}
                alt={preview.name || `Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay au survol */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(index);
                  }}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Supprimer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Badge pour les images existantes */}
              {preview.isExisting && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-emerald-500 text-white text-xs rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  <span>Enregistré</span>
                </div>
              )}

              {/* Nom du fichier */}
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-xs truncate">
                  {preview.name || `Image ${index + 1}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Composant de progression d'upload
 */
export const UploadProgress = ({ progress, fileName }) => {
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-3 mb-2">
        <Loader className="h-5 w-5 text-blue-600 animate-spin" />
        <span className="text-sm font-medium text-blue-800">
          Upload en cours... {progress}%
        </span>
      </div>
      {fileName && (
        <p className="text-xs text-blue-600 truncate">{fileName}</p>
      )}
      <div className="mt-2 w-full bg-blue-200 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Composant pour afficher une galerie d'images
 */
export const ImageGallery = ({ images = [], onImageClick, showDelete = false, onDelete }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageClick = (image, index) => {
    setSelectedImage(image);
    if (onImageClick) {
      onImageClick(image, index);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
  };

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-center">
          <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aucune image</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {images.map((image, index) => (
          <div 
            key={index}
            className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer"
            onClick={() => handleImageClick(image, index)}
          >
            <img
              src={image.url}
              alt={image.name || `Image ${index + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            
            {showDelete && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(image, index);
                }}
                className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal de visualisation plein écran */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={handleClose}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <img
            src={selectedImage.url}
            alt={selectedImage.name || 'Image'}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ImageUpload;
