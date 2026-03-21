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
| `onSuccess` | `(data: CheckoutSuccessData) => void` | Called on successful payment |
| `onError` | `(error: Error) => void` | Called on payment failure |
| `onOpen` | `() => void` | Called when checkout opens |
| `loadingComponent` | `ReactNode` | Custom loading UI |
| `errorComponent` | `ReactNode` | Custom error UI |
| `className` | `string` | CSS class for container |

> **Note:** `autoOpen` and `style` are **not** valid props. Sizing is controlled via `containerOptions` in `CheckoutConfig`. Use `className` for CSS-based sizing if needed.

---

### `Checkout`

Lower-level component — gives more control over display and behavior.

```ts
import { Checkout } from '@fanbasis/checkout-react';

<Checkout
  onSuccess={(data) => {}}
  onError={(error) => {}}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `onSuccess` | `(data: CheckoutSuccessData) => void` | Called on successful payment |
| `onError` | `(error: Error) => void` | Called on payment failure |
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
interface CustomizationParams {
  theme: 'light' | 'dark';
  show_product_info: boolean;
  product_layout: 'left' | 'above';
  show_coupon_row: boolean;
  accent_color: string;
  background_color?: string;
  label_color?: string;
  input_background_color?: string;
  product_text_color?: string;
  heading_color?: string;
  secondary_color?: string;
  border_color?: string;
  surface_color?: string;
  billing_display_fields?: string;
  billing_form_placement?: 'above' | 'left';
  show_headings?: boolean;
  show_powered_by?: boolean;
}

interface RedirectSettings {
  success_redirect_url?: string;
  failure_redirect_url?: string;
  always_redirect?: boolean;
}

interface CheckoutConfig {
  creatorId: string;
  productId: string;
  bumpProductIds?: string[];
  couponCode?: string;
  affiliateCode?: string;
  checkoutSessionSecret: string;
  environment: 'sandbox' | 'production';
  overrideBaseUrl?: string;
  showAllAddons?: boolean;
  metadata?: Record<string, string>;
  theme?: CustomizationParams;
  containerOptions?: {
    width?: string;
    height?: string;
  };
  redirectSettings?: RedirectSettings;
  showSubmitButton?: boolean;
}
```

### `CheckoutSuccessData`

```ts
type CheckoutSuccessData = {
  transactionId: string;
  amount: number;
  // additional fields may be present
};
```

---

## Common error

> "useCheckoutContext must be used within a CheckoutProvider"

Means a component using `useCheckout` or `AutoCheckout` is rendered outside `CheckoutProvider`. Wrap it.
