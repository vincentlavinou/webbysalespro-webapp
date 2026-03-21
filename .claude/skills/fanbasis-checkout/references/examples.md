# FanBasis Checkout — Examples

## Minimal inline checkout (closest to FanbasisCheckout.tsx use case)

```tsx
import { CheckoutProvider, AutoCheckout } from '@fanbasis/checkout-react';

function InlineCardCheckout({ payload, onSuccess, onError }) {
  const config = {
    merchantId: payload.merchantId,
    productId: payload.productId,
    checkoutSessionSecret: payload.checkoutSessionSecret,
    environment: payload.environment ?? 'sandbox',
  };

  return (
    <CheckoutProvider config={config}>
      <AutoCheckout
        autoOpen={true}
        onSuccess={onSuccess}
        onError={onError}
      />
    </CheckoutProvider>
  );
}
```

---

## Mode-switching pattern (card vs financing)

Use a state variable to track which checkout mode is active and conditionally mount the provider only when needed.

```tsx
type CheckoutMode = 'card' | 'financing' | null;

function FanbasisCheckout() {
  const { token, selectedOffer, setIsCheckingOut, recordEvent } = useOfferSessionClient();
  const [mode, setMode] = useState<CheckoutMode>(null);

  const payload = selectedOffer?.offer.action_payload as {
    merchantId?: string;
    productId?: string;
    checkoutSessionSecret?: string;
    environment?: 'sandbox' | 'production';
    url?: string;
  };

  const handleCardClick = () => {
    setMode('card');
    recordEvent('checkout_started', token);
  };

  const handleSuccess = (data) => {
    recordEvent('checkout_completed', token);
    setIsCheckingOut(false);
  };

  const handleError = (error) => {
    console.error('FanBasis checkout error:', error);
    setMode(null); // let user retry
  };

  const config = {
    merchantId: payload?.merchantId ?? '',
    productId: payload?.productId ?? '',
    checkoutSessionSecret: payload?.checkoutSessionSecret ?? '',
    environment: payload?.environment ?? 'sandbox',
  };

  return (
    <div>
      {/* Option buttons */}
      {mode === null && (
        <>
          <button onClick={handleCardClick}>Credit/Debit Card</button>
          <button onClick={() => { /* financing flow */ }}>More Financing Options</button>
        </>
      )}

      {/* Inline card checkout */}
      {mode === 'card' && payload?.merchantId && (
        <CheckoutProvider config={config}>
          <AutoCheckout
            autoOpen={true}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </CheckoutProvider>
      )}
    </div>
  );
}
```

---

## useCheckout hook — imperative open/close

Use when you want a button to trigger the checkout rather than auto-opening it.

```tsx
function CheckoutButton() {
  const { open, close, isOpen } = useCheckout();

  return (
    <div>
      <button onClick={open} disabled={isOpen}>
        {isOpen ? 'Checkout Open' : 'Pay with Card'}
      </button>
      {isOpen && <button onClick={close}>Cancel</button>}
    </div>
  );
}

// Must be rendered inside <CheckoutProvider>
function App() {
  return (
    <CheckoutProvider config={config}>
      <CheckoutButton />
      <AutoCheckout onSuccess={...} onError={...} />
    </CheckoutProvider>
  );
}
```

---

## Event handling with analytics

```tsx
function EventHandlingCheckout() {
  const handleSuccess = (data) => {
    // data.transactionId, data.amount available
    recordEvent('checkout_completed', token);
    setIsCheckingOut(false);
  };

  const handleError = (error) => {
    console.error('Checkout error:', error);
    // Don't auto-close — let user retry or cancel manually
  };

  return (
    <CheckoutProvider config={config}>
      <AutoCheckout
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </CheckoutProvider>
  );
}
```

---

## Dynamic config from action_payload (TypeScript)

```ts
import { CheckoutConfig } from '@fanbasis/checkout-react';

type FanBasisPayload = {
  merchantId: string;
  productId: string;
  checkoutSessionSecret: string;
  environment?: 'sandbox' | 'production';
  url?: string; // for financing options link
};

function buildCheckoutConfig(payload: FanBasisPayload): CheckoutConfig {
  return {
    merchantId: payload.merchantId,
    productId: payload.productId,
    checkoutSessionSecret: payload.checkoutSessionSecret,
    environment: payload.environment ?? 'sandbox',
  };
}
```

---

## Custom container sizing

```tsx
<Checkout
  containerOptions={{ width: '100%', height: '500px' }}
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

---

## Advanced: subscribing to checkout events

```tsx
function AdvancedCheckout() {
  const checkout = useCheckout();

  useEffect(() => {
    checkout.on('checkout:success', (data) => {
      // handle success
    });
    checkout.on('checkout:error', (error) => {
      // handle error
    });
    return () => {
      checkout.off('checkout:success');
      checkout.off('checkout:error');
    };
  }, [checkout]);

  return <AutoCheckout />;
}
```
