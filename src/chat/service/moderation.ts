// moderation.ts

import { profanity, CensorType } from "@2toad/profanity";

export type ModerationRole = "attendee" | "presenter" | "host" | "system";

export type ModerationDecisionCode =
  | "EMPTY"
  | "TOO_LONG"
  | "HAS_URL"
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

  // LINK BLOCKING
  const containsUrl = /\b((https?:\/\/)|www\.)[^\s]+/i.test(text);

  if (
    containsUrl &&
    opts.blockLinksForRoles.includes(opts.role)
  ) {
    reasons.push({
      code: "HAS_URL",
      message: "Links are not allowed.",
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