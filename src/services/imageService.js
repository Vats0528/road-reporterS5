import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';
import { storage, auth } from './firebase';

// Configuration des images
export const IMAGE_CONFIG = {
  maxSizeBytes: 5 * 1024 * 1024, // 5 MB max
  maxSizeMB: 5,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  maxImagesPerReport: 5,
  thumbnailSize: 200,
  compressionQuality: 0.7, // Réduit de 0.8 à 0.7
  maxWidth: 1280, // Réduit de 1920 à 1280
  maxHeight: 960
};

// Dossier de stockage pour les signalements
const REPORTS_IMAGES_FOLDER = 'report_images';

/**
 * Valide un fichier image avant l'upload
 * @param {File} file - Le fichier à valider
 * @returns {Object} - { valid: boolean, error: string | null }
 */
export const validateImage = (file) => {
  if (!file) {
    return { valid: false, error: 'Aucun fichier sélectionné' };
  }

  // Vérifier le type MIME
  if (!IMAGE_CONFIG.allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Type de fichier non autorisé. Utilisez: ${IMAGE_CONFIG.allowedExtensions.join(', ')}` 
    };
  }

  // Vérifier la taille
  if (file.size > IMAGE_CONFIG.maxSizeBytes) {
    return { 
      valid: false, 
      error: `Fichier trop volumineux. Maximum: ${IMAGE_CONFIG.maxSizeMB} MB` 
    };
  }

  return { valid: true, error: null };
};

/**
 * Génère un nom de fichier unique
 * @param {string} originalName - Nom original du fichier
 * @param {string} reportId - ID du signalement (optionnel)
 * @returns {string} - Nom de fichier unique
 */
const generateUniqueFileName = (originalName, reportId = '') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop().toLowerCase();
  const prefix = reportId ? `${reportId}_` : '';
  return `${prefix}${timestamp}_${randomString}.${extension}`;
};

/**
 * Compresse une image avant l'upload (optimisé pour vitesse)
 * @param {File} file - Le fichier image
 * @param {number} quality - Qualité de compression (0-1)
 * @returns {Promise<Blob>} - Image compressée
 */
export const compressImage = (file, quality = IMAGE_CONFIG.compressionQuality) => {
  return new Promise((resolve, reject) => {
    // Si le fichier est déjà petit, ne pas compresser
    if (file.size < 200 * 1024) { // < 200KB
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculer les dimensions (max 1280x960)
      let width = img.width;
      let height = img.height;
      const maxWidth = IMAGE_CONFIG.maxWidth;
      const maxHeight = IMAGE_CONFIG.maxHeight;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convertir en blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file); // Fallback au fichier original
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Fallback au fichier original
    };
    
    img.src = url;
  });
};

/**
 * Upload une image vers Firebase Storage
 * @param {File} file - Le fichier à uploader
 * @param {string} reportId - ID du signalement
 * @param {Function} onProgress - Callback de progression (0-100)
 * @returns {Promise<Object>} - { url: string, path: string, error: string | null }
 */
export const uploadImage = async (file, reportId = 'temp', onProgress = null) => {
  try {
    // Vérifier l'authentification
    if (!auth.currentUser) {
      return { url: null, path: null, error: 'Vous devez être connecté pour uploader des images' };
    }

    // Valider le fichier
    const validation = validateImage(file);
    if (!validation.valid) {
      return { url: null, path: null, error: validation.error };
    }

    // Compresser l'image
    let fileToUpload = file;
    try {
      const compressedBlob = await compressImage(file);
      // Ne créer un nouveau File que si la compression a réduit la taille
      if (compressedBlob.size < file.size) {
        fileToUpload = new File([compressedBlob], file.name, { type: 'image/jpeg' });
        console.log(`Image compressée: ${(file.size/1024).toFixed(0)}KB → ${(compressedBlob.size/1024).toFixed(0)}KB`);
      }
    } catch (error) {
      console.warn('Compression échouée, utilisation du fichier original');
    }

    // Générer le chemin de stockage
    const fileName = generateUniqueFileName(file.name, reportId);
    const filePath = `${REPORTS_IMAGES_FOLDER}/${reportId}/${fileName}`;
    const storageRef = ref(storage, filePath);

    // Métadonnées simplifiées pour upload plus rapide
    const metadata = {
      contentType: fileToUpload.type
    };

    // Upload avec suivi de progression
    return new Promise((resolve) => {
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload, metadata);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progression
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          // Erreur
          console.error('Erreur upload:', error);
          let errorMessage = 'Erreur lors de l\'upload';
          
          if (error.code === 'storage/unauthorized') {
            errorMessage = 'Permission refusée. Vérifiez votre connexion.';
          } else if (error.code === 'storage/canceled') {
            errorMessage = 'Upload annulé';
          } else if (error.code === 'storage/quota-exceeded') {
            errorMessage = 'Quota de stockage dépassé';
          }
          
          resolve({ url: null, path: null, error: errorMessage });
        },
        async () => {
          // Upload terminé avec succès
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ 
              url: downloadURL, 
              path: filePath, 
              error: null,
              fileName: fileName,
              size: fileToUpload.size
            });
          } catch (error) {
            resolve({ url: null, path: null, error: 'Erreur lors de la récupération de l\'URL' });
          }
        }
      );
    });
  } catch (error) {
    console.error('Erreur uploadImage:', error);
    return { url: null, path: null, error: error.message };
  }
};

/**
 * Upload plusieurs images
 * @param {FileList|Array} files - Liste des fichiers
 * @param {string} reportId - ID du signalement
 * @param {Function} onProgress - Callback de progression globale
 * @returns {Promise<Object>} - { images: Array, errors: Array }
 */
export const uploadMultipleImages = async (files, reportId = 'temp', onProgress = null) => {
  const fileArray = Array.from(files);
  const results = {
    images: [],
    errors: []
  };

  // Vérifier le nombre maximum d'images
  if (fileArray.length > IMAGE_CONFIG.maxImagesPerReport) {
    return {
      images: [],
      errors: [`Maximum ${IMAGE_CONFIG.maxImagesPerReport} images autorisées`]
    };
  }

  let completedUploads = 0;
  const totalUploads = fileArray.length;

  for (const file of fileArray) {
    const result = await uploadImage(file, reportId, (progress) => {
      // Calculer la progression globale
      if (onProgress) {
        const globalProgress = Math.round(
          ((completedUploads + progress / 100) / totalUploads) * 100
        );
        onProgress(globalProgress);
      }
    });

    if (result.error) {
      results.errors.push({ file: file.name, error: result.error });
    } else {
      results.images.push({
        url: result.url,
        path: result.path,
        fileName: result.fileName,
        originalName: file.name
      });
    }

    completedUploads++;
  }

  return results;
};

/**
 * Supprimer une image de Firebase Storage
 * @param {string} imagePath - Chemin de l'image dans Storage
 * @returns {Promise<Object>} - { success: boolean, error: string | null }
 */
export const deleteImage = async (imagePath) => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: 'Authentification requise' };
    }

    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Erreur deleteImage:', error);
    
    if (error.code === 'storage/object-not-found') {
      return { success: true, error: null }; // Déjà supprimé
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Supprimer toutes les images d'un signalement
 * @param {string} reportId - ID du signalement
 * @returns {Promise<Object>} - { success: boolean, deletedCount: number, error: string | null }
 */
export const deleteReportImages = async (reportId) => {
  try {
    if (!auth.currentUser) {
      return { success: false, deletedCount: 0, error: 'Authentification requise' };
    }

    const folderRef = ref(storage, `${REPORTS_IMAGES_FOLDER}/${reportId}`);
    const listResult = await listAll(folderRef);
    
    let deletedCount = 0;
    const deletePromises = listResult.items.map(async (itemRef) => {
      try {
        await deleteObject(itemRef);
        deletedCount++;
      } catch (error) {
        console.warn('Erreur suppression image:', error);
      }
    });

    await Promise.all(deletePromises);
    
    return { success: true, deletedCount, error: null };
  } catch (error) {
    console.error('Erreur deleteReportImages:', error);
    return { success: false, deletedCount: 0, error: error.message };
  }
};

/**
 * Récupérer toutes les images d'un signalement
 * @param {string} reportId - ID du signalement
 * @returns {Promise<Object>} - { images: Array, error: string | null }
 */
export const getReportImages = async (reportId) => {
  try {
    const folderRef = ref(storage, `${REPORTS_IMAGES_FOLDER}/${reportId}`);
    const listResult = await listAll(folderRef);
    
    const images = await Promise.all(
      listResult.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return {
          url,
          path: itemRef.fullPath,
          name: itemRef.name
        };
      })
    );
    
    return { images, error: null };
  } catch (error) {
    console.error('Erreur getReportImages:', error);
    return { images: [], error: error.message };
  }
};

/**
 * Créer une URL de prévisualisation locale pour un fichier
 * @param {File} file - Le fichier
 * @returns {string} - URL de prévisualisation
 */
export const createPreviewURL = (file) => {
  return URL.createObjectURL(file);
};

/**
 * Révoquer une URL de prévisualisation
 * @param {string} url - L'URL à révoquer
 */
export const revokePreviewURL = (url) => {
  URL.revokeObjectURL(url);
};
