'use client';

import { useCallback, useEffect, useState } from 'react';
import { PaymentProviderCard } from './PaymentProviderCard';
import {
  createPaymentProviderAction,
  deletePaymentProviderAction,
  updatePaymentProviderAction,
  getAllPaymentProvidersAction,
} from '../service';
import { CreatePaymentProviderPayload, PaymentProvider } from '../service/type';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { RequestHeaders } from 'next/dist/client/components/router-reducer/fetch-server-response';
import { useAction } from 'next-safe-action/hooks';

interface Props {
    getRequestHeaders: () => Promise<RequestHeaders | undefined>
}

export function PaymentProviderManager({
    getRequestHeaders
}: Props) {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);

  const resolveHeaders = useCallback(async (): Promise<Record<string, string> | undefined> => {
    const rawHeaders = await getRequestHeaders();
    if (!rawHeaders) return undefined;

    if (rawHeaders instanceof Headers) {
      return Object.fromEntries(rawHeaders.entries());
    }

    return Object.entries(rawHeaders).reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = value;
      }
      return acc;
    }, {});
  }, [getRequestHeaders]);

  const { executeAsync: listPaymentProviders } = useAction(getAllPaymentProvidersAction, {
    onError: ({ error: { serverError } }) => {
      toast.error(serverError || 'Failed to load payment providers');
    },
  });

  const { executeAsync: createProvider } = useAction(createPaymentProviderAction, {
    onError: ({ error: { serverError } }) => {
      toast.error(serverError || 'Failed to create payment provider');
    },
  });

  const { executeAsync: updateProvider } = useAction(updatePaymentProviderAction, {
    onError: ({ error: { serverError } }) => {
      toast.error(serverError || 'Failed to update payment provider');
    },
  });

  const { executeAsync: removeProvider } = useAction(deletePaymentProviderAction, {
    onError: ({ error: { serverError } }) => {
      toast.error(serverError || 'Failed to delete payment provider');
    },
  });

  const loadProviders = useCallback(async () => {
    try {
      const result = await listPaymentProviders({ headers: await resolveHeaders() });
      if (result?.data) {
        setProviders(result.data);
      }
    } catch {
      toast.error('Failed to load payment providers');
    }
  }, [listPaymentProviders, resolveHeaders]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleCreate = async (data: CreatePaymentProviderPayload) => {
    try {
      const result = await createProvider({ data, headers: await resolveHeaders() });
      const newProvider = result?.data;
      if (!newProvider) {
        return undefined;
      }
      toast.success('Payment provider created');
      setProviders((prev) => [...prev, newProvider]);
      return newProvider
    } catch {
      toast.error('Failed to create payment provider');
    }
    return undefined
  };

  const handleUpdate = async (id: string, data: CreatePaymentProviderPayload) => {
    try {
      const result = await updateProvider({ id, data, headers: await resolveHeaders() });
      const updated = result?.data;
      if (!updated) {
        return undefined;
      }
      toast.success('Payment provider updated');
      setProviders((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingProviderId(null);
      return updated
    } catch {
      toast.error('Failed to update payment provider');
    }

    return undefined
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await removeProvider({ id, headers: await resolveHeaders() });
      if (!result?.data?.success) {
        return;
      }
      toast.success('Payment provider deleted');
      setProviders((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error('Failed to delete payment provider');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Add New Payment Provider</h2>
      <PaymentProviderCard onSubmit={handleCreate} />

      {providers.length > 0 && (
        <>
          <h3 className="text-md font-semibold mt-6">Existing Providers</h3>
          <div className="space-y-6">
            {providers.map((provider) => (
              <div key={provider.id} className="relative border p-4 rounded-md bg-muted">
                {editingProviderId === provider.id ? (
                  <PaymentProviderCard
                    defaultValues={provider}
                    onSubmit={(data) => handleUpdate(provider.id, data)}
                  />
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">{provider.provider}</p>
                    <p className="text-xs text-muted-foreground">
                      {provider.public_key ? `Public Key: ${provider.public_key}` : 'No public key'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingProviderId(provider.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(provider.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
