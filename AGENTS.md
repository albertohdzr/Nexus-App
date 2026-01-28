# Repository Guidelines

## Project Structure & Module Organization

### App Router Structure

- Next.js App Router in `src/app`
- `(auth)` hosts `login`, `signup`, `change-password`
- `(dashboard)` modules: `admissions`, `chat`, `crm`, `erp`, `finance`,
  `settings`, `superadmin` — each with their own `layout.tsx`/`page.tsx`

### Feature-First Architecture

The codebase follows a **feature-first** modular architecture. New features
should be organized under `src/features/`:

```
src/features/
├── leads/                    # Lead management module
│   ├── actions/              # Server actions (mutations)
│   │   ├── add-note.ts
│   │   ├── create-lead.ts
│   │   ├── create-lead-from-chat.ts
│   │   ├── send-follow-up.ts
│   │   ├── update-lead.ts
│   │   ├── update-lead-task.ts
│   │   └── index.ts          # Barrel export
│   ├── services/             # Server-side data fetching
│   │   ├── leads-service.ts
│   │   ├── lead-detail-service.ts
│   │   └── index.ts
│   ├── components/           # Module-specific components
│   ├── lib/                  # Module utilities & constants
│   ├── types.ts              # Module types
│   └── index.ts              # Main barrel export
│
├── appointments/             # Appointments & calendar module
│   ├── actions/
│   │   ├── calendar-actions.ts
│   │   ├── visit-actions.ts
│   │   └── index.ts
│   ├── services/
│   │   └── calendar-service.ts
│   ├── lib/
│   │   └── user-context.ts   # Shared auth context helper
│   ├── types.ts
│   └── index.ts
```

### Legacy Compatibility

For gradual migration, keep compatibility re-export files in
`src/app/(dashboard)/*/actions.ts` that re-export from the modular `@features/*`
modules. Mark these as `DEPRECATED` in comments.

### Key Directories

- **`src/features/`**: Feature modules (actions, services, components, types)
- **`src/shared/`**: Cross-feature shared utilities
- **`src/components/ui`**: shadcn/Radix UI primitives
- **`src/components/layout`**: Layout chrome components
- **`src/lib`**: Core utilities (Supabase client/server, `cn` helper)
- **`src/config`**: App configuration (navigation, etc.)
- **`supabase/`**: Database migrations and seed files

---

## Server-First Architecture

### Core Principles

1. **Server Components by Default**
   - All page components should be async Server Components
   - Fetch data directly in the component using services
   - No `"use client"` unless absolutely necessary

2. **Server Actions for Mutations**
   - All data mutations use Server Actions with `"use server"` directive
   - Actions live in `src/features/*/actions/` directories
   - Each action file has `"use server"` at the top

3. **Services for Data Fetching**
   - Query functions live in `src/features/*/services/`
   - Services should have `"use server"` if they need `next/headers`
   - Import services directly in Server Components

### Server Action Patterns

#### Simple Form Actions

For forms that don't need optimistic UI or action state:

```typescript
// Example: src/features/appointments/actions/visit-actions.ts
"use server";

export async function startVisit(formData: FormData): Promise<void> {
    // Implementation
    revalidatePath("/crm/visits");
}
```

Usage in Server Component:

```tsx
<form action={startVisit}>
    <input type="hidden" name="appointmentId" value={id} />
    <Button type="submit">Start</Button>
</form>;
```

#### Actions with State (useActionState)

For forms that need optimistic UI or show success/error feedback:

```typescript
"use server";

import type { ActionState } from "../types";

export async function updateLeadAction(
    _prevState: ActionState,
    formData: FormData,
): Promise<ActionState> {
    // Implementation
    return { success: "Updated successfully" };
}
```

Usage in Client Component:

```tsx
"use client";
import { useActionState } from "react";

const [state, formAction, isPending] = useActionState(updateLeadAction, {});
```

### Import Rules

#### Client Components Can Import:

- ✅ Server Actions (functions with `"use server"`)
- ✅ Types
- ❌ Services that use `next/headers` or server-only APIs

#### Server Components Can Import:

- ✅ Everything (actions, services, types)

#### Barrel Export Pattern

Main module `index.ts` should only export what's safe for client components:

```typescript
// src/features/appointments/index.ts

// Actions (safe for client components)
export { createCalendarEvent, updateCalendarEvent } from "./actions";

// Types (safe everywhere)
export * from "./types";

// NOTE: Services are NOT exported here - import directly for server components
// import { getCalendarEvents } from "@features/appointments/services/calendar-service";
```

---

## Build, Test, and Development Commands

- `npm run dev` — Start local server on port 3000 with hot reload
- `npm run lint` — ESLint with Next.js core-web-vitals rules; append `-- --fix`
  to auto-format
- `npm run build` — Production build; **must pass before opening a PR**
- `npm run start` — Serve production build

---

## Coding Style & Naming Conventions

### TypeScript

- Strict mode enabled
- Prefer server components and typed hooks
- Use 2-space indentation

### Import Aliases

```typescript
"@/*"; // Root: ./*
"@features/*"; // Features: ./src/features/*
"@shared/*"; // Shared: ./src/shared/*
```

### File Naming

| Type       | Convention                  | Example                       |
| ---------- | --------------------------- | ----------------------------- |
| Components | kebab-case                  | `lead-notes-card.tsx`         |
| Actions    | kebab-case                  | `update-lead.ts`              |
| Services   | kebab-case                  | `leads-service.ts`            |
| Types      | kebab-case                  | `types.ts`                    |
| Routes     | kebab-case folders          | `crm/leads/[leadId]/page.tsx` |
| Hooks      | camelCase with `use` prefix | `useLeadStatus.ts`            |

### Component Conventions

- PascalCase for component names
- Export named functions (not default) for better refactoring support
- Co-locate types with components when specific to that component

### Styling

- Tailwind v4 utilities
- Use `cn()` helper for conditional classes
- Extend shadcn primitives in `src/components/ui` instead of bespoke markup

---

## Action State Types

Define consistent action state types in each module:

```typescript
// src/features/leads/types.ts

export interface LeadActionState {
    success?: string;
    error?: string;
}

export interface CreateLeadActionState extends LeadActionState {
    leadId?: string;
}

export type FollowUpActionState = LeadActionState;
export type NoteActionState = LeadActionState;
export type UpdateLeadActionState = LeadActionState;
```

---

## Common Patterns

### Authentication in Actions

```typescript
"use server";

export async function myAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "No autorizado" };
    }

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.organization_id) {
        return { error: "No se encontró tu organización" };
    }

    // Continue with action...
}
```

### Revalidation

Always revalidate affected paths after mutations:

```typescript
revalidatePath("/crm/leads");
revalidatePath(`/crm/leads/${leadId}`);
```

### Error Handling

Return structured errors, don't throw:

```typescript
if (error) {
    console.error("Error description:", error);
    return { error: "User-friendly error message" };
}
```

---

## Testing Guidelines

- No automated tests yet; add `*.test.tsx` co-located or in `src/__tests__` when
  introducing new behavior
- Favor React Testing Library/Vitest style (render, assert roles/text)
- Mock Supabase calls
- Cover auth redirects and dashboard navigation

---

## Commit & Pull Request Guidelines

### Commits

- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`
- Write imperatively: "Add user authentication" not "Added user authentication"

### Pull Requests

- Concise summary with linked issue/task
- Screenshots or GIFs for UI changes
- Notes on Supabase migrations/seed data
- List of commands run (`npm run lint`, `npm run build`)
- Keep scope tight and update docs when adding routes, providers, or migrations

---

## Environment & Security

### Environment Variables

- Local env goes in `.env.local`
- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service keys only on the server, never in `NEXT_PUBLIC_*`
- **Never commit secrets**

### Authentication

- Auth middleware in `proxy.ts` refreshes sessions
- Always use `supabase.auth.getUser()` in Server Components/Actions
- Unauthenticated users must redirect to `/login`

---

## Module Migration Checklist

When migrating a module to feature-first architecture:

- [ ] Create directory structure in `src/features/<module>/`
- [ ] Move actions to `actions/` with `"use server"` directive
- [ ] Move data fetching to `services/`
- [ ] Define types in `types.ts`
- [ ] Create barrel exports (`index.ts`)
- [ ] Update imports in consuming files
- [ ] Create compatibility re-export in original location (if needed)
- [ ] Run `npm run build` to verify
- [ ] Run `npm run lint` to check for errors
