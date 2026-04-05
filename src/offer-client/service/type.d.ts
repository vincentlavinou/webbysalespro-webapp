import { offerVisibilityMetadataSchema, offerScarcityUpdateMetadataSchema } from "./schema";
import { PaymentProviderType } from "@/paymentprovider/service/enum";

export type StripeCheckout = {
  email: string;
  public_key: string;
  client_secret: string
}

export type FanbasisCheckoutDto = {
  url?: string;                        // financing / external checkout link
  fanbasis_product_id?: string;        // maps to productId in SDK
  fanbasis_creator_id?: string;        // backend to add — maps to creatorId in SDK
  checkout_session_secret?: string;    // backend to add — maps to checkoutSessionSecret in SDK
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
  payment_provider: PaymentProviderType | null;
  action_payload: Record<string, unknown>;
  is_production: boolean;
  hide_after_conversion: boolean;
  price?: OfferPriceDto;
  quantity?: OfferQuantityDto;
  display?: OfferDisplayDto;
  media: OfferMediaDto[];
  has_price: boolean;
  has_quantity: boolean;
  has_scarcity_config: boolean;
  payment_config?: {
    enabled_methods: {
      slug: string,
      title: string,
      description: string
    }[]
  };
  post_purchase_config?: {
    redirect_url: string | null;       // if set, show a CTA button navigating here
    continue_button_text: string;      // label for the redirect button
  };
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
  display_available_count: number | null;
  display_type: "percentage" | "count" | null;
  quantity_total: number | null;
  scarcity_mode: "none" | "real" | "manual";
}

export type OfferView = "offers-hidden" | "offers-visible" | "offer-selected" | "offer-checkingout" | "offer-purchased"

export type OfferClientUser = {
  user_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export type OfferVisibilityMetadata = z.infer<typeof offerVisibilityMetadataSchema>;
export type OfferScarcityUpdateMetadata = z.infer<typeof offerScarcityUpdateMetadataSchema>;
