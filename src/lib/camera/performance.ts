import { CapturedImage } from '@/types/camera';

export const cleanupImageResources = (images: CapturedImage[]) => {
  images.forEach(image => {
    if (image.preview) {
      URL.revokeObjectURL(image.preview);
    }
  });
};

export const cleanupSingleImage = (image: CapturedImage | null) => {
  if (image?.preview) {
    URL.revokeObjectURL(image.preview);
  }
};

export const throttle = <T extends any[]>(
  func: (...args: T) => void,
  delay: number
): ((...args: T) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: T) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

export const debounce = <T extends any[]>(
  func: (...args: T) => void,
  delay: number
): ((...args: T) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

export const createImageWorker = (): Worker | null => {
  if (typeof Worker !== 'undefined') {
    try {
      const workerBlob = new Blob([`
        self.onmessage = function(e) {
          const { imageData, operation } = e.data;
          
          try {
            let result;
            
            switch (operation) {
              case 'compress':
                // Basic compression logic
                result = { success: true, data: imageData };
                break;
              case 'analyze':
                // Basic analysis logic
                result = { success: true, quality: 'good' };
                break;
              default:
                result = { success: false, error: 'Unknown operation' };
            }
            
            self.postMessage(result);
          } catch (error) {
            self.postMessage({ success: false, error: error.message });
          }
        };
      `], { type: 'application/javascript' });
      
      return new Worker(URL.createObjectURL(workerBlob));
    } catch (error) {
      console.warn('Could not create image worker:', error);
      return null;
    }
  }
  
  return null;
};

export const processImageInWorker = (
  worker: Worker, 
  imageData: any, 
  operation: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Worker timeout'));
    }, 10000);

    worker.onmessage = (e) => {
      clearTimeout(timeout);
      if (e.data.success) {
        resolve(e.data);
      } else {
        reject(new Error(e.data.error));
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timeout);
      reject(error);
    };

    worker.postMessage({ imageData, operation });
  });
};

export const getDeviceCapabilities = () => {
  const isLowEndDevice = () => {
    if (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator) {
      return navigator.hardwareConcurrency <= 2;
    }
    return false;
  };

  const getMemoryInfo = () => {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  };

  const isSlowNetwork = () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
    }
    return false;
  };

  return {
    isLowEnd: isLowEndDevice(),
    memory: getMemoryInfo(),
    slowNetwork: isSlowNetwork()
  };
};

export const optimizeForDevice = () => {
  const capabilities = getDeviceCapabilities();
  
  return {
    compressionQuality: capabilities.isLowEnd ? 0.6 : 0.8,
    maxResolution: capabilities.isLowEnd ? 600 : 800,
    useWebWorker: !capabilities.isLowEnd,
    processingDelay: capabilities.isLowEnd ? 1000 : 500
  };
};