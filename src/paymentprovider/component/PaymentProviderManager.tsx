'use client';

import { useEffect, useState } from 'react';
import { PaymentProviderCard } from './PaymentProviderCard';
import {
  createPaymentProvider,
  deletePaymentProvider,
  updatePaymentProvider,
  getAllPaymentProviders,
} from '../service';
import { CreatePaymentProviderPayload, PaymentProvider } from '../service/type';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { RequestHeaders } from 'next/dist/client/components/router-reducer/fetch-server-response';

interface Props {
    getRequestHeaders: () => Promise<RequestHeaders | undefined>
}

export function PaymentProviderManager({
    getRequestHeaders
}: Props) {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);

  const loadProviders = async () => {
    try {
      const all = await getAllPaymentProviders(getRequestHeaders);
      setProviders(all);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment providers';
      toast.error(message);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleCreate = async (data: CreatePaymentProviderPayload) => {
    try {
      const newProvider = await createPaymentProvider(data, getRequestHeaders);
      toast.success('Payment provider created');
      setProviders((prev) => [...prev, newProvider]);
      return newProvider
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment providers';
      toast.error(message);
    }
    return undefined
  };

  const handleUpdate = async (id: string, data: CreatePaymentProviderPayload) => {
    try {
      const updated = await updatePaymentProvider(id, data, getRequestHeaders);
      toast.success('Payment provider updated');
      setProviders((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingProviderId(null);
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment providers';
      toast.error(message);
    }

    return undefined
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePaymentProvider(id, getRequestHeaders);
      toast.success('Payment provider deleted');
      setProviders((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment providers';
      toast.error(message);
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
