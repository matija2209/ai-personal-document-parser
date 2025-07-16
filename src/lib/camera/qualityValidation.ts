import { QualityMetrics } from '@/types/camera';
import { getImageResolution } from './imageCompression';

export const calculateBlurScore = (imageData: ImageData): number => {
  const { data, width, height } = imageData;
  
  const grayscale = new Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grayscale[i / 4] = gray;
  }
  
  const laplacian = [-1, -1, -1, -1, 8, -1, -1, -1, -1];
  const filtered = new Array(width * height);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += grayscale[(y + ky) * width + (x + kx)] * laplacian[(ky + 1) * 3 + (kx + 1)];
        }
      }
      filtered[y * width + x] = sum;
    }
  }
  
  const mean = filtered.reduce((a, b) => a + b, 0) / filtered.length;
  const variance = filtered.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / filtered.length;
  
  return variance;
};

export const isImageBlurry = (file: File, threshold: number = 5): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        const blurScore = calculateBlurScore(imageData);
        resolve(blurScore < threshold);
      } else {
        reject(new Error('Failed to get image data'));
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

export const calculateQualityMetrics = async (file: File): Promise<QualityMetrics> => {
  try {
    const [blurScore, resolution] = await Promise.all([
      new Promise<number>((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          if (imageData) {
            const score = calculateBlurScore(imageData);
            resolve(score);
          } else {
            reject(new Error('Failed to get image data'));
          }
        };

        img.onerror = () => reject(new Error('Failed to load image for blur detection'));
        img.src = URL.createObjectURL(file);
      }),
      getImageResolution(file)
    ]);

    return {
      blurScore,
      isBlurry: blurScore < 5,
      resolution,
      fileSize: file.size
    };
  } catch (error) {
    console.error('Failed to calculate quality metrics:', error);
    
    return {
      blurScore: 0,
      isBlurry: true,
      resolution: { width: 0, height: 0 },
      fileSize: file.size
    };
  }
};