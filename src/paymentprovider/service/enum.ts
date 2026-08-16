// Provider identity comes from the shared package, which has owned it since
// 0.2.0 — this file was a copy that was never retired.
//
// Three things change by adopting it:
//
// - **`FAN_BASIS` renders as "Fanbasis" now, not "FanBasis".** That is visible
//   text in checkout. The backend spells it `fanbasis` in every identifier —
//   the app module, the route slug, `fanbasis_product_id` — so the
//   single-capital form is the one the package settled on, and the console
//   already used it. Note the API's own `provider_display` still returns
//   "FanBasis"; prefer this function over that field.
//
// - `getPaymentProviderLabel` takes a bare `string` (and null/undefined), not
//   only the enum. `payment_provider` arrives off the wire as a string, so this
//   copy could not be called with a raw wire value.
//
// - `NMI` ("network_merchant_inc") exists. It is in the backend's catalog with
//   `is_implemented: false` and was missing here, so a provider row carrying
//   that slug fell through every switch. Gate on `is_implemented`, never on
//   enum membership.

export { PaymentProviderType, getPaymentProviderLabel } from '@lavinou/webbysalespro/paymentprovider'
export { PAYMENT_PROVIDER_TYPES } from '@lavinou/webbysalespro/paymentprovider'
