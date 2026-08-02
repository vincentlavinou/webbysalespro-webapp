'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

// schemas/payment-provider-schema.ts

import { z } from 'zod';
import { PaymentProvider } from '../service/type';

export const paymentProviderSchema = z
  .object({
    provider: z.enum(['stripe', 'paypal', 'fan_basis', 'whop', 'calendly']),
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
  { label: 'Whop', value: 'whop' },
  { label: 'Calendly', value: 'calendly' },
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
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="font-bold">Provider</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROVIDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {provider === 'stripe' && (
              <div className="flex flex-col gap-2">
                <FormField
                  control={form.control}
                  name="public_key"
                  render={({ field }) => (
                    <FormItem className="gap-1">
                      <FormLabel>Public Key</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secret_key"
                  render={({ field }) => (
                    <FormItem className="gap-1">
                      <FormLabel>Secret Key</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="webhook_secret"
                  render={({ field }) => (
                    <FormItem className="gap-1">
                      <FormLabel>Webhook Secret</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <Button type="submit" className="w-full">
              Save Payment Provider
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
