'use server'

import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response";
import { CreatePaymentProviderPayload, PaymentProvider } from "./type";
import { paymentProviderApiUrl } from ".";

export async function getAllPaymentProviders(
  getRequestHeaders: () => Promise<RequestHeaders | undefined>
) {
  const res = await fetch(`${paymentProviderApiUrl}/v1/payment-providers/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(await getRequestHeaders()),
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.detail || 'Failed to fetch payment providers');
  }

  return res.json(); // returns PaymentProvider[]
}


export async function getPaymentProvider(
  provider: string,
  getRequestHeaders: () => Promise<RequestHeaders | undefined>
) {
  const res = await fetch(`${paymentProviderApiUrl}/v1/payment-providers/${provider}/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(await getRequestHeaders()),
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.detail || 'Failed to fetch payment provider');
  }

  return res.json(); // returns PaymentProvider instance
}


export async function createPaymentProvider(data: CreatePaymentProviderPayload, getRequestHeaders: () => Promise<RequestHeaders | undefined>): Promise<PaymentProvider> {
  const res = await fetch(`${paymentProviderApiUrl}/v1/payment-providers/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getRequestHeaders())
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.detail || 'Failed to create payment provider');
  }

  return res.json(); // returns the created PaymentProvider instance
}

export async function updatePaymentProvider(
  id: string,
  data: CreatePaymentProviderPayload,
  getRequestHeaders: () => Promise<RequestHeaders | undefined>
): Promise<PaymentProvider> {
  const res = await fetch(`${paymentProviderApiUrl}/v1/payment-providers/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(await getRequestHeaders()),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.detail || 'Failed to update payment provider');
  }

  return res.json(); // returns updated PaymentProvider instance
}

export async function deletePaymentProvider(
  id: string,
  getRequestHeaders: () => Promise<RequestHeaders | undefined>
) {
  const res = await fetch(`${paymentProviderApiUrl}/v1/payment-providers/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(await getRequestHeaders()),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.detail || 'Failed to delete payment provider');
  }

  return true;
}
