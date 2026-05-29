// moderation.ts

import { profanity, CensorType } from "@2toad/profanity";

export type ModerationRole = "attendee" | "presenter" | "host" | "system";

export type ModerationDecisionCode =
  | "EMPTY"
  | "TOO_LONG"
  | "HAS_URL"
  | "HAS_EMAIL"
  | "HAS_PHONE"
  | "SPAM_PATTERN"
  | "PROFANITY"
  | "REPEATED_CHARS"
  | "REPEATED_TOKENS";

export type ModerationDecision = {
  ok: boolean;
  censoredText?: string;
  reasons?: {
    code: ModerationDecisionCode;
    message: string;
    match?: string;
  }[];
};

export type ModerationOptions = {
  role?: ModerationRole;
  maxLength?: number;
  minLength?: number;

  // Profanity
  profanityMode?: "block" | "mask"; // default: block
  censorType?: CensorType;

  // Links
  blockLinksForRoles?: ModerationRole[];

  // Contact info
  blockEmailsForRoles?: ModerationRole[];
  blockPhonesForRoles?: ModerationRole[];

  // Spam
  blockSpamPatterns?: boolean;
};

const DEFAULT_OPTIONS: Required<ModerationOptions> = {
  role: "attendee",
  maxLength: 400,
  minLength: 1,
  profanityMode: "block",
  censorType: CensorType.Word,
  blockLinksForRoles: ["attendee"],
  blockEmailsForRoles: ["attendee"],
  blockPhonesForRoles: ["attendee"],
  blockSpamPatterns: true,
};

// --- Main Function ---

export function moderateText(
  input: string,
  options: ModerationOptions = {}
): ModerationDecision {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const reasons: ModerationDecision["reasons"] = [];

  const text = (input ?? "").trim();

  // EMPTY
  if (text.length < opts.minLength) {
    return {
      ok: false,
      reasons: [{ code: "EMPTY", message: "Message is empty." }],
    };
  }

  // LENGTH
  if (text.length > opts.maxLength) {
    reasons.push({
      code: "TOO_LONG",
      message: `Message exceeds ${opts.maxLength} characters.`,
    });
  }

  // PROFANITY
  if (profanity.exists(text)) {
    if (opts.profanityMode === "block") {
      reasons.push({
        code: "PROFANITY",
        message: "Message contains inappropriate language.",
      });
    } else {
      // mask mode
      const censored = profanity.censor(text, opts.censorType );

      return {
        ok: true,
        censoredText: censored,
      };
    }
  }

  // LINK BLOCKING — matches http/https/www prefixed URLs and bare domains (e.g. pornhub.com)
  const containsUrl =
    /\b((https?:\/\/)|www\.)\S+/i.test(text) ||
    /\b[a-z0-9-]{2,}\.(com|net|org|io|co|tv|me|info|biz|xyz|app|site|live|online|club|xxx|adult|sex|porn|edu|gov|uk|ca|de|fr|au|ru|cn|br|jp)\b/i.test(text);

  if (
    containsUrl &&
    opts.blockLinksForRoles.includes(opts.role)
  ) {
    reasons.push({
      code: "HAS_URL",
      message: "Links are not allowed.",
    });
  }

  // EMAIL BLOCKING — standard addresses, plus lightly obfuscated forms
  // like "name (at) gmail dot com".
  const containsEmail =
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text) ||
    /[a-z0-9._%+-]+\s*(?:@|\(?\s*at\s*\)?|\[\s*at\s*\])\s*[a-z0-9.-]+\s*(?:\.|\(?\s*dot\s*\)?|\[\s*dot\s*\])\s*[a-z]{2,}/i.test(
      text
    );

  if (containsEmail && opts.blockEmailsForRoles.includes(opts.role)) {
    reasons.push({
      code: "HAS_EMAIL",
      message: "Email addresses are not allowed.",
    });
  }

  // PHONE BLOCKING — a run of 7–15 digits, allowing common separators
  // (spaces, dashes, dots, parentheses) and an optional leading "+".
  const phoneMatch = text.match(/\+?\d(?:[\d\s().-]{5,}\d)/);
  const phoneDigits = phoneMatch ? phoneMatch[0].replace(/\D/g, "").length : 0;
  const containsPhone = phoneDigits >= 7 && phoneDigits <= 15;

  if (containsPhone && opts.blockPhonesForRoles.includes(opts.role)) {
    reasons.push({
      code: "HAS_PHONE",
      message: "Phone numbers are not allowed.",
    });
  }

  // SPAM PATTERNS
  if (opts.blockSpamPatterns) {
    const spamRegex =
      /\b(dm me|whatsapp|telegram|crypto|forex|airdrop|earn \$?\d+|free money)\b/i;

    if (spamRegex.test(text)) {
      reasons.push({
        code: "SPAM_PATTERN",
        message: "Message appears to be spam.",
      });
    }
  }

  // REPEATED CHAR CHECK (e.g. heyyyyyyyyy)
  const repeatedChar = /(.)\1{7,}/i;
  if (repeatedChar.test(text)) {
    reasons.push({
      code: "REPEATED_CHARS",
      message: "Too many repeated characters.",
    });
  }

  // REPEATED WORD CHECK (e.g. buy buy buy buy buy buy)
  const tokens = text.toLowerCase().split(/\s+/);
  let repeatCount = 1;
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] === tokens[i - 1]) {
      repeatCount++;
      if (repeatCount >= 6) {
        reasons.push({
          code: "REPEATED_TOKENS",
          message: "Too many repeated words.",
        });
        break;
      }
    } else {
      repeatCount = 1;
    }
  }

  return {
    ok: reasons.length === 0,
    ...(reasons.length ? { reasons } : {}),
  };
}