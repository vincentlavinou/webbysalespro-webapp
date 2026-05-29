// linkify.tsx
import React from "react";

type Part =
  | { type: "text"; value: string }
  | { type: "url"; value: string; href: string }
  | { type: "email"; value: string; href: string }
  | { type: "phone"; value: string; href: string };

// Match emails first so the domain part of an address isn't picked up as a URL.
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

const URL_RE =
  /(?:https?:\/\/|www\.)[^\s<]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|co|gg|app|dev|me|info|biz|xyz|ai|tv|shop|store|live|link)(?:\/[^\s<]*)?/i;

// Phone numbers: optional leading +, then at least 7 digits possibly broken up
// by spaces, dashes, dots or parentheses. Anchored so the run starts/ends on a digit.
const PHONE_RE = /\+?\d(?:[\d\s().-]{5,}\d)/;

// Combined matcher. Order matters: email, then url, then phone.
const COMBINED_RE = new RegExp(
  `(${EMAIL_RE.source})|(${URL_RE.source})|(${PHONE_RE.source})`,
  "gi"
);

function normalizeHref(raw: string) {
  // If it's "www." or "example.com" add https://
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function normalizeTel(raw: string) {
  // Keep a leading "+" and digits only for the tel: target.
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  return `tel:${hasPlus ? "+" : ""}${digits}`;
}

function countDigits(raw: string) {
  return (raw.match(/\d/g) ?? []).length;
}

export function linkifyParts(text: string): Part[] {
  if (!text) return [{ type: "text", value: "" }];

  const parts: Part[] = [];
  let lastIndex = 0;

  const matches = text.matchAll(COMBINED_RE);
  for (const match of matches) {
    const raw = match[0];
    const index = match.index ?? 0;
    const [, emailMatch, urlMatch, phoneMatch] = match;

    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    // Trim common trailing punctuation that people include after links/numbers.
    const trimmed = raw.replace(/[),.;!?]+$/g, "");

    if (emailMatch) {
      parts.push({
        type: "email",
        value: trimmed,
        href: `mailto:${trimmed}`,
      });
    } else if (urlMatch) {
      parts.push({
        type: "url",
        value: trimmed,
        href: normalizeHref(trimmed),
      });
    } else if (phoneMatch && countDigits(trimmed) >= 7 && countDigits(trimmed) <= 15) {
      parts.push({
        type: "phone",
        value: trimmed,
        href: normalizeTel(trimmed),
      });
    } else {
      // Not a confident match (e.g. a long number that isn't a phone) — keep as text.
      parts.push({ type: "text", value: raw });
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}

const LINK_CLASS =
  "whitespace-normal underline underline-offset-2 hover:opacity-90 break-words [overflow-wrap:anywhere] [word-break:break-word]";

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

        if (p.type === "url") {
          return (
            <a
              key={i}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={LINK_CLASS}
            >
              {p.value}
            </a>
          );
        }

        // email -> mailto:, phone -> tel:
        return (
          <a key={i} href={p.href} className={LINK_CLASS}>
            {p.value}
          </a>
        );
      })}
    </span>
  );
}
