# Redesigned Challenges Section — LeetCode SQL-style

## Scope

Replace the current flat challenge list inside `LearnPanel.tsx` with a topic-organized, filterable, searchable challenge browser plus a detailed challenge view. Keep the existing dark theme and Workbench layout.

## Data model (new)

Create `src/features/challenges/catalog.ts` — a static catalog of ~40 SQL topics with challenges. Each challenge:

```ts
type Challenge = {
  id: string;              // "sel-01"
  number: number;          // display #
  title: string;
  topic: TopicId;          // "select-basics" | "where-filtering" | ...
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Interview";
  estMinutes: number;
  xp: number;
  concepts: string[];      // ["SELECT", "WHERE"]
  tags: string[];
  domain: string;          // "E-Commerce" | "Healthcare" | ...
  problem: string;         // markdown
  dbDescription: string;
  sampleInput: string;     // SQL or table markdown
  expectedOutput: string;
  starterSql: string;
  hints: [string, string]; // hint 1, hint 2
  solution: string;
  altSolution?: string;
  explanation: string;
  complexity: string;
  conceptsLearned: string[];
};
```

Ship an initial curated set (~60-80 challenges) spanning all 40 topics listed by the user. Existing generated advanced challenges stay untouched — this catalog lives alongside them under a new tab.

User state (bookmarks, favorites, solved) persists to `localStorage` under `sqlwb:challenges:v1` — no backend changes.

## UI

### New tab in LearnPanel: "Challenges"

Replaces the current Challenges area inside the Domains tab (kept for the domain-driven flow) with a dedicated top-level tab so both flows coexist.

```
[Domains] [Docs] [Syllabus] [Challenges] [Quiz]
```

### Challenges layout

```
┌─────────────────────────────────────────────────┐
│ Sticky bar: 🔍 Search…    [Difficulty ▾] [Topic▾]│
│              [Status ▾] [Domain ▾] [Sort ▾]      │
├─────────────────────────────────────────────────┤
│ Progress: 12/78 solved · 340 XP                 │
├─────────────────────────────────────────────────┤
│ ▾ SELECT Basics (4)                             │
│   ┌───────────────────────────────────────────┐ │
│   │ #1 Retrieve all users · 🟢 Beginner · 5m  │ │
│   │ 10 XP · SELECT, FROM · [★] [🔖] ✅        │ │
│   └───────────────────────────────────────────┘ │
│ ▸ WHERE & Filtering (6)                         │
│ ▸ ORDER BY (3)                                  │
│  …                                              │
└─────────────────────────────────────────────────┘
```

- Radix `Accordion` (already in shadcn) with `data-[state=open]:animate-accordion-down`.
- Difficulty badges — colored: green / yellow / orange / red (`bg-emerald-500/15 text-emerald-400`, etc.).
- Cards have hover-scale + subtle border glow on hover.
- Solved cards get a green left-border and check icon.
- Empty topics hidden after filtering.

### Challenge detail (in-panel drawer)

Opening a challenge slides in a full-panel view (Radix `Sheet` from right, `w-full`):

```
[← Back]  #7 Filter active users     🟢 Beginner · 15 XP · 8m

Tabs: [Problem] [Editor] [Hints] [Solution] [Explanation]

Problem tab:
  Problem statement (markdown)
  Database description
  Sample input (rendered table)
  Expected output (rendered table)

Editor tab:
  Monaco/textarea SQL editor (reuse existing)
  [Run] [Verify] [Submit]  — runs against active engine
  Results grid below

Hints tab:
  Locked: [Reveal Hint 1] → [Reveal Hint 2]

Solution tab:
  Primary solution + optional alternative
  "Open in editor" button

Explanation tab:
  Explanation prose
  Complexity note
  Concepts learned chips
```

Run/Verify/Submit call into the existing engine hook (`useEngine`) using the same shape as current LearnPanel challenge verification. Submit sets `solved=true` in local state and awards XP.

## Filters & search

Sticky top bar, `position: sticky; top: 0; z-index: 10; backdrop-blur`.

- Search: title + concepts + tags (case-insensitive substring).
- Difficulty: multi-select (Beginner / Intermediate / Advanced / Interview).
- Topic: multi-select of the 40 topics.
- Status: All / Solved / Unsolved / Bookmarked / Favorite.
- Domain: multi-select from catalog domains.
- Sort: Default / Difficulty asc / XP desc / Est. time asc.

Filter state lives in component state (not URL) to keep scope contained.

## Files

New:
- `src/features/challenges/types.ts`
- `src/features/challenges/catalog.ts` (data)
- `src/features/challenges/topics.ts` (topic metadata: id, label, icon, order)
- `src/features/challenges/storage.ts` (localStorage read/write for solved/bookmark/favorite)
- `src/features/challenges/ChallengesPanel.tsx` (list + filters + accordion)
- `src/features/challenges/ChallengeCard.tsx`
- `src/features/challenges/ChallengeDetail.tsx` (Sheet content with tabs)
- `src/features/challenges/DifficultyBadge.tsx`
- `src/features/challenges/FiltersBar.tsx`

Edited:
- `src/features/tutorials/LearnPanel.tsx` — add `Challenges` tab that mounts `<ChallengesPanel onOpenInEditor={...} />`.

No route changes, no server function changes, no DB migration.

## Verification

- `bun run build:dev` — clean typecheck + build.
- Manual: open Challenges tab → accordion expands, search narrows list, filters combine, difficulty badges render correct color, detail sheet opens, Run/Verify wire to engine, Bookmark/Favorite persist across reload.

## Out of scope (call out to user)

- Server-persisted progress (currently localStorage-only).
- Monaco upgrade in the detail editor (uses same editor primitive as current LearnPanel).
- New backend tables for XP leaderboard.
- Actual authoring of 300+ challenges — initial catalog ships ~60-80 curated; more can be added incrementally to `catalog.ts`.

Say the word and I'll build it.
