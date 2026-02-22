// linkify.tsx
import React from "react";

type Part =
  | { type: "text"; value: string }
  | { type: "url"; value: string; href: string };

const URL_RE =
  /((?:https?:\/\/|www\.)[^\s<]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|co|gg|app|dev|me|info|biz|xyz|ai|tv|shop|store|live|link)(?:\/[^\s<]*)?)/gi;

function normalizeHref(raw: string) {
  // If it's "www." or "example.com" add https://
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export function linkifyParts(text: string): Part[] {
  if (!text) return [{ type: "text", value: "" }];

  const parts: Part[] = [];
  let lastIndex = 0;

  const matches = text.matchAll(URL_RE);
  for (const match of matches) {
    const raw = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    // Trim common trailing punctuation that people include after links
    const trimmed = raw.replace(/[),.;!?]+$/g, () => {
      // Keep a single ")" if it looks like a markdown-style ")"
      // but generally removing is correct for chat.
      return "";
    });

    parts.push({
      type: "url",
      value: trimmed,
      href: normalizeHref(trimmed),
    });

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}

export function LinkifiedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = linkifyParts(text);

  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.type === "text") return <React.Fragment key={i}>{p.value}</React.Fragment>;

        return (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline underline-offset-2 hover:opacity-90 break-all"
          >
            {p.value}
          </a>
        );
      })}
    </span>
  );
}