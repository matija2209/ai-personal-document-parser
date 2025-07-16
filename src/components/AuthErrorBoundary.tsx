'use client'

import { useEffect } from 'react'

interface AuthErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AuthErrorBoundary({ error, reset }: AuthErrorBoundaryProps) {
  useEffect(() => {
    console.error('Authentication error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Authentication Error
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          There was a problem with authentication. Please try again.
        </p>
        <button
          onClick={reset}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}