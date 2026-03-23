'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

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

    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors w-full justify-center"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-600" />
          Link Copied!
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 text-emerald-600" />
          Share Registration Link
        </>
      )}
    </button>
  )
}
