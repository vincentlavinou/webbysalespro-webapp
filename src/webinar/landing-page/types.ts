import type { Webinar } from "@/webinar/service";

export type LandingPageFontFamily =
  | "system"
  | "inter"
  | "roboto"
  | "georgia"
  | "playfair_display"
  | "poppins";

export type LandingPageTheme = {
  background_color: string;
  primary_color: string;
  secondary_color: string;
  secondary_background_color: string;
  button_text_color: string;
  font_family: LandingPageFontFamily;
};

export type LandingPageAction =
  | { kind: "open_registration_form" }
  | { kind: "scroll_to_block"; block_id: string }
  | { kind: "external_url"; url: string };

export type RichText = {
  level?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  spans: { text: string; style?: "bold" | "bold_primary" | "link"; action?: LandingPageAction }[];
};

export type LandingPageBlock = {
  id: string;
  type: "hero" | "text" | "image" | "video" | "testimonial" | "countdown" | "bullets" | "faq" | "logos" | "registration_form" | "footer";
  config: {
    headline?: RichText;
    subheadline?: RichText;
    cta_primary?: { label: string; action: LandingPageAction };
    cta_secondary?: { label: string; action: LandingPageAction };
    background_image_url?: string;
    lines?: RichText[];
    image_url?: string;
    alt_text?: string;
    provider?: "youtube" | "vimeo" | "wistia" | "url";
    url?: string;
    quote?: RichText;
    name?: string;
    title?: string;
    photo_url?: string;
    target?: "session_start" | "custom";
    target_datetime?: string;
    items?: { text?: string; question?: string; answer?: string; image_url?: string }[];
    cta_label?: string;
    links?: { label: string; action: LandingPageAction }[];
  };
};

export type LandingPageRow = { id: string; blocks: LandingPageBlock[] };

export type LandingPageRender = {
  name: string;
  slug: string;
  definition: { rows: LandingPageRow[] };
  theme: LandingPageTheme;
  header_scripts: string;
  success_url: string | null;
  webinar: { id: string; title: string; sub_title?: string | null };
};

export type LandingPageRenderProps = {
  page: LandingPageRender;
  webinar: Webinar;
};
