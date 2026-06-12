'use client'

import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

type RetryShortLinkButtonProps = {
  onRetry?: () => void
}

export function RetryShortLinkButton({ onRetry }: RetryShortLinkButtonProps) {
  return (
    <Button
      type="button"
      className="mt-6 bg-emerald-600 hover:bg-emerald-700"
      onClick={() => {
        if (onRetry) {
          onRetry()
          return
        }

        window.location.reload()
      }}
    >
      <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
      Try again
    </Button>
  )
}
