/**
 * Service d'upload d'images local (via API backend)
 * Alternative à Firebase Storage pour l'authentification locale
 */

const API_BASE_URL = 'http://localhost:3001';

/**
 * Upload une seule image vers le serveur local
 * @param {File} file - Le fichier image
 * @param {string} reportId - ID du signalement (optionnel)
 * @returns {Promise<{url: string, path: string, error: string|null}>}
 */
export const uploadImageLocal = async (file, reportId = 'temp') => {
  try {
    // Validation du fichier
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { url: null, path: null, error: 'Type de fichier non supporté. Utilisez JPG, PNG, WebP ou GIF.' };
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { url: null, path: null, error: 'Le fichier est trop volumineux. Maximum 5MB.' };
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/api/upload-single/${reportId}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur upload');
    }

    const data = await response.json();
    return {
      url: data.url,
      path: data.path,
      error: null
    };
  } catch (error) {
    console.error('Erreur upload image locale:', error);
    return {
      url: null,
      path: null,
      error: error.message || 'Erreur lors de l\'upload'
    };
  }
};

/**
 * Upload plusieurs images vers le serveur local
 * @param {File[]} files - Liste des fichiers
 * @param {string} reportId - ID du signalement
 * @param {function} onProgress - Callback de progression
 * @returns {Promise<{urls: string[], errors: string[]}>}
 */
export const uploadMultipleImagesLocal = async (files, reportId = 'temp', onProgress = null) => {
  const results = {
    urls: [],
    errors: []
  };

  if (!files || files.length === 0) {
    return results;
  }

  // Méthode 1: Upload en batch
  try {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    const response = await fetch(`${API_BASE_URL}/api/upload/${reportId}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur upload batch');
    }

    const data = await response.json();
    results.urls = data.images.map(img => img.url);
    
    if (onProgress) {
      onProgress(100);
    }
  } catch (error) {
    console.error('Erreur upload batch, fallback vers upload individuel:', error);
    
    // Méthode 2: Upload individuel (fallback)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadImageLocal(file, reportId);
      
      if (result.url) {
        results.urls.push(result.url);
      } else if (result.error) {
        results.errors.push(result.error);
      }

      if (onProgress) {
        onProgress(Math.round(((i + 1) / files.length) * 100));
      }
    }
  }

  return results;
};

/**
 * Supprimer une image du serveur local
 * @param {string} imageUrl - URL de l'image
 * @returns {Promise<boolean>}
 */
export const deleteImageLocal = async (imageUrl) => {
  try {
    // Extraire reportId et filename de l'URL
    const urlParts = imageUrl.split('/uploads/');
    if (urlParts.length < 2) {
      throw new Error('URL invalide');
    }

    const pathParts = urlParts[1].split('/');
    if (pathParts.length < 2) {
      throw new Error('Chemin invalide');
    }

    const reportId = pathParts[0];
    const filename = pathParts.slice(1).join('/');

    const response = await fetch(`${API_BASE_URL}/api/upload/${reportId}/${filename}`, {
      method: 'DELETE'
    });

    return response.ok;
  } catch (error) {
    console.error('Erreur suppression image:', error);
    return false;
  }
};

/**
 * Lister les images d'un signalement
 * @param {string} reportId - ID du signalement
 * @returns {Promise<{url: string, filename: string}[]>}
 */
export const listImagesLocal = async (reportId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/upload/${reportId}`);
    
    if (!response.ok) {
      throw new Error('Erreur récupération images');
    }

    const data = await response.json();
    return data.images || [];
  } catch (error) {
    console.error('Erreur liste images:', error);
    return [];
  }
};

/**
 * Compresser une image avant upload (côté client)
 * @param {File} file - Le fichier image
 * @param {number} maxWidth - Largeur max
 * @param {number} quality - Qualité (0-1)
 * @returns {Promise<Blob>}
 */
export const compressImage = async (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Compression échouée'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Erreur chargement image'));
    img.src = URL.createObjectURL(file);
  });
};

export default {
  uploadImageLocal,
  uploadMultipleImagesLocal,
  deleteImageLocal,
  listImagesLocal,
  compressImage
};
