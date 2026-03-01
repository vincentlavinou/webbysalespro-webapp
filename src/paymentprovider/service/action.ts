'use server'

import { actionClient } from "@/lib/safe-action";
import { handleStatus } from "@/lib/http";
import { paymentProviderApiUrl } from ".";
import { PaymentProvider } from "./type";
import {
  createPaymentProviderSchema,
  deletePaymentProviderSchema,
  getPaymentProviderSchema,
  listPaymentProvidersSchema,
  updatePaymentProviderSchema,
} from "./schema";

export const getAllPaymentProvidersAction = actionClient
  .inputSchema(listPaymentProvidersSchema)
  .action(async ({ parsedInput }) => {
    const response = await fetch(`${paymentProviderApiUrl}/v1/payment-providers/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(parsedInput.headers ?? {}),
      },
    });

    const checkedResponse = await handleStatus(response);
    return (await checkedResponse.json()) as PaymentProvider[];
  });

export const getPaymentProviderAction = actionClient
  .inputSchema(getPaymentProviderSchema)
  .action(async ({ parsedInput }) => {
    const response = await fetch(`${paymentProviderApiUrl}/v1/payment-providers/${parsedInput.provider}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(parsedInput.headers ?? {}),
      },
    });

    const checkedResponse = await handleStatus(response);
    return (await checkedResponse.json()) as PaymentProvider;
  });

export const createPaymentProviderAction = actionClient
  .inputSchema(createPaymentProviderSchema)
  .action(async ({ parsedInput }) => {
    const response = await fetch(`${paymentProviderApiUrl}/v1/payment-providers/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(parsedInput.headers ?? {}),
      },
      body: JSON.stringify(parsedInput.data),
    });

    const checkedResponse = await handleStatus(response);
    return (await checkedResponse.json()) as PaymentProvider;
  });

export const updatePaymentProviderAction = actionClient
  .inputSchema(updatePaymentProviderSchema)
  .action(async ({ parsedInput }) => {
    const response = await fetch(`${paymentProviderApiUrl}/v1/payment-providers/${parsedInput.id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(parsedInput.headers ?? {}),
      },
      body: JSON.stringify(parsedInput.data),
    });

    const checkedResponse = await handleStatus(response);
    return (await checkedResponse.json()) as PaymentProvider;
  });

export const deletePaymentProviderAction = actionClient
  .inputSchema(deletePaymentProviderSchema)
  .action(async ({ parsedInput }) => {
    const response = await fetch(`${paymentProviderApiUrl}/v1/payment-providers/${parsedInput.id}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(parsedInput.headers ?? {}),
      },
    });

    await handleStatus(response);
    return { success: true };
  });
