"use client"

import { useEffect } from "react"

/**
 * Embeds are iframed into host pages whose theme we cannot detect, so we never
 * follow the visitor's device dark mode here. The root next-themes provider
 * re-applies `.dark` on hydration and on system theme changes; this guard keeps
 * the embed document locked to light without polluting the user's stored theme.
 */
export function ForceLightTheme() {
  useEffect(() => {
    const html = document.documentElement

    const enforce = () => {
      if (html.classList.contains("dark")) html.classList.remove("dark")
      if (html.style.colorScheme !== "light") html.style.colorScheme = "light"
    }

    enforce()

    const observer = new MutationObserver(enforce)
    observer.observe(html, { attributes: true, attributeFilter: ["class", "style"] })

    return () => observer.disconnect()
  }, [])

  return null
}
