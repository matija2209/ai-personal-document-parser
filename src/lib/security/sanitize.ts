export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 255);
}

export function validateFileType(mimeType: string): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return allowedTypes.includes(mimeType);
}

export function sanitizeUserInput(input: string): string {
  // Remove potentially dangerous characters
  return input.replace(/[<>\"'&]/g, '').trim();
}

export function validateFileSize(size: number): boolean {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const minSize = 1024; // 1KB
  return size >= minSize && size <= maxSize;
}

export function generateSecureFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const sanitizedName = sanitizeFileName(originalName);
  const extension = sanitizedName.split('.').pop();
  
  return `${timestamp}-${randomString}.${extension}`;
}