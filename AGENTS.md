# Repository Guidelines

## Project Structure & Module Organization
- Next.js App Router in `src/app`; `(auth)` hosts `login`, `signup`, `change-password`; `(dashboard)` modules `admissions`, `chat`, `crm`, `erp`, `finance`, `settings`, `superadmin` each carry their own `layout.tsx`/`page.tsx`.
- Shared UI primitives (shadcn/Radix) sit in `src/components/ui`; layout chrome in `src/components/layout`; chat widgets in `src/components/chat`; theme/auth providers in `src/components/providers`.
- Utilities in `src/lib` (Supabase client/server, `cn` helper); navigation config in `src/config/navigation.ts`; assets in `public/`; database migrations and seed live in `supabase/`.

## Build, Test, and Development Commands
- `npm run dev` — start the local server on port 3000 with hot reload.
- `npm run lint` — ESLint with Next.js core-web-vitals rules; append `-- --fix` to auto-format.
- `npm run build` and `npm run start` — production build and serve; ensure this passes before opening a PR.

## Coding Style & Naming Conventions
- TypeScript is strict; prefer server components and typed hooks. Use 2-space indentation and the `@/*` alias for absolute imports.
- PascalCase component files in `src/components`; kebab-case route folders; hooks start with `use...`; server actions live in `app/*/actions`.
- Tailwind v4 utilities with `cn` for conditional classes; extend shadcn primitives in `src/components/ui` instead of bespoke markup. ESLint should be clean.

## Testing Guidelines
- No automated tests yet; add `*.test.tsx` co-located or in `src/__tests__` when introducing new behavior.
- Favor React Testing Library/Vitest style (render, assert roles/text), mock Supabase calls, and cover auth redirects and dashboard navigation.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `chore:`) as seen in history; write imperatively.
- PRs need a concise summary, linked issue/task, screenshots or GIFs for UI changes, notes on Supabase migrations/seed data, and a list of commands run (`npm run lint`, tests).
- Keep scope tight and update docs when adding routes, providers, or migrations.

## Environment & Security
- Local env goes in `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (service keys only on the server). Never commit secrets.
- Auth middleware in `proxy.ts` refreshes sessions; if adjusting auth flows, keep `supabase.auth.getUser()` and verify unauthenticated users redirect to `/login`.
