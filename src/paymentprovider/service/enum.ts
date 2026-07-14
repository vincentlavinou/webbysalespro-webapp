
export enum PaymentProviderType {
    STRIPE = 'stripe',
    PAYPAL = 'paypal',
    FAN_BASIS = 'fan_basis',
    WHOP = 'whop',
    CALENDLY = 'calendly'
}

export function getPaymentProviderLabel(provider: PaymentProviderType): string {
  switch (provider) {
    case PaymentProviderType.STRIPE:
      return 'Stripe'
    case PaymentProviderType.PAYPAL:
      return 'PayPal'
    case PaymentProviderType.FAN_BASIS:
      return 'FanBasis'
    case PaymentProviderType.WHOP:
      return 'Whop'
    case PaymentProviderType.CALENDLY:
      return 'Calendly'
    default:
      return provider
  }
}