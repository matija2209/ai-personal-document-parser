export const SUPPORTED_DOCUMENT_TYPES = {
  driving_license: 'Driving License',
  passport: 'Passport',
  id_card: 'ID Card'
} as const;

export const SUPPORTED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
] as const;

export const FILE_SIZE_LIMITS = {
  max: 10 * 1024 * 1024, // 10MB
  min: 1024 // 1KB
} as const;

export const RETENTION_PERIODS = {
  delete_now: 0,
  one_day: 1,
  one_week: 7,
  one_month: 30,
  three_months: 90,
  one_year: 365,
  keep_forever: null
} as const;

export const API_ENDPOINTS = {
  documents: '/api/documents',
  upload: '/api/upload',
  process: '/api/process',
  users: '/api/users'
} as const;

export const AI_MODELS = {
  gemini: 'gemini-1.5-flash',
  openai: 'gpt-4o-mini',
  openrouter: 'anthropic/claude-3.5-sonnet'
} as const;

export const IMAGE_COMPRESSION = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1920,
  useWebWorker: true
} as const;