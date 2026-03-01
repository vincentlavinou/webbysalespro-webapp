# Architecture Examples - Offer Module

The offer module (`src/offer/`) is the reference implementation. This file shows the real file structure and key excerpts.

## File Structure

```
src/offer/
├── index.tsx
├── OfferManager.tsx
├── OfferSessionController.tsx
├── OfferSessionPanelController.tsx
├── context/
│   ├── OfferFormContext.tsx
│   └── OfferSessionControllerContext.tsx
├── provider/
│   ├── OfferFormProvider.tsx
│   └── OfferSessionControllerProvider.tsx
├── hooks/
│   ├── use-offer-form.tsx
│   └── use-offer-session-controller.tsx
├── components/
│   ├── index.tsx
│   ├── form/
│   │   ├── index.tsx
│   │   ├── OfferFormBasicInfoFormFields.tsx
│   │   ├── OfferFormCardHeader.tsx
│   │   ├── OfferFormCardFooter.tsx
│   │   ├── OfferFormSelectOfferTypeFields.tsx
│   │   ├── OfferFormOfferTypeSections.tsx
│   │   ├── OfferFormUploadMediaField.tsx
│   │   ├── OfferFormDisplayFields.tsx
│   │   ├── OfferFormPriceFields.tsx
│   │   ├── OfferFormQuantityAndLimitFields.tsx
│   │   └── OfferFormScarcityConfigFields.tsx
│   ├── controller/
│   ├── panel/
│   ├── preview/
│   └── action/
└── service/
    ├── type.d.ts
    ├── schemas.ts
    └── action.ts
```

## Key Takeaways

1. **Two contexts**: `OfferFormContext` (CRUD form state) and `OfferSessionControllerContext` (live session control). Split contexts when responsibilities differ.
2. **Manager receives initial data** from the server page and wraps with Provider.
3. **Form components are granular**: one component per logical section (basic info, pricing, quantity, scarcity, display, media).
4. **Server actions** map camelCase form values to snake_case API DTOs.
5. **Provider handles all side effects**: API calls, toast notifications, state updates, form resets.
6. **Components are pure UI**: they consume context via hooks and render form fields or display data.

## When to Add a Second Context

The offer module has two contexts because it serves two purposes:
- **OfferFormContext** - Admin CRUD (create/edit/delete offers)
- **OfferSessionControllerContext** - Live session (push/control offers during a webinar)

Only add a second context when the module has distinct operational modes. Most modules need just one.

---

# Architecture Examples - Schedule Module (Controller + Select Pattern)

The schedule module (`src/schedule/`) demonstrates the `Controller` pattern for Radix Select components and `useFieldArray` for dynamic lists.

## File Structure

```
src/schedule/
├── ScheduleManager.tsx
├── context/WebinarScheduleContext.tsx
├── providers/WebinarScheduleProvider.tsx
├── hooks/use-webinar-schedule.tsx
├── components/
│   ├── ScheduleManagerForm.tsx
│   ├── WebinarScheduleStepOne.tsx
│   ├── WebinarScheduleTypeSelector.tsx
│   ├── WebinarScheduleSingle.tsx
│   ├── WebinarScheduleMulti.tsx
│   ├── WebinarScheduleRecurring.tsx
│   ├── WebinarScheduleSummary.tsx
│   ├── WebinarScheduleTitle.tsx
│   ├── WebinarScheduleAction.tsx
│   └── WebinarScheduleTypeCard.tsx
└── service/
    ├── type.d.ts
    ├── schema.ts
    └── action.ts
```

## Key Pattern: Controller for Radix Select

Radix `Select` manages its own internal state. Using `FormField` (which wraps `Controller` + `FormFieldContext`) combined with `FormControl` (which uses Radix `Slot`) injects extra props that break the Select value display.

**Solution**: Use raw `Controller` from `react-hook-form` for all Radix Select fields.

### Correct — Controller + Select (from `WebinarScheduleRecurring.tsx`)

```tsx
import { Controller } from "react-hook-form";

<Controller
    control={form.control}
    name="recurring.rule.freq"
    render={({ field }) => (
        <FormItem>
            <FormLabel>Frequency</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
            </Select>
            <FormMessage />
        </FormItem>
    )}
/>
```

### Correct — FormField + FormControl for native Input (same file)

```tsx
<FormField
    control={form.control}
    name="recurring.rule.time"
    render={({ field }) => (
        <FormItem>
            <FormLabel>Start time</FormLabel>
            <FormControl>
                <Input type="time" {...field} />
            </FormControl>
            <FormMessage />
        </FormItem>
    )}
/>
```

## Key Pattern: useFieldArray for Dynamic Sessions

The multi-session form uses `useFieldArray` from react-hook-form (from `WebinarScheduleMulti.tsx`):

```tsx
import { useFieldArray } from "react-hook-form";

const { fields, append, remove } = useFieldArray<ScheduleFormValues>({
    control: form.control,
    name: "multi.sessions",
});

// Add session
<Button onClick={() => append({ id: uid(), date: '', time: '', timezone: 'America/New_York' })}>
    Add session
</Button>

// Render sessions
{fields.map((field, idx) => (
    <Card key={field.id}>
        <FormField control={form.control} name={`multi.sessions.${idx}.date`} ... />
        <FormField control={form.control} name={`multi.sessions.${idx}.time`} ... />
        <Controller control={form.control} name={`multi.sessions.${idx}.timezone`} ... />
        <Button onClick={() => remove(idx)}>Cancel</Button>
    </Card>
))}
```

## Key Pattern: Form Wrapper Component

When the Provider owns the `useForm` instance and needs to expose `FormProvider` context to children, use a thin wrapper component inside the Provider tree (from `ScheduleManagerForm.tsx`):

```tsx
// ScheduleManagerForm.tsx — must be a child of the Provider
'use client'
import { Form } from "@/components/ui/form"
import { useWebinarSchedule } from "../hooks/use-webinar-schedule"

export function ScheduleManagerForm({ children }: { children: React.ReactNode }) {
    const { form } = useWebinarSchedule()
    return <Form {...form}>{children}</Form>
}
```

```tsx
// ScheduleManager.tsx — Provider wraps Form wrapper
<WebinarScheduleProvider defaultWebinar={webinar}>
    <ScheduleManagerForm>
        {/* All child components can use FormField, Controller, useFormContext */}
    </ScheduleManagerForm>
</WebinarScheduleProvider>
```

## Key Takeaways

1. **Use `Controller` for Radix Select**, `FormField` + `FormControl` for native inputs — never mix them.
2. **Use `value` not `defaultValue`** on Select — `defaultValue` makes it uncontrolled and won't react to `form.reset()`.
3. **`useFieldArray`** for dynamic lists — use `append`/`remove` instead of manual array spread.
4. **Form wrapper component** when Provider owns the form — thin component that reads form from context and wraps with `<Form>`.
5. **`form.formState.isDirty`** replaces manual `dirtyRef` tracking.
6. **`form.reset(newValues)`** replaces manual state sync after save — call in `commitWebinar`.
