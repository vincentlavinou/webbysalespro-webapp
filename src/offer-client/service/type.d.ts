import { offerVisibilityMetadataSchema, offerScarcityUpdateMetadataSchema } from "./schema";

export type StripeCheckout = {
  email: string;
  public_key: string;
  client_secret: string
}

export type OfferMediaDto = {
    id: string;
    name: string | undefined;
    file_url: string;
    file_type: "document" | "image" | "video" | "audio";
    field_type:
    | "thumbnail"
    | "header"
    | "icon"
    | "video_inject"
    | "video_intro"
    | "image_carousel"
    | "slides";
    uploaded_at: string;
};

export type OfferQuantityDto = {
    total: number | undefined;
    attendee_limit: number;
};

export type OfferDisplayDto = {
    cta_label: string;
    badge_text: string;
    accent_color: string;
};

export type OfferScarcityConfigDto = {
    mode: "none" | "real" | "manual" | "hybrid";
    display_total_slots: number | undefined;
    min_display_percent: number | undefined;
    max_display_percent: number | undefined;
};


export type OfferPriceDto = {
  currency: string;
  value: number;            // <-- comment says DecimalField → string; pick one
  compare_at?: number;
  discount_type: "none" | "percentage" | "amount";
  discount_percentage?: number;
  discount_amount?: number;
  effective_price: number;
};

export type OfferMiniDto = {
  id: string;
  name: string;
  subheading: string;
  description: string;
  offer_type: "purchase" | "schedule_call" | "complete_form" | "external_link";
  action_payload: Record<string, unknown>;
  hide_after_conversion: boolean;
  price?: OfferPriceDto;
  quantity?: OfferQuantityDto;
  display?: OfferDisplayDto;
  media: OfferMediaDto[];
  has_price: boolean;
  has_quantity: boolean;
  has_scarcity_config: boolean;
};

export type OfferSessionStatus =
  | "scheduled"
  | "live"
  | "cooldown"
  | "sold_out"
  | "closed";


export interface OfferSessionDto {
  id: string;
  session_id: string;
  offer: OfferMiniDto; // <-- was OfferMini / OfferMini mismatch
  status: OfferSessionStatus;
  real_percent_sold: number | null;
  display_percent_sold: number | null;
  display_total_slots: number | null;
  scarcity_mode: "none" | "real" | "manual" | "hybrid";
}

export type OfferView = "offers-hidden" | "offers-visible" | "offer-selected" | "offer-checkingout" | "offer-purchased"

export type OfferVisibilityMetadata = z.infer<typeof offerVisibilityMetadataSchema>;
export type OfferScarcityUpdateMetadata = z.infer<typeof offerScarcityUpdateMetadataSchema>;
