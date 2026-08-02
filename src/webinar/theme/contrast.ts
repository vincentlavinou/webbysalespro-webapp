function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return null;
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Host-chosen theme backgrounds are independent of the visitor's own
 * light/dark preference, so foreground/border tokens must be derived from
 * the background's own lightness rather than inherited from the app's
 * `--foreground`/`--border` — otherwise a dark theme background (or a
 * visitor in dark mode viewing a default-light theme) renders unreadable text.
 */
export function buildContrastTokens(backgroundHex: string) {
  const rgb = hexToRgb(backgroundHex);
  const isDark = rgb ? relativeLuminance(rgb) < 0.5 : false;
  return isDark
    ? {
        foreground: "oklch(0.97 0.005 277)",
        mutedForeground: "oklch(0.72 0.02 277)",
        border: "oklch(1 0 0 / 14%)",
      }
    : {
        foreground: "oklch(0.18 0.02 277)",
        mutedForeground: "oklch(0.48 0.025 277)",
        border: "oklch(0 0 0 / 10%)",
      };
}
