import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxWidthOrHeight: 800,
    useWebWorker: true,
    fileType: 'image/jpeg',
    quality: 0.8,
    initialQuality: 0.8
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error('Failed to compress image');
  }
};

export const resizeToTarget = async (file: File, targetWidth: number = 800): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      const aspectRatio = img.height / img.width;
      const targetHeight = targetWidth * aspectRatio;
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      ctx?.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const resizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(resizedFile);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.8);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

export const validateCompression = (original: File, compressed: File): boolean => {
  const compressionRatio = compressed.size / original.size;
  return compressionRatio > 0.1 && compressionRatio < 1;
};

export const getImageResolution = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => reject(new Error('Failed to load image for resolution check'));
    img.src = URL.createObjectURL(file);
  });
};