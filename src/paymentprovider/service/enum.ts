
export enum PaymentProviderType {
    STRIPE = 'stripe',
    PAYPAL = 'paypal',
    FAN_BASIS = 'fan_basis',
    NETWORK_MERCHANT_INC = 'network_merchant_inc'
}

export function getPaymentProviderLabel(provider: PaymentProviderType): string {
  switch (provider) {
    case PaymentProviderType.STRIPE:
      return 'Stripe'
    case PaymentProviderType.PAYPAL:
      return 'PayPal'
    case PaymentProviderType.FAN_BASIS:
      return 'FanBasis'
    case PaymentProviderType.NETWORK_MERCHANT_INC:
      return 'Network Merchant'
    default:
      return provider
  }
}