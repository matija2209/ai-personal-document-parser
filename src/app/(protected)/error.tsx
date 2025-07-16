'use client'

import AuthErrorBoundary from '@/components/AuthErrorBoundary'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <AuthErrorBoundary error={error} reset={reset} />
}