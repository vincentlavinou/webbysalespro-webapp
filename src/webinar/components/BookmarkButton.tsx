'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BookmarkButtonProps {
  /** Path like /{sessionId}/live — origin is prepended client-side */
  livePath: string
}

export default function BookmarkButton({ livePath }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(false)

  async function handleBookmark() {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}${livePath}`
      : livePath

    try {
      await navigator.clipboard.writeText(url)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // Document not focused — silently ignore
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleBookmark}
      className="h-auto w-full justify-center rounded-xl bg-card px-4 py-2.5 text-sm font-medium shadow-sm"
    >
      {saved ? (
        <>
          <BookmarkCheck className="h-4 w-4 text-primary" />
          <span>Copied — save it as a bookmark!</span>
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4 text-primary" />
          Bookmark Your Spot
        </>
      )}
    </Button>
  )
}
