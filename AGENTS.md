## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Project structure

Monorepo with two packages, both deployed to Vercel:

- `backend/` — NestJS 11 API, port 3001, entry `src/main.ts`
- `frontend/` — Next.js 16 App Router, port 3000

Root `package.json` is empty (only Vercel analytics deps). All development happens in the subdirectories.

## Local dev

```powershell
# Backend (separate terminal)
cd backend; npm run start:dev

# Frontend (separate terminal)
cd frontend; npm run dev
```

The frontend proxies API calls to `localhost:3001` via `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`).

## Database

PostgreSQL via Supabase, accessed through Prisma with `multiSchema` feature (`auth` + `public` schemas).

**Two duplicate Prisma schemas** — `backend/prisma/schema.prisma` and `frontend/prisma/schema.prisma`. Both must be kept in sync. Both have `multiSchema` enabled.

Required env vars: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`.

Backend `postinstall` runs `prisma generate` automatically. Frontend `build` also runs `prisma generate`.

## Auth

Custom JWT-based auth (not Supabase Auth client-side). Token stored in `localStorage`, sent as `Authorization: Bearer <token>` via Axios interceptor in `src/lib/api.ts`. Backend guards use `@nestjs/jwt`.

## Backend quirks

- **CORS** is handled manually in a middleware at `backend/src/main.ts:8-24`, not via NestJS `enableCors()`
- **Body limit** is set to `50mb` for base64 evidence images (`backend/src/main.ts:27-28`)
- **Vercel dual-mode** — when `process.env.VERCEL` is set, the app exports a serverless handler; otherwise it listens directly on port 3001
- ESLint has `@typescript-eslint/no-explicit-any: off` — `any` is allowed throughout

## Frontend quirks

- Tailwind CSS **v4** with `@tailwindcss/postcss` — not the classic Tailwind config approach
- Next.js 16 is recent; check `node_modules/next/dist/docs/` for API changes before writing code
- Uses `sonner` for toast notifications, `framer-motion` for animations, `lucide-react` for icons
- `@/*` path alias maps to `./src/*`
- Server actions have a `10mb` body limit (configured in `next.config.ts`)
- ESLint extends `eslint-config-next` core-web-vitals + typescript presets

## Testing

- Backend unit tests: `cd backend; npm test` (Jest, `*.spec.ts` in `src/`)
- Backend E2E tests: `cd backend; npm run test:e2e` (Jest, `test/` directory)
- No frontend tests found

## Deployment

Both packages have `.vercel/` directories and `vercel.json` / `next.config.ts`. The backend CORS origin is pinned to `https://smarttracking-frontend.vercel.app` in `vercel.json`.

## Style

- Backend uses Prettier + ESLint with `endOfLine: "auto"` (Windows compat)
- No code comments convention observed — avoid adding comments unless clarifying non-obvious logic
