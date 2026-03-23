'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'

interface BookmarkButtonProps {
  /** Path like /{sessionId}/live?token=... — origin is prepended client-side */
  livePath: string
}

export default function BookmarkButton({ livePath }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(false)

  async function handleBookmark() {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}${livePath}`
      : livePath

    await navigator.clipboard.writeText(url)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <button
      onClick={handleBookmark}
      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors w-full justify-center"
    >
      {saved ? (
        <>
          <BookmarkCheck className="h-4 w-4 text-emerald-600" />
          <span>Copied — save it as a bookmark!</span>
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4 text-emerald-600" />
          Bookmark Your Spot
        </>
      )}
    </button>
  )
}
