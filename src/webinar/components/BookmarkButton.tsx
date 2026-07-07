'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'

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
    <button
      onClick={handleBookmark}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
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
    </button>
  )
}
