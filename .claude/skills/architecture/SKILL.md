---
name: architecture
description: >
  Architecture standards for the WebbySalesPro webapp. Use this skill whenever you're creating a new feature module, adding a new component, writing server actions, defining DTOs or Zod schemas, wiring up a Provider/Context/Hook, building form fields, making REST API calls, or generally following the Manager → Provider → Hook → Components pattern. Also invoke when scaffolding a new module, adding IAM authorization, handling loading states on buttons, or any time the user asks how something should be structured in this codebase.
---

# Architecture Skill

Quick reference for the WebbySalesPro Admin Webapp architecture. For detailed patterns see `reference.md`. For a full example see `examples.md`.

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript 5
- State: React Context + Providers
- Server Actions: next-safe-action + Zod validation
- Forms: React Hook Form + Zod + @hookform/resolvers
- UI: Radix UI + Tailwind CSS 4 (OKLCH)
- Auth: NextAuth v4 | IAM: `<IfCan action="...">` component
- API: Custom REST layer (`src/service/api/rest-api.ts`)
- Notifications: react-hot-toast | Icons: Lucide React

## Project Structure

```
src/
├── app/              # Routes: (admin), (analytics), (control-panel), (live), (onboarding), (public), (user)
├── components/ui/    # Shared Radix UI components
├── hooks/            # Global hooks
├── iam/              # Policy-based access control
├── lib/              # safe-action config, utils
├── service/          # Global API layer, core config, cookie, media, user, webinar services
├── [modules]/        # Feature modules (offer, schedule, presentation, broadcast, etc.)
└── middleware.ts     # NextAuth route protection
```

## Module Structure

Every feature module follows: **Manager → Provider → Hook → Components**

```
[module]/
├── [Module]Manager.tsx          # Entry point, wraps with Provider
├── context/[Module]Context.tsx  # Context type definition
├── provider/[Module]Provider.tsx # State + server actions + methods
├── hooks/use-[module].tsx       # Hook to consume context
├── components/                  # UI (form/, panel/, preview/, action/)
│   └── index.tsx                # Barrel exports
└── service/
    ├── type.d.ts                # DTOs (snake_case API fields)
    ├── schemas.ts               # Zod schemas (camelCase form fields)
    └── action.ts                # Server actions ('use server')
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `OfferFormBuilder.tsx` |
| Hooks | `use-` prefix, kebab-case | `use-offer-form.tsx` |
| Context/Provider/Manager | PascalCase + suffix | `OfferFormContext`, `OfferFormProvider`, `OfferManager` |
| Types | PascalCase + `Dto` | `OfferDto`, `CreateOfferDto` |
| Schemas | camelCase + `Schema` | `createOfferSchema` |
| Server Actions | camelCase + `Action` | `createOfferAction` |
| API fields | snake_case | `internal_name` |
| Form fields | camelCase | `internalName` |

## Data Flow

```
Page (server) → fetches initial data
  → Manager (wraps with Provider)
    → Provider (state + useForm + useAction)
      → Components (consume via useModuleHook())
        → Form submit → Zod validates → Server Action → REST API → State update → Re-render
```

## New Module Checklist

1. `service/type.d.ts` - Define DTOs
2. `service/schemas.ts` - Zod validation schemas
3. `service/action.ts` - Server actions
4. `context/[Module]Context.tsx` - Context type
5. `provider/[Module]Provider.tsx` - Provider
6. `hooks/use-[module].tsx` - Consumer hook
7. `components/` - UI components + barrel exports
8. `[Module]Manager.tsx` - Entry point
9. `app/` route page - Fetch data, render Manager

Run `scripts/scaffold.sh [module-name]` to generate boilerplate.

## Rules
- [rules/user-experience.md] - Cursor, loading states, and button patterns required for consistent UX across all components.