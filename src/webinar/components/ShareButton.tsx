'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareButtonProps {
  registrationPath: string
  title: string
}

export default function ShareButton({ registrationPath, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}${registrationPath}`
      : registrationPath

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // user cancelled or API not supported — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Document lost focus (e.g. share sheet dismissed) — silently ignore
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      className="h-auto w-full justify-center rounded-xl bg-card px-4 py-2.5 text-sm font-medium shadow-sm"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-primary" />
          Link Copied!
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 text-primary" />
          Share Registration Link
        </>
      )}
    </Button>
  )
}
