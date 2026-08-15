import { z } from "zod";
import type {
  OfferMediaDto,
  OfferMiniDto,
  OfferSessionDto,
} from "@lavinou/webbysalespro/offer";
import type {
  CalendlyCheckoutDto,
  FanbasisCheckoutDto,
  StripeCheckoutDto,
  WhopCheckoutDto,
} from "@lavinou/webbysalespro/paymentprovider";
import { offerVisibilityMetadataSchema, offerScarcityUpdateMetadataSchema } from "./schema";

export type {
  CalendlyCheckoutDto,
  FanbasisCheckoutDto,
  OfferMediaDto,
  OfferMiniDto,
  OfferSessionDto,
  StripeCheckoutDto,
  WhopCheckoutDto,
};

export type OfferView =
  | "offers-hidden"
  | "offers-visible"
  | "offer-selected"
  | "offer-checkingout"
  | "offer-purchased";

export type OfferClientUser = {
  user_id: string;
  registrant_id: string;
  attendance_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
};

export type OfferVisibilityMetadata = z.infer<typeof offerVisibilityMetadataSchema>;
export type OfferScarcityUpdateMetadata = z.infer<typeof offerScarcityUpdateMetadataSchema>;
