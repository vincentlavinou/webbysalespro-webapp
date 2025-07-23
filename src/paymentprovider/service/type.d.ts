export type PaymentProviderType = 'stripe' | 'paypal' | 'fan_basis' | 'network_merchant_inc';

export interface CreatePaymentProviderPayload {
  provider: PaymentProviderType;
  public_key?: string;
  secret_key?: string;
  webhook_secret?: string;
  extra_data?: Record<string, string>;
}

export interface PaymentProvider {
  id: string; // UUID
  provider: PaymentProviderType;
  provider_display: string
  public_key: string | null;
  secret_key: string | null;
  webhook_secret: string | null;
  extra_data: Record<string, string> | null;
  is_active: boolean;
  created_at: string; // ISO 8601 datetime
}