# Architecture Reference - Detailed Patterns

## 1. Manager Pattern

Entry point component. Receives server-fetched data as props, wraps children with Provider.

```tsx
export function [Module]Manager({ webinar, initialItems }) {
    return (
        <[Module]Provider webinar={webinar} initialItems={initialItems || []}>
            <div className="grid gap-6 ...">
                <List[Items] />
                <[Module]FormBuilder />
            </div>
        </[Module]Provider>
    );
}
```

## 2. Context Pattern

Define context type separately. Always initialize with `undefined`.

```tsx
export type [Module]ContextType = {
    form: UseFormReturn<[Module]FormValues>;
    items: [Item]Dto[];
    selectedItem: [Item]Dto | undefined;
    isLoading: boolean;
    onSubmit: (values: [Module]FormValues) => void;
    resetToCreateMode: () => void;
    populateFromItem: (item: [Item]Dto) => void;
};

export const [Module]Context = createContext<[Module]ContextType | undefined>(undefined);
```

## 3. Provider Pattern

Manages all state, integrates server actions via `useAction`, provides methods.

```tsx
export function [Module]Provider({ webinar, initialItems, children }) {
    const [items, setItems] = useState<[Item]Dto[]>(initialItems ?? []);
    const [selectedItem, setSelectedItem] = useState<[Item]Dto | undefined>();

    const form = useForm<[Module]FormValues>({
        resolver: zodResolver([module]FormSchema),
        defaultValues: formDefault,
    });

    const { execute: executeCreate, isPending } = useAction(create[Module]Action, {
        onSuccess({ data }) {
            setItems(prev => [data, ...prev]);
            toast.success("[Item] created.");
            form.reset(formDefault);
        },
        onError({ error: { serverError } }) {
            toast.error(serverError ?? "Something went wrong.");
        },
    });

    const onSubmit = (values) => {
        selectedItem
            ? executeUpdate({ id: selectedItem.id, ...values })
            : executeCreate({ webinarId: webinar.id, ...values });
    };

    return (
        <[Module]Context.Provider value={{ form, items, selectedItem, isLoading: isPending, onSubmit, ... }}>
            {children}
        </[Module]Context.Provider>
    );
}
```

## 4. Hook Pattern

Guard against usage outside Provider.

```tsx
export function use[Module]() {
    const ctx = useContext([Module]Context);
    if (!ctx) throw new Error("use[Module] must be used inside [Module]Provider");
    return ctx;
}
```

## 5. Service Layer

### Types (`service/type.d.ts`)

API fields use snake_case. Use `Dto` suffix.

```tsx
export type [Item]Dto = {
    id: string;
    webinar_id: string;
    name: string;
    lifecycle: "draft" | "live" | "archived";
};
export type Create[Item]Dto = { /* request body */ };
export type Update[Item]Dto = { /* request body */ };
```

### Schemas (`service/schemas.ts`)

Zod schemas = single source of truth for validation. Form fields use camelCase.

```tsx
export const [module]TypeEnum = z.enum(["option_a", "option_b"]);

export const create[Module]Schema = z.object({
    webinarId: z.string().uuid(),
    name: z.string().min(1, "Name is required."),
    type: [module]TypeEnum,
}).superRefine((data, ctx) => { /* cross-field validation */ });
```

### Server Actions (`service/action.ts`)

Always `'use server'`. Use `actionClient` from `@/lib/safe-action`. Map camelCase → snake_case.

```tsx
'use server'
import { actionClient } from "@/lib/safe-action";

export const create[Module]Action = actionClient
    .inputSchema(create[Module]Schema)
    .action(async ({ parsedInput }) => {
        const body: Create[Item]Dto = {
            name: parsedInput.name,
            item_type: parsedInput.type, // camelCase → snake_case
        };
        return await postResource<[Item]Dto>(
            `${baseApiUrl}/v2/webinars/${parsedInput.webinarId}/[items]/`,
            body
        );
    });
```

## 6. REST API Utilities

From `@/service/api/rest-api`:

```tsx
getResource<T>(url)              // GET
postResource<T>(url, body)       // POST
patchResource<T>(url, body)      // PATCH
deleteResource<T>(url)           // DELETE
postFormDataResource<T>(url, fd) // POST multipart
```

All protected requests auto-include Bearer token + X-Org-Id headers.

## 7. Form Components

Use `useFormContext()` - no prop drilling.

### Choosing the right wrapper per input type

| Input type | Wrapper | Notes |
|---|---|---|
| Native `<Input>`, `<Textarea>` | `FormField` + `FormControl` | `FormControl` (Radix `Slot`) merges `id`/`aria-*` into the native element correctly |
| `<Switch>` | `FormField` + `FormControl` | Switch accepts forwarded Slot props cleanly |
| Radix `<Select>` | `Controller` (from `react-hook-form`) | **Do NOT use `FormField`/`FormControl`** — the Slot layer interferes with Radix Select's internal value display. Use raw `Controller` instead. |
| Radix `<RadioGroup>` | `FormField` (no `FormControl`) | Place RadioGroup directly inside `FormItem`, skip `FormControl` |

### Native Input (FormField + FormControl)

```tsx
export function [Module]FormBasicInfoFields() {
    const { control } = useFormContext<[Module]FormValues>();
    return (
        <FormField control={control} name="name"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
```

### Radix Select (Controller — no FormField/FormControl)

Radix Select manages its own internal state. Wrapping `SelectTrigger` with `FormControl` (which uses Radix `Slot`) merges extra props that break the value display. Use `Controller` directly from `react-hook-form`:

```tsx
import { Controller } from "react-hook-form";

<Controller
    control={form.control}
    name="timezone"
    render={({ field }) => (
        <FormItem>
            <FormLabel>Timezone</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                </SelectContent>
            </Select>
            <FormMessage />
        </FormItem>
    )}
/>
```

Key rules for Select:
- Use `Controller` from `react-hook-form`, **not** `FormField` from `@/components/ui/form`
- Use `value={field.value}` (controlled) — `defaultValue` won't update on `form.reset()`
- **Never** wrap `SelectTrigger` with `FormControl`
- `FormItem`, `FormLabel`, `FormMessage` are safe to use (they don't depend on `FormFieldContext`)

### Form Builder composes fields

```tsx
export function [Module]FormBuilder() {
    const { form, onSubmit, isLoading } = use[Module]();
    return (
        <Card>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <[Module]FormBasicInfoFields />
                        <[Module]FormCardFooter />
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
```

## 8. Page Integration

Pages are server components that fetch data and render the Manager.

```tsx
// app/(admin)/webinars/[slug]/[module]/page.tsx
export default async function [Module]Page({ params }) {
    const webinar = await getWebinar(params.slug);
    const items = await listItems(webinar.id);
    return <[Module]Manager webinar={webinar} initialItems={items} />;
}
```

## 9. Authorization

```tsx
import { IfCan } from "@/iam/policy-context";
<IfCan action="webinar:create"><Button>Create</Button></IfCan>
```

## 10. Barrel Exports

Every component subdirectory has `index.tsx`:

```tsx
export { [Module]FormCardHeader } from './[Module]FormCardHeader';
export { [Module]FormBasicInfoFields } from './[Module]FormBasicInfoFields';
```
