type ScriptAttributeValue = string | boolean

type ParsedEmbedScript = {
  attributes: Record<string, ScriptAttributeValue>
  content?: string
}

const SCRIPT_TAG_PATTERN = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
const ATTRIBUTE_PATTERN = /([^\s=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

function parseScriptAttributes(attributes: string): Record<string, ScriptAttributeValue> {
  const parsedAttributes: Record<string, ScriptAttributeValue> = {}

  for (const match of attributes.matchAll(ATTRIBUTE_PATTERN)) {
    const name = match[1]?.trim()

    if (!name) {
      continue
    }

    const value = match[2] ?? match[3] ?? match[4]
    parsedAttributes[name] = value ?? true
  }

  return parsedAttributes
}

export function parseEmbedHeaderScripts(value: string): ParsedEmbedScript[] {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return []
  }

  if (!/<script[\s>]/i.test(trimmedValue)) {
    return [{ attributes: {}, content: trimmedValue }]
  }

  const parsedScripts: ParsedEmbedScript[] = []

  for (const match of trimmedValue.matchAll(SCRIPT_TAG_PATTERN)) {
    parsedScripts.push({
      attributes: parseScriptAttributes(match[1] ?? ''),
      content: match[2]?.trim() || undefined,
    })
  }

  return parsedScripts
}

export function EmbedHeaderScripts({ value }: { value: string }) {
  const scripts = parseEmbedHeaderScripts(value)

  if (scripts.length === 0) {
    return null
  }

  return (
    <>
      {scripts.map((script, index) => {
        const { content, attributes } = script

        if (content) {
          return (
            <script
              key={`embed-header-script-${index}`}
              {...attributes}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )
        }

        return <script key={`embed-header-script-${index}`} {...attributes} />
      })}
    </>
  )
}
