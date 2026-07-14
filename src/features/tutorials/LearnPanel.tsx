// @ts-nocheck
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight, Eye, EyeOff, GraduationCap, HelpCircle, Loader2, Lock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getLegacyDomains, getLegacyChapters, legacySyllabus } from "./legacy-adapter";
import { useEngine } from "@/lib/db/engine-provider";
import { toast } from "sonner";

interface Props {
  onOpenInEditor: (sql: string, filename?: string) => void;
}

export function LearnPanel({ onOpenInEditor }: Props) {
  const domains = useMemo(() => getLegacyDomains(), []);
  const chapters = useMemo(() => getLegacyChapters(), []);
  const [domainId, setDomainId] = useState(domains[0]?.id ?? "");
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");

  const domain = domains.find((d) => d.id === domainId);
  const chapter = chapters.find((c) => c.id === chapterId);

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="domains" className="flex h-full flex-col">
        <div className="border-b bg-muted/30 px-3">
          <TabsList className="h-9 bg-transparent">
            <TabsTrigger value="domains" className="text-xs">
              <GraduationCap className="mr-1 h-3.5 w-3.5" /> Domains
            </TabsTrigger>
            <TabsTrigger value="docs" className="text-xs">
              <BookOpen className="mr-1 h-3.5 w-3.5" /> Docs
            </TabsTrigger>
            <TabsTrigger value="syllabus" className="text-xs">
              Syllabus
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="text-xs">
              <HelpCircle className="mr-1 h-3.5 w-3.5" /> Quiz
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="domains" className="m-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            <ul className="max-h-40 shrink-0 overflow-y-auto border-b text-xs">
              {domains.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setDomainId(d.id)}
                    className={`flex w-full items-center gap-2 border-b px-3 py-2 text-left hover:bg-muted ${
                      d.id === domainId ? "bg-muted font-semibold" : ""
                    }`}
                  >
                    <ChevronRight className="h-3 w-3" /> {d.name}
                  </button>
                </li>
              ))}
            </ul>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
              {domain && <DomainDetail domain={domain} onOpenInEditor={onOpenInEditor} />}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="docs" className="m-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            <ul className="max-h-40 shrink-0 overflow-y-auto border-b text-xs">
              {chapters.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setChapterId(c.id)}
                    className={`flex w-full items-center gap-2 border-b px-3 py-2 text-left hover:bg-muted ${
                      c.id === chapterId ? "bg-muted font-semibold" : ""
                    }`}
                  >
                    <ChevronRight className="h-3 w-3" /> {c.title}
                  </button>
                </li>
              ))}
            </ul>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
              {chapter && (
                <article className="prose prose-sm max-w-none dark:prose-invert">
                  <h2>{chapter.title}</h2>
                  {chapter.subtitle && <p className="lead text-muted-foreground">{chapter.subtitle}</p>}
                  <p>{chapter.description}</p>
                  {chapter.sections?.map((s, i) => (
                    <section key={i}>
                      <h3>{s.title}</h3>
                      <p className="whitespace-pre-wrap">{s.description}</p>
                      {s.syntax && (
                        <pre className="rounded bg-slate-950 p-3 text-xs text-slate-100">
                          <code>{s.syntax}</code>
                        </pre>
                      )}
                      {s.example && (
                        <pre className="rounded bg-slate-950 p-3 text-xs text-slate-100">
                          <code>{s.example}</code>
                        </pre>
                      )}
                      {s.tips && (
                        <ul>
                          {s.tips.map((t, ti) => (
                            <li key={ti}>{t}</li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </article>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="syllabus" className="m-0 flex-1 overflow-y-auto p-4">
          <SyllabusView />
        </TabsContent>

        <TabsContent value="quizzes" className="m-0 flex-1 overflow-y-auto p-4">
          {domain && <MiniQuiz domainId={domain.id} quiz={domain.miniQuiz} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DomainDetail({
  domain,
  onOpenInEditor,
}: {
  domain: ReturnType<typeof getLegacyDomains>[number];
  onOpenInEditor: (sql: string, filename?: string) => void;
}) {
  const { engine, refreshTables } = useEngine();
  const [loading, setLoading] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const loadDomain = async () => {
    if (!engine || loading) return false;
    setLoading(true);
    try {
      await engine.reset();
      const script = domain.tables
        .map((t) => `${t.createScript}\n${t.insertScript}`)
        .join("\n");
      await engine.loadScript(script);
      await refreshTables();
      setLoadedId(domain.id);
      toast.success(`Loaded ${domain.name} into ${engine.label}`);
      return true;
    } catch (err) {
      toast.error("Failed to load domain", { description: (err as Error).message });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const startChallenge = async (q: (typeof domain.questions)[number]) => {
    if (loadedId !== domain.id) {
      const ok = await loadDomain();
      if (!ok) return;
    }
    const scaffold =
      `-- Challenge ${q.id} · ${q.category} · ${q.difficulty}\n` +
      `-- ${q.text}\n` +
      `--\n` +
      `-- Tables available: ${domain.tables.map((t) => t.name).join(", ")}\n` +
      `-- Write your SQL below and press Run.\n\n`;
    onOpenInEditor(scaffold, `${q.id}.sql`);
    toast.info(`Challenge ${q.id} opened — write your solution`);
  };

  return (
    <div className="space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold sm:text-xl">{domain.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {domain.businessScenario}
          </p>
        </div>
        <Button size="sm" onClick={loadDomain} disabled={loading} className="shrink-0">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          <span className="ml-1">
            {loadedId === domain.id ? "Reload" : "Load"} into engine
          </span>
        </Button>
      </header>

      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Real-world use
        </h3>
        <p className="text-xs sm:text-sm">{domain.realWorldUse}</p>
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Tables ({domain.tables.length})
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {domain.tables.map((t) => (
            <li key={t.name} className="min-w-0 rounded border p-2 text-xs">
              <div className="truncate font-mono text-sm font-semibold">{t.name}</div>
              <div className="line-clamp-2 text-muted-foreground">{t.description}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {t.columns.length} columns
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Challenges ({domain.questions.length}) — write, verify, and move on
        </h3>
        <ul className="space-y-2">
          {domain.questions.map((q, i) => (
            <BeginnerCard
              key={q.id}
              q={q}
              index={i}
              domainLoaded={loadedId === domain.id}
              ensureLoaded={loadDomain}
              onOpenInEditor={() => startChallenge(q)}
              nextId={domain.questions[i + 1]?.id ?? null}
              isFinal={i === domain.questions.length - 1}
            />
          ))}
        </ul>
      </section>

      <AdvancedTrack domain={domain} loadedId={loadedId} ensureLoaded={loadDomain} />
    </div>
  );
}

// ---------- Advanced (verified, sequential) ----------

function AdvancedTrack({
  domain,
  loadedId,
  ensureLoaded,
}: {
  domain: any;
  loadedId: string | null;
  ensureLoaded: () => Promise<boolean>;
}) {
  const advanced: any[] = domain.advancedQuestions ?? [];
  const storageKey = `learn.adv.solved.${domain.id}`;
  const [solved, setSolved] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) ?? "[]"));
    } catch {
      return new Set();
    }
  });

  const markSolved = (id: string) => {
    setSolved((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const reset = () => {
    setSolved(new Set());
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  if (!advanced.length) return null;

  // First unsolved index = the currently unlocked challenge. Everything after is locked.
  const currentIdx = advanced.findIndex((q) => !solved.has(q.id));
  const activeIdx = currentIdx === -1 ? advanced.length : currentIdx;
  const pct = Math.round((solved.size / advanced.length) * 100);

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Advanced track ({advanced.length}) — verified & sequential
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>
            {solved.size} / {advanced.length} solved
          </span>
          <button
            type="button"
            onClick={reset}
            className="rounded border px-1.5 py-0.5 hover:bg-muted"
          >
            Reset
          </button>
        </div>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded bg-muted">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-2">
        {advanced.map((q, i) => (
          <AdvancedCard
            key={q.id}
            q={q}
            index={i}
            state={
              solved.has(q.id) ? "solved" : i === activeIdx ? "active" : "locked"
            }
            domainLoaded={loadedId === domain.id}
            ensureLoaded={ensureLoaded}
            onSolved={() => markSolved(q.id)}
            nextId={advanced[i + 1]?.id ?? null}
            isFinal={i === advanced.length - 1}
          />
        ))}
      </ul>
    </section>
  );
}

function normalizeRows(rows: unknown[][]): string {
  // Sort row-major so ORDER BY differences don't matter for verification.
  // Each row is stringified via JSON to keep types stable across engines.
  const asStrings = rows.map((r) => JSON.stringify(r.map((v) => (v == null ? null : String(v)))));
  asStrings.sort();
  return asStrings.join("|");
}

function explainQuery(sql: string): string {
  const s = sql.toUpperCase();
  const bits: string[] = [];
  if (s.includes("WITH ")) bits.push("Uses a CTE (WITH clause) to name an intermediate result set before the final SELECT.");
  if (/UNION\s+ALL/.test(s)) bits.push("Combines multiple SELECTs with UNION ALL (keeps duplicates, one row per input).");
  else if (s.includes("UNION")) bits.push("Combines SELECTs with UNION (deduplicates rows).");
  if (s.includes("GROUP BY")) bits.push("Groups rows so aggregate functions (COUNT/SUM/AVG) can be computed per group.");
  if (s.includes("HAVING")) bits.push("Filters groups after aggregation using HAVING.");
  if (s.includes("COUNT(DISTINCT")) bits.push("COUNT(DISTINCT …) counts unique values — used here to detect duplicates.");
  if (/JOIN/.test(s)) bits.push("Uses a JOIN to correlate rows across tables.");
  if (/\bA\.[A-Z_]+\s*<\s*B\./.test(s) || /FROM\s+\w+\s+A\s*,\s*\w+\s+B/.test(s)) bits.push("Self-join with an inequality (a.pk < b.pk) counts unordered pairs exactly once.");
  if (s.includes("CASE ")) bits.push("Uses CASE to produce a conditional value per row.");
  if (s.includes("ORDER BY")) bits.push("ORDER BY controls the final row order.");
  if (/\bIN\s*\(SELECT/.test(s)) bits.push("Uses a subquery in IN (…) to filter by a set of values.");
  if (!bits.length) bits.push("Straight SELECT with aggregation / filtering.");
  return bits.join(" ");
}

function AdvancedCard({
  q,
  index,
  state,
  domainLoaded,
  ensureLoaded,
  onSolved,
  nextId,
  isFinal,
}: {
  q: any;
  index: number;
  state: "locked" | "active" | "solved";
  domainLoaded: boolean;
  ensureLoaded: () => Promise<boolean>;
  onSolved: () => void;
  nextId: string | null;
  isFinal: boolean;
}) {
  const { runQuery } = useEngine();
  const [sql, setSql] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; msg: string }
    | { kind: "err"; msg: string; detail?: string }
    | null
  >(null);

  const locked = state === "locked";
  const solved = state === "solved";

  const goNext = () => {
    if (!nextId) return;
    const el = document.getElementById(`adv-card-${nextId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1600);
    }
  };

  const verify = async () => {
    if (!sql.trim()) {
      setFeedback({ kind: "err", msg: "Write some SQL first." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      if (!domainLoaded) {
        const ok = await ensureLoaded();
        if (!ok) {
          setFeedback({ kind: "err", msg: "Domain failed to load into the engine." });
          return;
        }
      }
      const [mine, ref] = await Promise.all([runQuery(sql), runQuery(q.expectedQuery)]);
      if (mine.error) {
        setAttempts((a) => a + 1);
        setFailed(true);
        setFeedback({ kind: "err", msg: "Your SQL errored.", detail: mine.error });
        return;
      }
      if (ref.error || !ref.results?.length) {
        setFeedback({
          kind: "err",
          msg: "Reference query failed to run — please reload the domain.",
          detail: ref.error ?? "",
        });
        return;
      }
      const mineLast = mine.results?.[mine.results.length - 1];
      const refLast = ref.results[ref.results.length - 1];
      if (!mineLast) {
        setAttempts((a) => a + 1);
        setFailed(true);
        setFeedback({ kind: "err", msg: "Your query returned no result set." });
        return;
      }
      const okRows = normalizeRows(mineLast.rows) === normalizeRows(refLast.rows);
      const okCols =
        mineLast.columns.length === refLast.columns.length &&
        mineLast.rows.length === refLast.rows.length;
      if (okRows && okCols) {
        setFailed(false);
        setFeedback({
          kind: "ok",
          msg: `Correct! ${mineLast.rows.length} row(s), ${mine.durationMs.toFixed(0)}ms.`,
        });
        onSolved();
        toast.success(`Challenge ${q.id} solved`);
      } else {
        setAttempts((a) => a + 1);
        setFailed(true);
        setFeedback({
          kind: "err",
          msg: "Result doesn't match the reference.",
          detail: `Expected ${refLast.rows.length} row(s) × ${refLast.columns.length} col(s); got ${mineLast.rows.length} × ${mineLast.columns.length}.`,
        });
      }
    } catch (e) {
      setAttempts((a) => a + 1);
      setFailed(true);
      setFeedback({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const revealRef = showSolution || failed;

  return (
    <li
      id={`adv-card-${q.id}`}
      className={`rounded border p-3 transition-shadow ${
        solved ? "border-emerald-500/60 bg-emerald-500/5" : locked ? "opacity-60" : ""
      }`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {solved ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            ) : locked ? (
              <Lock className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3 text-primary" />
            )}
            #{index + 1} · {q.category} · {q.difficulty}
          </div>
          <p className="mt-1 break-words text-sm">{q.text}</p>
        </div>
      </div>

      {!locked && !solved && (
        <>
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            spellCheck={false}
            placeholder="-- Write your SQL, then click Verify"
            className="mt-2 h-24 w-full resize-y rounded border bg-background p-2 font-mono text-[12px]"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={verify} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Verify
            </Button>
            {!failed && (
              <button
                type="button"
                onClick={() => setShowSolution((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {showSolution ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showSolution ? "Hide reference" : "Reveal reference"}
              </button>
            )}
            {attempts > 0 && (
              <span className="text-[11px] text-muted-foreground">Attempts: {attempts}</span>
            )}
          </div>
          {feedback && (
            <div
              className={`mt-2 rounded border p-2 text-xs ${
                feedback.kind === "ok"
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-destructive/60 bg-destructive/10 text-destructive"
              }`}
            >
              <div className="font-semibold">{feedback.msg}</div>
              {"detail" in feedback && feedback.detail ? (
                <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">
                  {feedback.detail}
                </pre>
              ) : null}
            </div>
          )}
          {revealRef && (
            <div className="mt-2 space-y-2">
              {failed && (
                <div className="rounded border border-amber-500/60 bg-amber-500/10 p-2 text-[11px] text-amber-800 dark:text-amber-200">
                  <div className="mb-1 font-semibold uppercase tracking-wide">
                    Reference solution & explanation
                  </div>
                  <p className="leading-relaxed">{explainQuery(q.expectedQuery)}</p>
                </div>
              )}
              <pre className="overflow-x-auto rounded bg-slate-950 p-2 text-[11px] leading-relaxed text-slate-100 select-text">
                <code>{q.expectedQuery}</code>
              </pre>
              {failed && (
                <p className="text-[11px] text-muted-foreground">
                  Read the reference, then edit your SQL above and click Verify again.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {solved && (
        <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="min-w-0 text-xs text-emerald-700 dark:text-emerald-300">
            Solved. {isFinal ? "You finished the advanced track!" : "Next challenge unlocked."}
          </p>
          {!isFinal && nextId && (
            <Button size="sm" variant="secondary" onClick={goNext} className="w-full sm:w-auto">
              Next tough challenge <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
      {locked && (
        <p className="mt-2 text-xs text-muted-foreground">
          Solve the previous challenge to unlock.
        </p>
      )}
    </li>
  );
}

function BeginnerCard({
  q,
  index,
  domainLoaded,
  ensureLoaded,
  onOpenInEditor,
  nextId,
  isFinal,
}: {
  q: { id: string; text: string; category: string; difficulty: string; expectedQuery: string };
  index: number;
  domainLoaded: boolean;
  ensureLoaded: () => Promise<boolean>;
  onOpenInEditor: () => void;
  nextId: string | null;
  isFinal: boolean;
}) {
  const { runQuery } = useEngine();
  const [sql, setSql] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [busy, setBusy] = useState(false);
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; msg: string }
    | { kind: "err"; msg: string; detail?: string }
    | null
  >(null);

  const goNext = () => {
    if (!nextId) return;
    const el = document.getElementById(`beg-card-${nextId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1600);
    }
  };

  const verify = async () => {
    if (!sql.trim()) {
      setFeedback({ kind: "err", msg: "Write some SQL first." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      if (!domainLoaded) {
        const ok = await ensureLoaded();
        if (!ok) {
          setFeedback({ kind: "err", msg: "Domain failed to load into the engine." });
          return;
        }
      }
      const [mine, ref] = await Promise.all([runQuery(sql), runQuery(q.expectedQuery)]);
      if (mine.error) {
        setAttempts((a) => a + 1);
        setFeedback({ kind: "err", msg: "Your SQL errored.", detail: mine.error });
        return;
      }
      if (ref.error || !ref.results?.length) {
        setFeedback({
          kind: "err",
          msg: "Reference query failed — reload the domain.",
          detail: ref.error ?? "",
        });
        return;
      }
      const mineLast = mine.results?.[mine.results.length - 1];
      const refLast = ref.results[ref.results.length - 1];
      if (!mineLast) {
        setAttempts((a) => a + 1);
        setFeedback({ kind: "err", msg: "Your query returned no result set." });
        return;
      }
      const okRows = normalizeRows(mineLast.rows) === normalizeRows(refLast.rows);
      const okCols =
        mineLast.columns.length === refLast.columns.length &&
        mineLast.rows.length === refLast.rows.length;
      if (okRows && okCols) {
        setSolved(true);
        setFeedback({
          kind: "ok",
          msg: `Correct! ${mineLast.rows.length} row(s), ${mine.durationMs.toFixed(0)}ms.`,
        });
        toast.success(`Challenge ${q.id} solved`);
      } else {
        setAttempts((a) => a + 1);
        setFeedback({
          kind: "err",
          msg: "Result doesn't match the reference.",
          detail: `Expected ${refLast.rows.length} row(s) × ${refLast.columns.length} col(s); got ${mineLast.rows.length} × ${mineLast.columns.length}.`,
        });
      }
    } catch (e) {
      setAttempts((a) => a + 1);
      setFeedback({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li
      id={`beg-card-${q.id}`}
      className={`rounded border p-3 transition-shadow ${
        solved ? "border-emerald-500/60 bg-emerald-500/5" : ""
      }`}
    >
      <div className="flex items-start gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {solved ? (
          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
        ) : (
          <Play className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
        )}
        <span className="min-w-0 break-words">
          #{index + 1} · {q.id} · {q.category} · {q.difficulty}
        </span>
      </div>
      <p className="mt-1 break-words text-sm">{q.text}</p>

      <textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        spellCheck={false}
        placeholder="-- Write your SQL, then click Verify"
        className="mt-2 h-24 w-full resize-y rounded border bg-background p-2 font-mono text-[12px]"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={verify} disabled={busy}>
          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
          Verify
        </Button>
        <Button size="sm" variant="outline" onClick={onOpenInEditor}>
          Open in editor
        </Button>
        <button
          type="button"
          onClick={() => setShowSolution((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          aria-expanded={showSolution}
        >
          {showSolution ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showSolution ? "Hide reference" : "Reveal reference"}
        </button>
        {attempts > 0 && (
          <span className="ml-auto text-[11px] text-muted-foreground">Attempts: {attempts}</span>
        )}
      </div>

      {feedback && (
        <div
          className={`mt-2 rounded border p-2 text-xs ${
            feedback.kind === "ok"
              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/60 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="font-semibold">{feedback.msg}</div>
          {"detail" in feedback && feedback.detail ? (
            <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">
              {feedback.detail}
            </pre>
          ) : null}
        </div>
      )}

      {showSolution && (
        <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-2 text-[11px] leading-relaxed text-slate-100 select-text">
          <code>{q.expectedQuery}</code>
        </pre>
      )}

      {solved && !isFinal && nextId && (
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="secondary" onClick={goNext} className="w-full sm:w-auto">
            Next challenge <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {solved && isFinal && (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
          All beginner challenges solved. Try the Advanced track below.
        </p>
      )}
    </li>
  );
}


function SyllabusView() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {legacySyllabus.categories.map((c, i) => (
        <div key={i} className="rounded border p-3">
          <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{c.fullName}</div>
          <h3 className="mb-2 text-sm font-semibold">{c.category}</h3>
          <p className="mb-2 text-xs text-muted-foreground">{c.description}</p>
          <ul className="space-y-1 text-xs">
            {c.commands.map((cmd, j) => (
              <li key={j} className="rounded bg-muted/40 px-2 py-1">
                <span className="font-mono font-semibold">{cmd.name}</span>
                <span className="ml-2 text-muted-foreground">{cmd.description}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MiniQuiz({ domainId, quiz }: { domainId: string; quiz: ReturnType<typeof getLegacyDomains>[number]["miniQuiz"] }) {
  const [picks, setPicks] = useState<Record<number, number>>({});
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">Quiz for domain: {domainId}</div>
      {quiz.map((q, i) => (
        <div key={i} className="rounded border p-3">
          <div className="mb-2 text-sm font-semibold">
            {i + 1}. {q.question}
          </div>
          <ul className="space-y-1">
            {q.options.map((opt, oi) => {
              const picked = picks[i];
              const isPicked = picked === oi;
              const isCorrect = picked !== undefined && oi === q.correctIndex;
              const isWrong = picked === oi && oi !== q.correctIndex;
              return (
                <li key={oi}>
                  <button
                    onClick={() => setPicks((s) => ({ ...s, [i]: oi }))}
                    className={`w-full rounded border px-3 py-1.5 text-left text-xs ${
                      isCorrect
                        ? "border-emerald-500 bg-emerald-500/10"
                        : isWrong
                          ? "border-destructive bg-destructive/10"
                          : isPicked
                            ? "bg-muted"
                            : "hover:bg-muted/40"
                    }`}
                  >
                    {opt}
                  </button>
                </li>
              );
            })}
          </ul>
          {picks[i] !== undefined && (
            <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
          )}
        </div>
      ))}
    </div>
  );
}
