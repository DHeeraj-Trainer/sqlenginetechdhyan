# Production Upgrade Plan

This is a large, multi-track request. To keep it shippable, I'll split it into phases and confirm a few decisions before writing code. Each phase is independently useful and builds on the previous one.

## Phase 1 — Enable Lovable Cloud (foundation)

Required for auth, persistence, quotas, and sharing. Without this, tabs/history/sharing/auth cannot be built.

- Enable Lovable Cloud (Supabase-managed).
- Configure email/password + Google sign-in (defaults).
- Create the `_authenticated` layout gate.
- Add `/auth` public route (sign in / sign up / password reset).

## Phase 2 — Persist tabs, history, snippets, and settings to Cloud

Replace localStorage-only `use-persisted-state` with a Cloud-backed store, keeping localStorage as an offline cache/fallback.

Schema (all RLS-scoped to `auth.uid()`):
- `workbench_tabs(id, user_id, title, sql, engine, order, updated_at)`
- `workbench_history(id, user_id, sql, engine, status, duration_ms, executed_at)`
- `workbench_snippets(id, user_id, name, sql, engine, tags[], created_at)`
- `workbench_settings(user_id PK, theme, default_engine, editor_prefs jsonb)`
- `shared_queries(id, owner_id, slug, sql, engine, title, visibility, created_at)` — for sharing.

Server functions under `src/lib/workbench.functions.ts` using `requireSupabaseAuth`.

## Phase 3 — Saved Query Sharing

- "Share" button → creates `shared_queries` row + public link `/s/:slug`.
- Public route with SSR head/OG tags (title/description from query title).
- Read-only viewer with "Open in Workbench" (requires sign-in) that copies into a new tab.

## Phase 4 — Server SQL engines behind `/api/db/*`

TanStack server routes (not Edge Functions):
- `POST /api/db/mysql/query`
- `POST /api/db/postgres/query`

Guardrails (all handlers):
- `requireSupabaseAuth` bearer check.
- Zod validation: `{ sql: string(max 10k), params?: unknown[], connectionId: uuid }`.
- Per-user quota: rows/day counter in `db_usage(user_id, day, queries, rows)` table; reject over cap.
- Ad-hoc rate limit (token bucket in Postgres): N req / 10s per user. (Flagged as best-effort — no infra primitive yet.)
- Statement guard: block DDL/`COPY`/multi-statement unless explicitly allowed per connection.
- Query timeout (5s default), row cap (10k) with truncation flag.

**Connection storage:** encrypted connection strings in `db_connections(user_id, id, kind, ciphertext, name)` using AES-256-GCM with a Lovable secret. UI to add/test/delete.

**Note:** Actual outbound MySQL/Postgres from the Worker requires HTTP-compatible drivers:
- Postgres: use Neon serverless driver (`@neondatabase/serverless`) OR postgres.js over `postgres://` if network allows.
- MySQL: use PlanetScale/`@planetscale/database` (HTTP) OR mysql2 if TCP works.
- Raw TCP to arbitrary hosts may fail on Cloudflare Workers. **Decision needed** (see questions).

## Phase 5 — Virtualized Results Grid

Replace current grid with `@tanstack/react-virtual` row virtualizer. Keep sort/filter/resize/export. Windowed rendering keeps 100k rows smooth. Add sticky header, column virtualization for very wide tables (>50 cols), and "Load more" for streamed results.

## Phase 6 — Visual Join Explainer

Before running a query with JOINs:
1. Parse SQL client-side with `node-sql-parser` to extract tables + join conditions.
2. Render an SVG canvas: tables as cards (columns listed, PK/FK badges), edges connecting join keys.
3. Highlight the ON conditions; badge inferred cardinality (1:1, 1:N, N:M) from schema PK/FK metadata.
4. Warn on: cartesian products (missing ON), type mismatches, missing indexes on join keys (server engines only), and columns not in schema.
5. "Explain" button in editor toolbar opens a modal; also inline pill above results.

Library: `reactflow` for the visual graph (already common; small footprint).

## Phase 7 — Sidebar UI Fix

Rebuild `DatabaseExplorer` sidebar:
- Proper resizable panel (`react-resizable-panels`) with min/max/collapse.
- Fixed header (engine switcher, search) + scrollable tree.
- Chevron rotation, hover states, icons per node type (db/schema/table/view/column/index/PK/FK).
- Right-click context menu (Preview 100 rows, Copy name, Generate SELECT/JOIN).
- Empty/loading/error states.
- Keyboard nav (↑↓ ← →, Enter to expand).

## Phase 8 — Component tests (Playwright CT)

Install `@playwright/experimental-ct-react`. Cover:
- MonacoSqlEditor: mounts, executes on Ctrl+Enter, formats on Shift+Alt+F.
- ResultsGrid: renders 10k rows without jank, sort/filter/export.
- DatabaseExplorer: expand/collapse, context menu, keyboard nav.
- JoinExplainer: parses sample SQL, renders correct edges.

## Phase 9 — Docs & Cleanup

- `README.md` architecture diagram, API docs for `/api/db/*` and server fns, DB schema ERD, component tree.
- Remove any remaining legacy stubs.

---

## Technical Notes

- All server routes: TanStack `createFileRoute` + `server.handlers`, not Supabase Edge Functions.
- Bearer attached automatically via existing `functionMiddleware`.
- Secrets: connection encryption key via `generate_secret`.
- Rate-limit primitive is ad-hoc (Postgres-based) — documented limitation.
- `node-sql-parser` and `reactflow` are Worker-safe (pure JS).
- Neon/PlanetScale drivers are HTTP → Worker-safe. Raw `pg`/`mysql2` TCP may not be.

## Execution Order & Rough Effort

```text
Phase 1 (Cloud + auth)          ~1 turn
Phase 7 (sidebar UI)            ~1 turn   ← quick win, parallelizable
Phase 2 (persistence)           ~1 turn
Phase 5 (virtualization)        ~1 turn
Phase 6 (join explainer)        ~2 turns
Phase 3 (sharing)               ~1 turn
Phase 4 (server engines)        ~2 turns  ← biggest risk (driver compat)
Phase 8 (CT tests)              ~1 turn
Phase 9 (docs)                  ~1 turn
```

Total: ~10 focused turns. I recommend shipping phase-by-phase so you can verify each in the preview.

---

## Before I start — 4 quick decisions

1. **Server engine drivers** — Cloudflare Workers can't open raw TCP to arbitrary MySQL/Postgres hosts. Options:
   - (a) Support **Neon (Postgres)** + **PlanetScale (MySQL)** only via their HTTP drivers. Reliable, but user must host DB there.
   - (b) Add a **BYO connection string** field and attempt `postgres.js`/`mysql2` — may fail depending on host.
   - (c) Both: prefer HTTP drivers, fall back to TCP with a clear "may not work on some hosts" warning.

2. **Sharing visibility** — public link (anyone with URL) only, or also "workspace-only" (signed-in users of this app)?

3. **Auth methods** — email/password + Google (default), or add Apple/phone/magic-link?

4. **Start point** — ship all phases sequentially in one long run, or stop after Phase 1+2+7 for you to review before continuing?

Answer these and I'll begin Phase 1 immediately.