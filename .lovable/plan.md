# Plan: 4 workstreams

Each is independent — I'll ship them in one pass but they can be reviewed separately.

## 1. Workbench autosave + signed share links

**Autosave**
- New serverFn `saveWorkbenchTabs` (uses `requireSupabaseAuth`) writes to existing `workbench_tabs` (user_id, tab_id, title, sql, cursor, updated_at).
- `Workbench.tsx` debounces (1s idle) and calls autosave on every tab/SQL change. Load hydrates from `workbench_tabs` on mount, falls back to `workbench-storage` localStorage.
- Visual "Saved · Xs ago" indicator in the toolbar.

**Signed share links**
- Extend `shared_queries` with `token` (random 32-byte hex, unique), `expires_at`, `revoked`. Migration adds columns + index.
- ServerFn `createShareLink({ sql, title, ttlHours })` — inserts row, returns `/s/<token>`.
- Update `s.$slug.tsx` (or new `s.$token`) loader to look up by token, check expiry/revoked, 404 otherwise. Public `TO anon` SELECT policy scoped `WHERE revoked=false AND (expires_at IS NULL OR expires_at > now()) AND token = current_setting(...)` — simpler: keep policy `revoked=false AND expiry check`, filter by token in query.
- "Share" button in Workbench → dialog with TTL picker (1h / 24h / 7d / never), copy link + revoke button.
- Owner list under `/admin` (or user settings) to revoke.

## 2. Admin audit — search + CSV export

- `/admin/audit` gains: text search (action, target, user email), date range, action-type filter, pagination.
- All filtering server-side via new serverFn `listAuditLogs({ q, from, to, action, limit, cursor })` under `requireSupabaseAuth` + `has_role('admin')`.
- "Export CSV" button calls serverFn `exportAuditLogs(filters)` returning a CSV string; client triggers download. Streaming not needed at expected volumes; hard cap 50k rows with warning.

## 3. Multi-result harness

- `ResultsGrid.tsx` currently shows one tab. Refactor engines (`sqlite.ts`, `postgres.ts`, `alasql.ts`) to always return `Array<ResultSet>` where each statement's result is a set. Update `sql-router` to preserve statement boundaries.
- Grid renders shadcn `<Tabs>` — one per result set, labeled by statement fragment (first 40 chars of `SELECT ...` / `CREATE TRIGGER ...` etc.). Empty side-effect statements show "OK · N rows affected".
- For triggers: also fetch trigger metadata + fire-log table after execution, appended as an extra tab.
- Update `tests/e2e/smoke.spec.mjs` to run a fixture with GROUP BY + HAVING + trigger and assert every tab label is present in DOM.

## 4. OAuth consent page polish

- `src/routes/[.]lovable.oauth.consent.tsx`: replace bare page with:
  - App logo + name header, requesting client name + redirect origin.
  - Scope list rendered from the incoming `scope` param, each with a plain-language description (map: `read:snippets` → "View your saved SQL snippets", etc.).
  - "Allow" primary button, "Deny" secondary button.
  - Deny flow: post-back to Supabase's OAuth deny endpoint (`/authorize?...&decision=deny`) or 302 to `redirect_uri` with `?error=access_denied&state=...` per RFC 6749. Whichever path Supabase's managed OAuth server accepts — will verify with `supabase--debug_oauth_server`.
  - "Signed in as <email>" + switch-account link.

## Technical notes

**Migration** (workstream 1):
```sql
ALTER TABLE public.shared_queries
  ADD COLUMN IF NOT EXISTS token text UNIQUE,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS shared_queries_token_idx ON public.shared_queries(token) WHERE revoked=false;
```
Existing rows get a backfill token via `gen_random_bytes(16)`.

**Engines refactor** (workstream 3) is the riskiest — I'll keep the single-result path as a fallback so existing callers don't break, and layer multi-result behind a new `runAll()` method the grid opts into.

**Files touched (approx)**:
- `supabase/migrations/*` (1 new)
- `src/lib/workbench.functions.ts`, `src/features/workbench/Workbench.tsx`, `src/features/workbench/workbench-storage.ts`
- `src/lib/admin.functions.ts`, `src/routes/_authenticated/admin.audit.tsx`
- `src/lib/db/engines/*.ts`, `src/lib/db/sql-router.ts`, `src/features/database/ResultsGrid.tsx`
- `src/routes/[.]lovable.oauth.consent.tsx`
- `tests/e2e/smoke.spec.mjs`

## Order of execution

1. Migration (share links + any audit indexes)
2. Workstream 1 (autosave + share)
3. Workstream 2 (audit search/CSV)
4. Workstream 3 (multi-result harness)
5. Workstream 4 (consent UI)
6. Regenerate route tree, run `build:dev`, run smoke tests.

Confirm and I'll build straight through, or tell me to trim (e.g. defer the consent polish or the engines refactor to a follow-up).
