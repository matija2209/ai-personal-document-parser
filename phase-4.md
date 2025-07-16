# Phase 4: Camera & Image Capture - Detailed Implementation Plan

## Overview
Build a mobile-first camera interface that captures high-quality document images suitable for AI processing, with client-side compression, quality validation, and user-friendly capture flow.

## Technical Approach Decision

**Primary Strategy**: Hybrid approach using both HTML5 input capture and getUserMedia
- **HTML5 Input Capture**: For mobile-first UX (lets phone OS handle camera)
- **getUserMedia**: For advanced features and desktop support
- **Image Compression**: browser-image-compression library for client-side compression
- **Quality Validation**: Custom blur detection based on Laplacian variance

## Dependencies & Libraries

### Required NPM Packages
```bash
npm install browser-image-compression
npm install --save-dev @types/browser-image-compression
```

### Built-in Browser APIs
- `navigator.mediaDevices.getUserMedia()` - Camera access
- `HTMLCanvasElement` - Image processing
- `FileReader` - File handling
- `URL.createObjectURL()` - Blob URLs

---

## PHASE 4 IMPLEMENTATION TASKS

### **Task 4.1: Project Structure Setup**
**Goal**: Create proper folder structure and base components for camera functionality

**Steps**:
1. Create folder structure:
   ```
   src/
   ├── components/
   │   ├── camera/
   │   │   ├── CameraCapture.tsx
   │   │   ├── ImagePreview.tsx
   │   │   ├── QualityIndicator.tsx
   │   │   └── CameraControls.tsx
   │   └── ui/
   │       ├── LoadingSpinner.tsx
   │       └── ErrorMessage.tsx
   ├── lib/
   │   ├── camera/
   │   │   ├── cameraUtils.ts
   │   │   ├── imageCompression.ts
   │   │   ├── qualityValidation.ts
   │   │   └── types.ts
   │   └── utils/
   │       └── fileUtils.ts
   ├── hooks/
   │   └── useCamera.ts
   └── types/
       └── camera.ts
   ```

2. Create base TypeScript types in `src/types/camera.ts`:
   ```typescript
   export interface CameraConfig {
     facingMode: 'user' | 'environment';
     width: number;
     height: number;
   }
   
   export interface CapturedImage {
     file: File;
     preview: string;
     timestamp: number;
     quality: QualityMetrics;
   }
   
   export interface QualityMetrics {
     blurScore: number;
     isBlurry: boolean;
     resolution: { width: number; height: number };
     fileSize: number;
   }
   
   export interface CameraState {
     isActive: boolean;
     stream: MediaStream | null;
     error: string | null;
     isCapturing: boolean;
     capturedImages: CapturedImage[];
   }
   ```

3. Create basic error handling component `src/components/ui/ErrorMessage.tsx`:
   ```typescript
   interface ErrorMessageProps {
     error: string;
     onRetry?: () => void;
     onDismiss?: () => void;
   }
   
   export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry, onDismiss }) => {
     // Basic error display with retry button
   }
   ```

**Definition of Done**: Folder structure created, TypeScript types defined, basic error component exists

---

### **Task 4.2: Camera Permission & Access Setup**
**Goal**: Implement camera permission handling and stream initialization

**Steps**:
1. Create `src/lib/camera/cameraUtils.ts`:
   ```typescript
   export const getCameraPermission = async (): Promise<boolean> => {
     try {
       const stream = await navigator.mediaDevices.getUserMedia({ video: true });
       stream.getTracks().forEach(track => track.stop());
       return true;
     } catch (error) {
       console.error('Camera permission denied:', error);
       return false;
     }
   };
   
   export const initializeCamera = async (config: CameraConfig): Promise<MediaStream> => {
     const constraints = {
       video: {
         facingMode: config.facingMode,
         width: { ideal: config.width },
         height: { ideal: config.height }
       }
     };
     
     return await navigator.mediaDevices.getUserMedia(constraints);
   };
   
   export const stopCamera = (stream: MediaStream | null): void => {
     if (stream) {
       stream.getTracks().forEach(track => track.stop());
     }
   };
   ```

2. Create `src/hooks/useCamera.ts`:
   ```typescript
   export const useCamera = () => {
     const [cameraState, setCameraState] = useState<CameraState>({
       isActive: false,
       stream: null,
       error: null,
       isCapturing: false,
       capturedImages: []
     });
   
     const startCamera = async (config: CameraConfig) => {
       // Implementation for starting camera
     };
   
     const stopCamera = () => {
       // Implementation for stopping camera
     };
   
     const captureImage = async () => {
       // Implementation for capturing image
     };
   
     useEffect(() => {
       return () => {
         stopCamera();
       };
     }, []);
   
     return {
       cameraState,
       startCamera,
       stopCamera,
       captureImage
     };
   };
   ```

3. Handle camera permission errors:
   - `NotAllowedError`: Permission denied
   - `NotFoundError`: No camera found
   - `NotSupportedError`: Camera not supported
   - `OverconstrainedError`: Constraints cannot be satisfied

**Definition of Done**: Camera permission handling works, stream initialization functional, proper error handling for all camera-related errors

---

### **Task 4.3: HTML5 Input Capture Implementation**
**Goal**: Implement mobile-first camera capture using HTML5 input element

**Steps**:
1. Create `src/components/camera/MobileCapture.tsx`:
   ```typescript
   export const MobileCapture: React.FC = () => {
     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
       const file = event.target.files?.[0];
       if (file) {
         processImageFile(file);
       }
     };
   
     return (
       <div className="mobile-capture">
         <input
           type="file"
           accept="image/*"
           capture="environment"
           onChange={handleFileChange}
           style={{ display: 'none' }}
           ref={inputRef}
         />
         <button 
           onClick={() => inputRef.current?.click()}
           className="capture-button"
         >
           Take Photo
         </button>
       </div>
     );
   };
   ```

2. Add file processing logic:
   ```typescript
   const processImageFile = async (file: File) => {
     try {
       // Create preview URL
       const preview = URL.createObjectURL(file);
       
       // Validate file type
       if (!file.type.startsWith('image/')) {
         throw new Error('Invalid file type');
       }
       
       // Check file size (max 10MB)
       if (file.size > 10 * 1024 * 1024) {
         throw new Error('File too large');
       }
       
       // Process image
       const processedImage = await compressAndValidateImage(file);
       
       // Update state
       setCapturedImage(processedImage);
       
     } catch (error) {
       setError(error.message);
     }
   };
   ```

3. Handle mobile-specific considerations:
   - EXIF orientation handling
   - File size validation
   - Image format validation
   - Preview generation

**Definition of Done**: HTML5 input capture works on mobile devices, file validation in place, proper error handling for file processing

---

### **Task 4.4: Image Compression Implementation**
**Goal**: Implement client-side image compression to target 800px width and optimize for AI processing

**Steps**:
1. Create `src/lib/camera/imageCompression.ts`:
   ```typescript
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
   ```

2. Add compression quality validation:
   ```typescript
   export const validateCompression = (original: File, compressed: File): boolean => {
     const compressionRatio = compressed.size / original.size;
     return compressionRatio > 0.1 && compressionRatio < 1; // 10% minimum, not larger than original
   };
   ```

3. Handle compression errors:
   - Out of memory errors
   - Unsupported formats
   - Compression failure
   - Quality degradation warnings

**Definition of Done**: Image compression works reliably, targets 800px width, maintains quality for AI processing, handles errors gracefully

---

### **Task 4.5: Blur Detection & Quality Validation**
**Goal**: Implement blur detection using Laplacian variance method for image quality validation

**Steps**:
1. Create `src/lib/camera/qualityValidation.ts`:
   ```typescript
   export const calculateBlurScore = (imageData: ImageData): number => {
     const { data, width, height } = imageData;
     
     // Convert to grayscale
     const grayscale = new Array(width * height);
     for (let i = 0; i < data.length; i += 4) {
       const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
       grayscale[i / 4] = gray;
     }
     
     // Apply Laplacian filter
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
     
     // Calculate variance
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
   ```

2. Create quality metrics calculation:
   ```typescript
   export const calculateQualityMetrics = async (file: File): Promise<QualityMetrics> => {
     const blurScore = await new Promise<number>((resolve, reject) => {
       // Blur detection implementation
     });
     
     return {
       blurScore,
       isBlurry: blurScore < 5,
       resolution: await getImageResolution(file),
       fileSize: file.size
     };
   };
   ```

3. Add quality indicator component `src/components/camera/QualityIndicator.tsx`:
   ```typescript
   export const QualityIndicator: React.FC<{ quality: QualityMetrics }> = ({ quality }) => {
     const getQualityColor = () => {
       if (quality.isBlurry) return 'text-red-500';
       if (quality.blurScore > 15) return 'text-green-500';
       return 'text-yellow-500';
     };
   
     return (
       <div className={`quality-indicator ${getQualityColor()}`}>
         {quality.isBlurry ? 'Blurry - Please retake' : 'Good quality'}
       </div>
     );
   };
   ```

**Definition of Done**: Blur detection works accurately, quality metrics calculated, visual indicators provide user feedback

---

### **Task 4.6: Main Camera Component Integration**
**Goal**: Create the main camera component that integrates all features

**Steps**:
1. Create `src/components/camera/CameraCapture.tsx`:
   ```typescript
   export const CameraCapture: React.FC = () => {
     const { cameraState, startCamera, stopCamera, captureImage } = useCamera();
     const [currentStep, setCurrentStep] = useState<'capture' | 'review' | 'processing'>('capture');
     const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
   
     const handleCapture = async () => {
       try {
         setCurrentStep('processing');
         const image = await captureImage();
         setCapturedImage(image);
         setCurrentStep('review');
       } catch (error) {
         // Handle error
       }
     };
   
     const handleRetake = () => {
       setCapturedImage(null);
       setCurrentStep('capture');
     };
   
     const handleConfirm = async () => {
       if (capturedImage) {
         await onImageConfirmed(capturedImage);
       }
     };
   
     return (
       <div className="camera-capture">
         {currentStep === 'capture' && (
           <CaptureStep onCapture={handleCapture} />
         )}
         {currentStep === 'review' && capturedImage && (
           <ReviewStep 
             image={capturedImage} 
             onRetake={handleRetake}
             onConfirm={handleConfirm}
           />
         )}
         {currentStep === 'processing' && (
           <ProcessingStep />
         )}
       </div>
     );
   };
   ```

2. Create capture step component:
   ```typescript
   const CaptureStep: React.FC<{ onCapture: () => void }> = ({ onCapture }) => {
     const [useNativeCapture, setUseNativeCapture] = useState(true);
   
     return (
       <div className="capture-step">
         {useNativeCapture ? (
           <MobileCapture onCapture={onCapture} />
         ) : (
           <AdvancedCapture onCapture={onCapture} />
         )}
         <button 
           onClick={() => setUseNativeCapture(!useNativeCapture)}
           className="toggle-capture-mode"
         >
           {useNativeCapture ? 'Use Advanced Camera' : 'Use Simple Camera'}
         </button>
       </div>
     );
   };
   ```

3. Create review step component:
   ```typescript
   const ReviewStep: React.FC<{
     image: CapturedImage;
     onRetake: () => void;
     onConfirm: () => void;
   }> = ({ image, onRetake, onConfirm }) => {
     return (
       <div className="review-step">
         <div className="image-preview">
           <img src={image.preview} alt="Captured document" />
         </div>
         <QualityIndicator quality={image.quality} />
         <div className="review-actions">
           <button onClick={onRetake}>Retake</button>
           <button onClick={onConfirm}>Use This Photo</button>
         </div>
       </div>
     );
   };
   ```

**Definition of Done**: Main camera component works end-to-end, handles all capture flows, provides proper user feedback

---

### **Task 4.7: Document Side Capture Flow**
**Goal**: Implement front/back document capture workflow

**Steps**:
1. Create document capture flow state management:
   ```typescript
   interface DocumentCaptureState {
     currentSide: 'front' | 'back';
     frontImage: CapturedImage | null;
     backImage: CapturedImage | null;
     isBackRequired: boolean;
   }
   
   export const DocumentCapture: React.FC = () => {
     const [captureState, setCaptureState] = useState<DocumentCaptureState>({
       currentSide: 'front',
       frontImage: null,
       backImage: null,
       isBackRequired: false
     });
   
     const handleFrontCaptured = (image: CapturedImage) => {
       setCaptureState(prev => ({ ...prev, frontImage: image }));
       // Ask user if back side is needed
       showBackSidePrompt();
     };
   
     const handleBackCaptured = (image: CapturedImage) => {
       setCaptureState(prev => ({ ...prev, backImage: image }));
       // Complete capture flow
       completeDocumentCapture();
     };
   };
   ```

2. Create back side prompt component:
   ```typescript
   const BackSidePrompt: React.FC<{
     onYes: () => void;
     onNo: () => void;
   }> = ({ onYes, onNo }) => {
     return (
       <div className="back-side-prompt">
         <h3>Does your document have important information on the back?</h3>
         <p>This might include signatures, endorsements, or additional details.</p>
         <div className="prompt-actions">
           <button onClick={onYes}>Yes, capture back side</button>
           <button onClick={onNo}>No, continue</button>
         </div>
       </div>
     );
   };
   ```

3. Handle document completion:
   ```typescript
   const completeDocumentCapture = () => {
     const documentData = {
       front: captureState.frontImage,
       back: captureState.backImage,
       timestamp: Date.now(),
       id: generateDocumentId()
     };
     
     onDocumentCaptured(documentData);
   };
   ```

**Definition of Done**: Front/back capture flow works, user can choose to capture back side, both images are properly managed

---

### **Task 4.8: Error Handling & Edge Cases**
**Goal**: Implement comprehensive error handling for all camera-related scenarios

**Steps**:
1. Create error handling for camera access:
   ```typescript
   export const handleCameraError = (error: Error): string => {
     switch (error.name) {
       case 'NotAllowedError':
         return 'Camera access denied. Please enable camera permissions in your browser settings.';
       case 'NotFoundError':
         return 'No camera found. Please ensure your device has a camera.';
       case 'NotSupportedError':
         return 'Camera not supported. Please try a different browser.';
       case 'OverconstrainedError':
         return 'Camera constraints cannot be satisfied. Please try again.';
       default:
         return 'Camera error occurred. Please try again.';
     }
   };
   ```

2. Add retry mechanisms:
   ```typescript
   export const withRetry = async <T>(
     operation: () => Promise<T>,
     maxRetries: number = 3,
     delay: number = 1000
   ): Promise<T> => {
     let lastError: Error;
     
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await operation();
       } catch (error) {
         lastError = error as Error;
         if (i < maxRetries - 1) {
           await new Promise(resolve => setTimeout(resolve, delay));
         }
       }
     }
     
     throw lastError;
   };
   ```

3. Handle edge cases:
   - Browser doesn't support camera
   - Camera is in use by another app
   - Network issues during processing
   - Memory issues with large images
   - Orientation changes during capture

4. Create fallback mechanisms:
   ```typescript
   const CameraFallback: React.FC = () => {
     return (
       <div className="camera-fallback">
         <h3>Camera not available</h3>
         <p>Please upload an image from your device instead.</p>
         <input type="file" accept="image/*" onChange={handleFileUpload} />
       </div>
     );
   };
   ```

**Definition of Done**: All error scenarios handled gracefully, retry mechanisms in place, fallback options available

---

### **Task 4.9: Performance Optimization**
**Goal**: Optimize camera performance for mobile devices

**Steps**:
1. Implement lazy loading for camera components:
   ```typescript
   const CameraCapture = React.lazy(() => import('./CameraCapture'));
   
   export const CameraPage: React.FC = () => {
     return (
       <Suspense fallback={<CameraLoadingSpinner />}>
         <CameraCapture />
       </Suspense>
     );
   };
   ```

2. Add memory management:
   ```typescript
   export const cleanupImageResources = (images: CapturedImage[]) => {
     images.forEach(image => {
       if (image.preview) {
         URL.revokeObjectURL(image.preview);
       }
     });
   };
   ```

3. Optimize image processing:
   ```typescript
   // Use web workers for heavy processing
   const processImageInWorker = (file: File): Promise<ProcessedImage> => {
     return new Promise((resolve, reject) => {
       const worker = new Worker('/workers/imageProcessor.js');
       worker.postMessage(file);
       worker.onmessage = (e) => resolve(e.data);
       worker.onerror = reject;
     });
   };
   ```

4. Add loading states and progress indicators:
   ```typescript
   const ProcessingIndicator: React.FC<{ progress: number }> = ({ progress }) => {
     return (
       <div className="processing-indicator">
         <div className="progress-bar" style={{ width: `${progress}%` }} />
         <span>Processing image... {progress}%</span>
       </div>
     );
   };
   ```

**Definition of Done**: Camera performance optimized for mobile, memory management implemented, loading states provide user feedback

---

### **Task 4.10: Testing & Integration**
**Goal**: Ensure all camera functionality works reliably across different devices and scenarios

**Steps**:
1. Create test utilities:
   ```typescript
   export const createMockFile = (name: string, size: number): File => {
     const content = new ArrayBuffer(size);
     return new File([content], name, { type: 'image/jpeg' });
   };
   
   export const createMockImageData = (width: number, height: number): ImageData => {
     const data = new Uint8ClampedArray(width * height * 4);
     return new ImageData(data, width, height);
   };
   ```

2. Test camera functionality:
   - Camera permission handling
   - Image capture and compression
   - Quality validation
   - Error scenarios
   - Mobile vs desktop behavior

3. Create integration tests:
   ```typescript
   describe('Camera Integration', () => {
     it('should capture and process image end-to-end', async () => {
       // Test full capture flow
     });
     
     it('should handle camera permission denial', async () => {
       // Test error handling
     });
     
     it('should compress images properly', async () => {
       // Test compression
     });
   });
   ```

4. Manual testing checklist:
   - [ ] Camera opens on mobile devices
   - [ ] Image capture works with both approaches
   - [ ] Quality validation provides feedback
   - [ ] Compression reduces file size appropriately
   - [ ] Error messages are user-friendly
   - [ ] Front/back capture flow works
   - [ ] Performance is acceptable on low-end devices

**Definition of Done**: All functionality tested and working, integration tests pass, manual testing completed, integration with Phase 5 upload works end-to-end

---

## SUCCESS METRICS
- [ ] Camera opens successfully on mobile devices (iOS Safari, Android Chrome)
- [ ] Image capture works with both HTML5 input and getUserMedia
- [ ] Image compression reduces file size while maintaining quality
- [ ] Blur detection accurately identifies poor quality images
- [ ] User can capture both front and back of documents
- [ ] Error handling covers all edge cases
- [ ] Performance is acceptable on mobile devices
- [ ] Integration with next phase (file upload) works properly

## TECHNICAL SPECIFICATIONS
- **Image Target**: 800px width, maintain aspect ratio
- **Compression**: JPEG, 80% quality
- **Blur Threshold**: 5 (Laplacian variance)
- **File Size Limit**: 10MB input, ~1MB output
- **Supported Formats**: JPEG, PNG, WebP
- **Browser Support**: Modern mobile browsers (iOS 12+, Android 8+)

---

### **Task 4.11: Integration with Phase 5 (File Upload & Storage)**
**Goal**: Connect the camera capture flow to the file upload pipeline from Phase 5

**Steps**:
1. **Update Camera Hook to Include Upload**: Modify `src/hooks/useCamera.ts` to integrate with the upload hook from Phase 5:
   ```typescript
   import { useFileUpload } from './useFileUpload';
   
   export const useCamera = () => {
     const { uploadFile, uploadState } = useFileUpload();
     
     const captureAndUpload = async (documentType: string) => {
       try {
         // Capture image
         const capturedImage = await captureImage();
         
         // Create document entry in database
         const documentId = await createDocumentEntry(documentType);
         
         // Upload to R2
         const uploadResult = await uploadFile(
           capturedImage.file, 
           documentType, 
           documentId
         );
         
         return { capturedImage, uploadResult, documentId };
       } catch (error) {
         console.error('Capture and upload failed:', error);
         throw error;
       }
     };
     
     return {
       // ... existing returns
       captureAndUpload,
       uploadState,
     };
   };
   ```

2. **Create Document Entry API**: Add API route `src/app/api/documents/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { auth } from '@clerk/nextjs/server';
   import { prisma } from '@/lib/prisma';
   
   export async function POST(request: NextRequest) {
     try {
       const { userId } = auth();
       
       if (!userId) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
       }
       
       const { documentType, retentionDays } = await request.json();
       
       const document = await prisma.document.create({
         data: {
           userId,
           documentType,
           retentionDays,
           status: 'processing',
         },
       });
       
       return NextResponse.json({ documentId: document.id });
     } catch (error) {
       console.error('Failed to create document:', error);
       return NextResponse.json(
         { error: 'Failed to create document' },
         { status: 500 }
       );
     }
   }
   ```

3. **Update Camera Components**: Modify the camera components to use the integrated flow:
   ```typescript
   // In CameraCapture.tsx
   const { captureAndUpload, uploadState } = useCamera();
   
   const handleConfirm = async () => {
     try {
       setIsProcessing(true);
       const result = await captureAndUpload(documentType);
       
       // Navigate to results page
       router.push(`/dashboard/document/${result.documentId}`);
     } catch (error) {
       setError('Failed to process document');
     } finally {
       setIsProcessing(false);
     }
   };
   ```

4. **Add Progress Tracking**: Include upload progress in the camera interface:
   ```typescript
   // Show upload progress after image capture
   {uploadState.isUploading && (
     <UploadProgress 
       progress={uploadState.progress} 
       fileName={capturedImage.file.name} 
     />
   )}
   ```

**Definition of Done**: Camera capture flow seamlessly connects to file upload and creates database entries

---

### **Task 4.12: Integration with Phase 3 (Authentication)**
**Goal**: Ensure camera functionality respects authentication and user context

**Steps**:
1. **Add Authentication Check**: Update camera pages to require authentication:
   ```typescript
   // In app/(protected)/camera/page.tsx
   import { auth } from '@clerk/nextjs/server';
   
   export default async function CameraPage() {
     const { userId } = auth();
     
     if (!userId) {
       redirect('/sign-in');
     }
     
     return <CameraCapture />;
   }
   ```

2. **Pass User Context**: Ensure camera components have access to user information:
   ```typescript
   // In CameraCapture.tsx
   import { useUser } from '@clerk/nextjs';
   
   export const CameraCapture = () => {
     const { user } = useUser();
     
     // User context available for API calls
   };
   ```

**Definition of Done**: Camera functionality is properly protected and user-aware

---

## NEXT PHASE HANDOFF
- ✅ Images are captured and uploaded to Cloudflare R2
- ✅ Document entries are created in database with proper user association
- ✅ Upload progress is tracked and displayed to users
- ✅ Integration with authentication is complete
- ✅ Ready for Phase 6 (AI Integration) to process uploaded images
- ✅ Error handling covers the complete capture-to-upload flow