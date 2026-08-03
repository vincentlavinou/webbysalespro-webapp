/**
 * Final fallback tier of the theme hierarchy (embed/landing page theme ->
 * webinar registration setting theme -> default theme) — used wherever every
 * more specific theme source left a color unset.
 */
export const DEFAULT_REGISTRATION_THEME = {
  primary_color: "#4f46e5",
  secondary_color: "#818cf8",
  background_color: "#fff",
  secondary_background_color: "#eef2ff",
  button_text_color: "#fff",
} as const
