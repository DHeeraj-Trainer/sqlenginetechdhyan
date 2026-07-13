# SQL Online Training Portal

A production-quality, browser-first SQL learning platform with a real
IDE-style workbench, sample databases, a virtualized result grid, an AI
tutor, and Cloud-backed persistence.

## Highlights

- **In-browser SQL engines** — SQLite (via `sql.js`), PGlite (Postgres),
  and AlaSQL fallback. No server round-trip for query execution.
- **Monaco editor** with SQL syntax, formatter (`sql-formatter`), schema
  autocomplete, and `Ctrl/Cmd+Enter` to run.
- **Virtualized results** using `@tanstack/react-virtual` — smooth for
  100k+ rows.
- **Cloud persistence** — tabs, history, and snippets sync to Lovable
  Cloud (Postgres + RLS) when signed in; guests keep localStorage.
- **Shareable queries** — `/s/:slug` public read-only view with OG tags.
- **Learn panel** with integrated legacy tutorials, quizzes, and challenges.
- **AI Tutor** streamed from the Lovable AI Gateway.

## Stack

TanStack Start (React 19, Vite 7) · Tailwind v4 · shadcn/ui · Supabase
(Lovable Cloud) · TanStack Query · Monaco Editor · sql.js · PGlite

## Architecture

```text
Browser (React + TanStack Start)
├── src/routes/
│   ├── __root.tsx            Global head/CSS, badge-strip guard
│   ├── index.tsx             Workbench entry
│   ├── auth.tsx              Email + Google sign-in
│   ├── reset-password.tsx
│   ├── s.$slug.tsx           Public shared query viewer
│   └── api/tutor/…           AI tutor streaming endpoint
├── src/features/
│   ├── workbench/            Shell, tabs, storage hooks
│   ├── sql-editor/           Monaco integration
│   ├── database/             Explorer + virtualized ResultsGrid
│   ├── tutorials/            LearnPanel + legacy content adapter
│   └── ai/                   AiTutorPanel
├── src/lib/db/               Engine abstraction (sqlite/pglite/alasql)
└── src/lib/workbench.functions.ts   TanStack server functions

Lovable Cloud (Supabase)
├── auth.users                built-in
├── public.profiles
├── public.user_roles / has_role()
├── public.workbench_tabs
├── public.workbench_history
├── public.workbench_snippets
└── public.shared_queries
```

## Database schema (public)

| Table                | Purpose                                       | RLS scope                     |
| -------------------- | --------------------------------------------- | ----------------------------- |
| `profiles`           | Display name / avatar per user                | Read all authed; write own    |
| `user_roles`         | RBAC (admin, moderator, user)                 | Read own                      |
| `workbench_tabs`     | Persisted editor tabs                         | Manage own                    |
| `workbench_history`  | Query execution history (last 200 per user)   | Manage own                    |
| `workbench_snippets` | Saved reusable SQL snippets                   | Manage own                    |
| `shared_queries`     | Public/workspace share links (`/s/:slug`)     | Public read; owner writes     |

All tables have `GRANT`s scoped to the roles their policies allow.
`shared_queries.slug` is a random 12-char id.

## API surface

### App-internal (`createServerFn`, RPC)

Located in `src/lib/workbench.functions.ts`. All authed except `getSharedQuery`.

| Function          | Method | Auth | Body                                                    |
| ----------------- | ------ | ---- | ------------------------------------------------------- |
| `listTabs`        | GET    | ✅   | —                                                       |
| `upsertTab`       | POST   | ✅   | `{ id?, title, sql, engine, sortOrder, isActive }`      |
| `deleteTab`       | POST   | ✅   | `{ id }`                                                |
| `listHistory`     | GET    | ✅   | —                                                       |
| `pushHistory`     | POST   | ✅   | `{ sql, engine, status, durationMs, errorMessage? }`    |
| `clearHistory`    | POST   | ✅   | —                                                       |
| `listSnippets`    | GET    | ✅   | —                                                       |
| `saveSnippet`     | POST   | ✅   | `{ name, sql, engine, tags }`                           |
| `deleteSnippet`   | POST   | ✅   | `{ id }`                                                |
| `createShare`     | POST   | ✅   | `{ title, description?, sql, engine, visibility }`      |
| `getSharedQuery`  | GET    | ❌   | `{ slug }` — anon via publishable key + `TO anon` RLS   |

### Public HTTP

| Route                        | Purpose                                    |
| ---------------------------- | ------------------------------------------ |
| `/api/tutor/chat-stream`     | Streamed AI tutor completions              |
| `/s/:slug`                   | Public read-only shared-query viewer       |

## Local development

```bash
bun install
bun run dev
```

Environment (auto-injected by Lovable Cloud):

| Var                              | Where             |
| -------------------------------- | ----------------- |
| `VITE_SUPABASE_URL`              | Browser           |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | Browser           |
| `SUPABASE_URL`                   | Server functions  |
| `SUPABASE_PUBLISHABLE_KEY`       | Server functions  |
| `SUPABASE_SERVICE_ROLE_KEY`      | Server (admin)    |
| `LOVABLE_API_KEY`                | AI Gateway        |

## Roadmap

Delivered in this milestone: Cloud persistence (Phase 2), virtualized
results (Phase 5), public sharing (Phase 3), theme + a11y refresh, docs
(Phase 9).

Still to do:

- **Phase 4 — Server SQL engines** (`/api/db/mysql`, `/api/db/postgres`).
  Requires a Worker-compatible HTTP driver (Neon serverless / PlanetScale
  HTTP) and connection strings supplied by the user.
- **Phase 6 — Visual join explainer** with `reactflow` + `node-sql-parser`.
- **Phase 8 — Playwright Component Tests** for MonacoSqlEditor,
  ResultsGrid, DatabaseExplorer.

## Security notes

- RLS is enabled on every user-owned table.
- `shared_queries` exposes only rows where `visibility = 'public'` to `anon`.
- Service-role key never crosses the RPC boundary; loaded inside handlers.
- The Lovable badge is stripped by early inline CSS + a MutationObserver
  in `__root.tsx`.
