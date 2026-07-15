# Premium Platform Redesign

This is a large multi-area upgrade. To ship it without regressing the workbench, challenges, and progress systems already in place, I'll do it in **4 phases**. You approve the plan, I'll execute phase 1 immediately and continue through the phases in the same run.

---

## Phase 1 — Design System & Global Shell

Foundation everything else builds on.

- Refresh `src/styles.css` design tokens: deeper OKLCH palette, semantic surface layers (`--surface-1/2/3`), refined shadow scale, `--gradient-primary`, `--gradient-mesh`, motion timing tokens.
- Typography pairing: **Space Grotesk** (display) + **Inter** (body), loaded via `<link>` in `__root.tsx`.
- Global animation utilities: `animate-fade-in`, `animate-scale-in`, `hover-lift`, `shimmer` skeleton.
- **AppShell**: sticky top nav with logo, global command-palette search (⌘K), breadcrumb bar, theme toggle, user menu, connection/engine chip.
- Reusable primitives added: `<ProgressRing>`, `<StatCard>`, `<EmptyState>`, `<Skeleton>` variants, `<PageHeader>` with breadcrumb.
- Dark/light polish across all shadcn tokens (already have both; tightening contrast + accent).

## Phase 2 — Scalable Content Architecture

Make domains/topics/challenges data-driven so adding content is JSON-only.

```text
src/content/
  domains/           domain.json  (id, name, icon, color, description)
  topics/            topic.json   (id, domain, order, concepts[])
  companies/         company.json (id, name, logo, tier)
  challenges/        *.json       (id, title, difficulty, domain, topics[],
                                   companies[], statement, schema, seedSQL,
                                   expected, hints[], solution, altSolutions[],
                                   related[], next, tags[])
  schemas/           *.json       ER metadata: tables, columns, PK/FK, layout
```

- `src/lib/content/registry.ts` — Vite `import.meta.glob` auto-loads every JSON, validated with Zod, exposed via `useContent()`.
- Existing generator/catalog code becomes one _source_ that feeds the same registry, so nothing already shipped disappears.
- Progress + achievements read from the registry instead of hardcoded arrays → future JSON drops render automatically.

## Phase 3 — Premium Dashboard

New route `/dashboard` (default landing after sign-in).

- Hero row: 4 stat cards with progress rings (Solved, Streak, XP, Accuracy) + rank badge.
- **Continue Learning** carousel (last-attempted challenges).
- **Recently Viewed** and **Bookmarks/Favorites** rails.
- Domain grid with icons + completion ring per domain.
- Company grid with logos + question counts.
- Global filters bar (difficulty, domain, company, status, topic) with URL-synced state.
- Loading skeletons for every rail; empty states with CTAs.

## Phase 4 — Premium Challenge Page

Rebuild `/challenges/$id` as a 3-pane workspace.

```text
┌──────────────────────────────────────────────────────────┐
│ Breadcrumb · Bookmark · Favorite · Prev/Next            │
├──────────────┬───────────────────────────────────────────┤
│ Left tabs:   │  Monaco SQL Editor                        │
│  Problem     │  ─────────────────────────────────────    │
│  Schema      │  [Run] [Verify] [Submit] · timer · rows   │
│  ER Diagram  │  ─────────────────────────────────────    │
│  Hints       │  Result grid / Diff vs expected           │
│  Solution    │  ─────────────────────────────────────    │
│  Discussion  │  Notes · Bookmarks · Related · Next       │
│  Notes       │                                           │
└──────────────┴───────────────────────────────────────────┘
```

- **Problem Statement** rendered from JSON (markdown + examples).
- **Database Schema** panel reuses the Tables cards + Schema modal I just built.
- **ER Diagram** panel embeds the interactive SVG diagram scoped to this challenge's tables.
- Editor buttons: **Run** (execute), **Verify** (compare to expected), **Submit** (award XP + streak + achievement check).
- Execution result footer: status, execution time, rows returned, error.
- **Hints** progressive-reveal (locks XP penalty per hint like LeetCode).
- **Discussion** section (local threads, persisted in Cloud when signed in).
- **Notes** per challenge (autosave).
- **Bookmarks / Favorites / Recently Viewed** persisted per user (Cloud table when signed in, `localStorage` fallback otherwise).

---

## Backend (Lovable Cloud)

One migration adds:

- `user_progress` (user_id, challenge_id, status, best_time_ms, attempts, solved_at)
- `user_notes` (user_id, challenge_id, body)
- `user_bookmarks` (user_id, challenge_id, kind: bookmark|favorite|recent)
- `user_stats` (materialized from `user_progress` via view — streak, xp, accuracy, rank)
- `challenge_discussions` (user_id, challenge_id, body, parent_id)

All tables: RLS `auth.uid() = user_id`, `GRANT` to `authenticated` + `service_role`, `updated_at` trigger. Unsigned-in users still get everything via `localStorage`; signing in syncs.

---

## Out of Scope (call out explicitly)

- I will not rewrite the workbench engine layer or the challenges generator — they already work; I'll wire the registry to them.
- No new external services (all runs in-browser + Cloud).
- Company logos: I'll use lucide icons + first-letter monograms styled per-company (no third-party logo fetching / trademark issues); real SVG logos can be dropped into `src/content/companies/*/logo.svg` later without code changes.

## Risk / Size

~30–40 new/edited files. I'll ship phase 1 + 2 first (foundation + data), then 3 (dashboard), then 4 (challenge page) — each phase compiles and runs on its own so you can preview progress.

Reply **go** to start, or tell me which phase to skip / re-order.
