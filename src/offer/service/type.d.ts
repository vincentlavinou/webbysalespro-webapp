import { WebinarMedia } from "@/media"

export type WebinarOffer = {
  id: string;
  webinar: string; // UUID of the parent webinar
  provider: string;
  provider_display: string;
  internal_name: string;
  headline: string;
  description: string;
  price: number;
  currency: string; // e.g., 'USD', 'EUR'
  media: WebinarMedia[]
  is_active?: boolean;
  quantity_limit?: number | null;
  start_time?: string | null; // ISO 8601 string
  end_time?: string | null;   // ISO 8601 string
  currency_display: string; // e.g., 'US Dollar'
  created_at: string;
  updated_at: string;
};