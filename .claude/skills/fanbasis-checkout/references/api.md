# FanBasis Checkout React — API Reference

## Package

```
@fanbasis/checkout-react
```

---

## Components

### `CheckoutProvider`

Wraps your component tree and provides checkout config to all children. Required parent for `AutoCheckout`, `Checkout`, and `useCheckout`.

```ts
import { CheckoutProvider } from '@fanbasis/checkout-react';

<CheckoutProvider config={config}>
  {children}
</CheckoutProvider>
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `config` | `CheckoutConfig` | yes | Checkout configuration |
| `children` | `ReactNode` | yes | Child components |

---

### `AutoCheckout`

Handles the full checkout flow with minimal config. Renders the checkout iframe/modal automatically.

```ts
import { AutoCheckout } from '@fanbasis/checkout-react';

<AutoCheckout
  autoOpen={true}
  onSuccess={(data) => {}}
  onError={(error) => {}}
  onOpen={() => {}}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `autoOpen` | `boolean` | Open checkout immediately on mount |
| `onSuccess` | `(data: CheckoutSuccessData) => void` | Called on successful payment |
| `onError` | `(error: Error) => void` | Called on payment failure |
| `onOpen` | `() => void` | Called when checkout opens |
| `containerOptions` | `ContainerOptions` | Width/height of the checkout container |
| `loadingComponent` | `ReactNode` | Custom loading UI |
| `errorComponent` | `ReactNode` | Custom error UI |
| `className` | `string` | CSS class for container |
| `style` | `CSSProperties` | Inline styles for container |

---

### `Checkout`

Lower-level component — gives more control over display and behavior.

```ts
import { Checkout } from '@fanbasis/checkout-react';

<Checkout
  containerOptions={{ width: '100%', height: '600px' }}
  onSuccess={(data) => {}}
  onError={(error) => {}}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `onSuccess` | `(data: CheckoutSuccessData) => void` | Called on successful payment |
| `onError` | `(error: Error) => void` | Called on payment failure |
| `containerOptions` | `ContainerOptions` | Width/height of the checkout container |
| `className` | `string` | CSS class for container |

---

## Hooks

### `useCheckout`

Access the checkout instance and imperative controls. Must be used inside `CheckoutProvider`.

```ts
import { useCheckout } from '@fanbasis/checkout-react';

const { open, close, isOpen, init, on, off } = useCheckout();
```

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `open` | `() => void` | Open the checkout |
| `close` | `() => void` | Close the checkout |
| `isOpen` | `boolean` | Whether checkout is currently open |
| `init` | `() => Promise<void>` | Programmatically initialize checkout |
| `on` | `(event, handler) => void` | Subscribe to checkout events |
| `off` | `(event) => void` | Unsubscribe from checkout events |

**Events for `on`/`off`:** `'checkout:success'`, `'checkout:error'`

---

## Types

### `CheckoutConfig`

```ts
import { CheckoutConfig } from '@fanbasis/checkout-react';

type CheckoutConfig = {
  merchantId: string;
  productId: string;
  checkoutSessionSecret: string;
  environment: 'sandbox' | 'production';
  theme?: {
    theme?: 'light' | 'dark';
    accent_color?: string;       // hex color
    show_product_info?: boolean;
  };
};
```

### `CheckoutSuccessData`

```ts
type CheckoutSuccessData = {
  transactionId: string;
  amount: number;
  // additional fields may be present
};
```

### `ContainerOptions`

```ts
type ContainerOptions = {
  width?: string;   // e.g. '100%', '400px'
  height?: string;  // e.g. '600px'
};
```

---

## Common error

> "useCheckoutContext must be used within a CheckoutProvider"

Means a component using `useCheckout` or `AutoCheckout` is rendered outside `CheckoutProvider`. Wrap it.
