import { z } from "zod";
import { PaymentProviderType } from "./enum";

export const requestHeadersSchema = z.record(z.string(), z.string()).optional();

export const createPaymentProviderPayloadSchema = z.object({
  provider: z.nativeEnum(PaymentProviderType),
  public_key: z.string().optional(),
  secret_key: z.string().optional(),
  webhook_secret: z.string().optional(),
  extra_data: z.record(z.string(), z.string()).optional(),
});

export const getPaymentProviderSchema = z.object({
  provider: z.string(),
  headers: requestHeadersSchema,
});

export const createPaymentProviderSchema = z.object({
  data: createPaymentProviderPayloadSchema,
  headers: requestHeadersSchema,
});

export const updatePaymentProviderSchema = z.object({
  id: z.string(),
  data: createPaymentProviderPayloadSchema,
  headers: requestHeadersSchema,
});

export const deletePaymentProviderSchema = z.object({
  id: z.string(),
  headers: requestHeadersSchema,
});

export const listPaymentProvidersSchema = z.object({
  headers: requestHeadersSchema,
});
