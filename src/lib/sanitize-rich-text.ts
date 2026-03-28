const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "em",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "u",
  "ul",
])

function sanitizeHref(rawHref: string) {
  const href = rawHref.trim()

  if (!href) {
    return null
  }

  if (
    href.startsWith("/") ||
    href.startsWith("#") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href
  }

  return null
}

export function sanitizeRichText(html: string) {
  if (!html) {
    return ""
  }

  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*\/?\s*>/gi, "")
    .replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (_, rawTag: string, rawAttributes: string) => {
      const tag = rawTag.toLowerCase()
      const isClosingTag = _.startsWith("</")

      if (!ALLOWED_TAGS.has(tag)) {
        return ""
      }

      if (isClosingTag) {
        return `</${tag}>`
      }

      if (tag !== "a") {
        return `<${tag}>`
      }

      const hrefMatch = rawAttributes.match(/\shref\s*=\s*(['"])(.*?)\1/i)
      const href = hrefMatch ? sanitizeHref(hrefMatch[2]) : null
      const targetMatch = rawAttributes.match(/\starget\s*=\s*(['"])(.*?)\1/i)
      const target = targetMatch?.[2] === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : ""

      if (!href) {
        return "<a>"
      }

      return `<a href="${href.replace(/"/g, "&quot;")}"${target}>`
    })
}
