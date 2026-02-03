import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, Download, Image } from 'lucide-react';

/**
 * Composant de galerie d'images avec lightbox
 * Peut être utilisé pour afficher les images des signalements
 */
export default function ImageGallery({ images = [], showThumbnails = true, maxVisible = 4 }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  // Normaliser les images (peuvent être des strings ou des objets avec url)
  const normalizedImages = images.map(img => 
    typeof img === 'string' ? { url: img } : img
  );

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  };

  const goToPrevious = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => 
      prev === 0 ? normalizedImages.length - 1 : prev - 1
    );
  };

  const goToNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => 
      prev === normalizedImages.length - 1 ? 0 : prev + 1
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') goToPrevious(e);
    if (e.key === 'ArrowRight') goToNext(e);
  };

  const downloadImage = async (e, imageUrl) => {
    e.stopPropagation();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  };

  const visibleImages = normalizedImages.slice(0, maxVisible);
  const remainingCount = normalizedImages.length - maxVisible;

  return (
    <>
      {/* Grille de miniatures */}
      {showThumbnails && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {visibleImages.map((img, index) => (
            <div
              key={index}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => openLightbox(index)}
            >
              <img
                src={img.url}
                alt={img.name || `Image ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              
              {/* Overlay au hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Badge pour les images restantes */}
              {index === maxVisible - 1 && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">+{remainingCount}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bouton simple si pas de miniatures */}
      {!showThumbnails && (
        <button
          onClick={() => openLightbox(0)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          <Image className="w-4 h-4" />
          Voir les photos ({normalizedImages.length})
        </button>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Bouton fermer */}
          <button
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={closeLightbox}
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Bouton télécharger */}
          <button
            className="absolute top-4 right-16 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={(e) => downloadImage(e, normalizedImages[currentIndex].url)}
            title="Télécharger"
          >
            <Download className="w-6 h-6 text-white" />
          </button>

          {/* Navigation précédent */}
          {normalizedImages.length > 1 && (
            <button
              className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={goToPrevious}
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>
          )}

          {/* Image principale */}
          <div 
            className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={normalizedImages[currentIndex].url}
              alt={normalizedImages[currentIndex].name || `Image ${currentIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>

          {/* Navigation suivant */}
          {normalizedImages.length > 1 && (
            <button
              className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={goToNext}
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>
          )}

          {/* Indicateur de position */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {normalizedImages.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-white w-6' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
              />
            ))}
          </div>

          {/* Compteur */}
          <div className="absolute bottom-6 right-6 text-white/60 text-sm">
            {currentIndex + 1} / {normalizedImages.length}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Composant compact pour afficher dans un tableau ou une liste
 */
export function ImageThumbnailList({ images = [], maxVisible = 3, size = 'sm' }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <span className="text-gray-400 text-sm italic">Aucune photo</span>
    );
  }

  const normalizedImages = images.map(img => 
    typeof img === 'string' ? { url: img } : img
  );

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const visibleImages = normalizedImages.slice(0, maxVisible);
  const remainingCount = normalizedImages.length - maxVisible;

  return (
    <>
      <div className="flex -space-x-2">
        {visibleImages.map((img, index) => (
          <div
            key={index}
            className={`${sizeClasses[size]} rounded-lg overflow-hidden border-2 border-white cursor-pointer hover:z-10 hover:scale-110 transition-transform`}
            onClick={() => {
              setCurrentIndex(index);
              setLightboxOpen(true);
            }}
          >
            <img
              src={img.url}
              alt={`Miniature ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div
            className={`${sizeClasses[size]} rounded-lg bg-gray-200 border-2 border-white flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors`}
            onClick={() => {
              setCurrentIndex(maxVisible);
              setLightboxOpen(true);
            }}
          >
            <span className="text-xs font-semibold text-gray-600">+{remainingCount}</span>
          </div>
        )}
      </div>

      {/* Réutilise le même lightbox */}
      {lightboxOpen && (
        <ImageGallery 
          images={normalizedImages} 
          showThumbnails={false}
        />
      )}
    </>
  );
}
