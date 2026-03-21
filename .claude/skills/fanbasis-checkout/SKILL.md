---
name: fanbasis-checkout
description: How to implement FanBasis inline credit/debit card checkout in a React component using @fanbasis/checkout-react. Use this skill whenever adding, wiring up, or modifying FanBasis payment checkout — including CheckoutProvider, AutoCheckout, Checkout component, useCheckout hook, or connecting action_payload config to the FanbasisCheckout component.
---

# FanBasis Checkout Integration

This skill covers wiring up `@fanbasis/checkout-react` inside `FanbasisCheckout.tsx`.

## Component context

The target file is `src/offer-client/checkout/fanbasis/FanbasisCheckout.tsx`.

`useOfferSessionClient()` provides:
- `token` — session token, used for `recordEvent` calls
- `selectedOffer` — the active offer; config lives at `selectedOffer.offer.action_payload`
- `setIsCheckingOut(false)` — call this to close the checkout panel
- `recordEvent(event, token)` — call with `'checkout_started'`, `'checkout_completed'`, or `'checkout_canceled'`

The `action_payload` for FanBasis offers has this shape:
```ts
{
  merchantId: string;
  productId: string;
  checkoutSessionSecret: string;
  environment?: 'sandbox' | 'production';
}
```

## How to wire up inline checkout

The pattern is:

1. Extract config from `selectedOffer.offer.action_payload`
2. Wrap with `<CheckoutProvider config={...}>`
3. Render `<AutoCheckout>` (or `<Checkout>` for more control) inside the provider
4. On `onSuccess` → call `recordEvent('checkout_completed', token)` then `setIsCheckingOut(false)`
5. On `onError` → surface an error state in the UI (do not close the panel automatically)
6. The "More Financing Options" external link flow already exists — keep it

## Replacing the disabled Credit/Debit Card button

The current button is rendered as `disabled` with a "Coming soon" badge. To activate it:

- Remove the `disabled` prop and the badge
- When clicked, show the `<CheckoutProvider>` + `<AutoCheckout>` inline below (or replace the button area)
- A good pattern is a `checkoutMode: 'card' | 'financing' | null` state that swaps what is shown in the options area

## Key things to get right

- `CheckoutProvider` must wrap `AutoCheckout` — the hook `useCheckout` only works inside it
- Only mount the provider when the user chooses card checkout, not on every render
- Pass `environment` from `action_payload` if present; default to `'sandbox'` in dev
- Guard: if `action_payload` is missing `merchantId`/`productId`/`checkoutSessionSecret`, show an error rather than crashing

## References

- `references/api.md` — props, config shape, TypeScript types for all components and hooks
- `references/examples.md` — complete working examples including dynamic config and event handling
