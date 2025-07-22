'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// schemas/payment-provider-schema.ts

import { z } from 'zod';
import { PaymentProvider, PaymentProviderType } from '../service/type';

export const paymentProviderSchema = z
  .object({
    provider: z.enum(['stripe', 'paypal', 'fan_basis', 'network_merchant_inc']),
    public_key: z.string().optional(),
    secret_key: z.string().optional(),
    webhook_secret: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.provider === 'stripe') {
      if (!data.public_key?.startsWith('pk_')) {
        ctx.addIssue({
          path: ['public_key'],
          code: z.ZodIssueCode.custom,
          message: 'Public key must start with pk_',
        });
      }
      if (!data.secret_key?.startsWith('sk_')) {
        ctx.addIssue({
          path: ['secret_key'],
          code: z.ZodIssueCode.custom,
          message: 'Secret key must start with sk_',
        });
      }
      if (!data.webhook_secret?.startsWith('whsec_')) {
        ctx.addIssue({
          path: ['webhook_secret'],
          code: z.ZodIssueCode.custom,
          message: 'Webhook secret must start with whsec_',
        });
      }
    }
  });


export type PaymentProviderFormValues = z.infer<typeof paymentProviderSchema>;


interface Props {
  defaultValues?: PaymentProvider;
  onSubmit: (data: PaymentProviderFormValues) => Promise<PaymentProvider | undefined>;
}

const PROVIDER_OPTIONS = [
  { label: 'Stripe', value: 'stripe' },
  { label: 'PayPal', value: 'paypal' },
  { label: 'FanBasis', value: 'fan_basis' },
  { label: 'NetworkMerchant', value: 'network_merchant_inc' },
];

export function PaymentProviderCard({ defaultValues, onSubmit }: Props) {
  const form = useForm<PaymentProviderFormValues>({
    resolver: zodResolver(paymentProviderSchema),
    defaultValues: defaultValues as PaymentProviderFormValues ?? { provider: 'stripe' },
  });

  const provider = form.watch('provider');

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <Card className="w-full p-4 space-y-4 bg-accent">
      <CardHeader>
        <CardTitle>
          {defaultValues ? 'Update Payment Provider' : 'Set Payment Provider'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label className="font-bold">Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => form.setValue('provider', value as PaymentProviderType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {provider === 'stripe' && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <Label>Public Key</Label>
                <Input {...form.register('public_key')} />
                {form.formState.errors.public_key && (
                  <p className="text-sm text-red-500">{form.formState.errors.public_key.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Label>Secret Key</Label>
                <Input type="password" {...form.register('secret_key')} />
                {form.formState.errors.secret_key && (
                  <p className="text-sm text-red-500">{form.formState.errors.secret_key.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Label>Webhook Secret</Label>
                <Input type="password" {...form.register('webhook_secret')} />
                {form.formState.errors.webhook_secret && (
                  <p className="text-sm text-red-500">{form.formState.errors.webhook_secret.message}</p>
                )}
              </div>
            </div>
          )}

          <Button type="submit" className="w-full">
            Save Payment Provider
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
