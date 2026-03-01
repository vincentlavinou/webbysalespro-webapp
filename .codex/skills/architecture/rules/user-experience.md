---
name: user-experience
description: How webbysalespro user experience should always be setup to make sure all components and pages behave consistently
---

# User Experience Rules

## Loading States on Actions (CRITICAL)

Every button or interactive element that triggers a server action **must** show a loading state while the action is pending. This is non-negotiable for UX consistency.

### Rule

Always use `isPending` from `useAction` (next-safe-action). Never use `form.formState.isSubmitting`, manual `useState` booleans, or `useTransition` as a substitute.

```tsx
// ✅ CORRECT
const { execute, isPending } = useAction(someAction, {
  onSuccess({ data }) { ... },
  onError({ error: { serverError } }) { notifyErrorUiMessage(serverError) },
})

<Button disabled={isPending} onClick={() => execute(payload)}>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isPending ? "Saving…" : "Save"}
</Button>

// ❌ WRONG — do not use form.formState.isSubmitting
<Button disabled={form.formState.isSubmitting}>Save</Button>

// ❌ WRONG — do not use manual useState for loading
const [loading, setLoading] = useState(false)

// ❌ WRONG — do not use useTransition to wrap executeAction
const [pending, startTransition] = useTransition()
startTransition(async () => { await execute(...) })
```

### When the action lives in a Provider

Extract all `isPending` values and expose them through context so consuming components can use them:

```tsx
// In Provider
const { execute, isPending } = useAction(someAction, { ... })
const { execute: executeDelete, isPending: deleteIsPending } = useAction(deleteAction, { ... })

return <ModuleContext value={{
  isLoading: isPending,
  isDeleteLoading: deleteIsPending,
  // ...
}}>

// In Component
const { isLoading, isDeleteLoading } = useModuleHook()

<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? "Saving…" : "Save"}
</Button>
```

### When `isPending` must be passed as a prop

If the `useAction` call is in a parent and the button is in a child component, pass `isLoading` as a prop:

```tsx
// Parent (has useAction)
const { execute, isPending } = useAction(createAction, { ... })

<ChildCard
  isLoading={isPending}
  onSubmit={(data) => execute(data)}
/>

// Child component
interface Props {
  isLoading?: boolean
  onSubmit: (data: FormValues) => void
}

<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? "Saving…" : "Save"}
</Button>
```

### Button text convention

| State | Text pattern |
|---|---|
| Idle (create) | `"Save"`, `"Create"`, `"Submit"` |
| Idle (update) | `"Update"`, `"Save changes"` |
| Idle (delete) | `"Remove"`, `"Delete"`, `"Revoke"` |
| Pending (any) | Append `"…"` — `"Saving…"`, `"Removing…"`, `"Revoking…"` |

### Spinner import

Always use `Loader2` from `lucide-react`:

```tsx
import { Loader2 } from "lucide-react"

<Loader2 className="mr-2 h-4 w-4 animate-spin" />
```

### Disabling related controls during pending

When an action affects sibling controls (e.g. a role select or active toggle), disable them too:

```tsx
<RoleSelect disabled={updateIsPending} ... />
<Switch disabled={updateIsPending} ... />
```

---

## Cursor (Pointer) on Interactive Elements

All clickable elements must show a pointer cursor. This is handled globally in `src/app/globals.css` via:

1. **Native element rule** — covers `button`, `a[href]`, `label`, `select`, `input[type="checkbox/radio/range"]`
2. **shadcn `data-slot` overrides** — covers all standard shadcn/ui interactive components

**Do not** add `cursor-pointer` manually to individual components for standard interactive elements — the global rule already handles it.

Only add `cursor-pointer` explicitly when using a non-standard element as a clickable target (e.g. a `<div>` acting as a card button).
