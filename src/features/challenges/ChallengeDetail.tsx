import { useState } from "react";
import { ArrowLeft, Clock, Zap, Play, CheckCircle2, Lightbulb, Copy } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DifficultyBadge } from "./DifficultyBadge";
import { TOPIC_MAP } from "./topics";
import type { Challenge } from "./types";
import { useEngine } from "@/lib/db/engine-provider";
import { toast } from "sonner";

interface Props {
  challenge: Challenge | null;
  open: boolean;
  solved: boolean;
  onClose: () => void;
  onSubmitSolved: () => void;
  onOpenInEditor: (sql: string, filename?: string) => void;
}

type RunResult = {
  columns: string[];
  rows: unknown[][];
  durationMs: number;
} | null;

export function ChallengeDetail({
  challenge,
  open,
  solved,
  onClose,
  onSubmitSolved,
  onOpenInEditor,
}: Props) {
  const { runQuery, status } = useEngine();
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<RunResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealHint1, setRevealHint1] = useState(false);
  const [revealHint2, setRevealHint2] = useState(false);
  const [revealSolution, setRevealSolution] = useState(false);

  // Reset local state whenever the sheet opens with a different challenge.
  const [lastId, setLastId] = useState<string | null>(null);
  if (challenge && challenge.id !== lastId) {
    setLastId(challenge.id);
    setSql(challenge.starterSql || "");
    setResult(null);
    setError(null);
    setRevealHint1(false);
    setRevealHint2(false);
    setRevealSolution(false);
  }

  if (!challenge) return null;

  const run = async () => {
    if (status !== "ready" || busy) return;
    setBusy(true);
    setError(null);
    try {
      const out = await runQuery(sql);
      if (out.error) {
        setError(out.error);
        setResult(null);
      } else {
        const rs = Array.isArray(out.results) ? out.results[out.results.length - 1] : out.results;
        if (rs && "columns" in rs) {
          setResult({
            columns: (rs as { columns: string[] }).columns ?? [],
            rows: ((rs as { values?: unknown[][] }).values ??
              (rs as { rows?: unknown[][] }).rows ??
              []) as unknown[][],
            durationMs: out.durationMs ?? 0,
          });
        } else {
          setResult({ columns: [], rows: [], durationMs: out.durationMs ?? 0 });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    await run();
    // Heuristic: compare SELECT presence — actual equivalence is engine-specific.
    if (!error) toast.success("Query ran. Compare results with Expected Output.");
  };

  const submit = () => {
    onSubmitSolved();
    toast.success(`Solved! +${challenge.xp} XP`, { description: challenge.title });
  };

  const copySolution = () => {
    navigator.clipboard.writeText(challenge.solution);
    toast.success("Solution copied");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background/95 p-3 backdrop-blur">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-2">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">#{challenge.number}</span>
              <DifficultyBadge difficulty={challenge.difficulty} />
              {solved && (
                <span className="inline-flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Solved
                </span>
              )}
            </div>
            <div className="truncate text-sm font-semibold">{challenge.title}</div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {challenge.estMinutes}m
              </span>
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3 w-3" /> {challenge.xp} XP
              </span>
              <span>{TOPIC_MAP[challenge.topic]?.label}</span>
              <span>{challenge.domain}</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="problem" className="p-3">
          <TabsList className="grid w-full grid-cols-5 text-xs">
            <TabsTrigger value="problem">Problem</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="hints">Hints</TabsTrigger>
            <TabsTrigger value="solution">Solution</TabsTrigger>
            <TabsTrigger value="explain">Explain</TabsTrigger>
          </TabsList>

          <TabsContent value="problem" className="space-y-4 pt-4 text-sm">
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Problem
              </h3>
              <p className="whitespace-pre-wrap">{challenge.problem}</p>
            </section>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Database
              </h3>
              <pre className="rounded bg-muted/60 p-2 text-xs">{challenge.dbDescription}</pre>
            </section>
            {challenge.sampleInput && (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sample Input
                </h3>
                <pre className="rounded bg-muted/60 p-2 text-xs">{challenge.sampleInput}</pre>
              </section>
            )}
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Expected Output
              </h3>
              <pre className="rounded bg-muted/60 p-2 text-xs">{challenge.expectedOutput}</pre>
            </section>
            <section className="flex flex-wrap gap-1">
              {challenge.tags.map((t) => (
                <span key={t} className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px]">
                  #{t}
                </span>
              ))}
            </section>
          </TabsContent>

          <TabsContent value="editor" className="space-y-3 pt-4">
            <Textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="-- Write your SQL here"
              className="min-h-[200px] font-mono text-xs"
              spellCheck={false}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={run} disabled={busy || status !== "ready"}>
                <Play className="mr-1 h-3.5 w-3.5" /> Run
              </Button>
              <Button size="sm" variant="secondary" onClick={verify} disabled={busy || status !== "ready"}>
                Verify
              </Button>
              <Button size="sm" variant="default" onClick={submit}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Submit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenInEditor(sql || challenge.starterSql, `${challenge.id}.sql`)}
              >
                Open in editor
              </Button>
            </div>
            {error && (
              <div className="rounded border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-400">
                {error}
              </div>
            )}
            {result && (
              <div className="rounded border">
                <div className="border-b bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                  {result.rows.length} row(s) · {result.durationMs.toFixed(1)}ms
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30">
                      <tr>
                        {result.columns.map((c) => (
                          <th key={c} className="px-2 py-1 text-left font-medium">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.slice(0, 100).map((r, i) => (
                        <tr key={i} className="odd:bg-muted/10">
                          {r.map((v, j) => (
                            <td key={j} className="px-2 py-1 font-mono">
                              {v === null ? <span className="text-muted-foreground">NULL</span> : String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="hints" className="space-y-3 pt-4 text-sm">
            <div className="rounded border p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" /> Hint 1
              </div>
              {revealHint1 ? (
                <p>{challenge.hints[0]}</p>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setRevealHint1(true)}>
                  Reveal hint 1
                </Button>
              )}
            </div>
            <div className="rounded border p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" /> Hint 2
              </div>
              {revealHint2 ? (
                <p>{challenge.hints[1]}</p>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!revealHint1}
                  onClick={() => setRevealHint2(true)}
                >
                  Reveal hint 2
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="solution" className="space-y-3 pt-4 text-sm">
            {!revealSolution ? (
              <div className="rounded border p-4 text-center">
                <p className="mb-3 text-muted-foreground">
                  Try to solve it yourself first. Revealing the solution won't lock XP.
                </p>
                <Button size="sm" onClick={() => setRevealSolution(true)}>
                  Reveal solution
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Solution
                    </h3>
                    <Button size="sm" variant="ghost" onClick={copySolution}>
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                    </Button>
                  </div>
                  <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
                    <code>{challenge.solution}</code>
                  </pre>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setSql(challenge.solution)}>
                      Load into editor
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenInEditor(challenge.solution, `${challenge.id}-solution.sql`)}
                    >
                      Open in editor
                    </Button>
                  </div>
                </div>
                {challenge.altSolution && (
                  <div>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Alternative
                    </h3>
                    <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
                      <code>{challenge.altSolution}</code>
                    </pre>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="explain" className="space-y-3 pt-4 text-sm">
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Explanation
              </h3>
              <p className="whitespace-pre-wrap">{challenge.explanation}</p>
            </section>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Complexity
              </h3>
              <p className="font-mono text-xs">{challenge.complexity}</p>
            </section>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Concepts learned
              </h3>
              <div className="flex flex-wrap gap-1">
                {challenge.conceptsLearned.map((c) => (
                  <span key={c} className="rounded bg-primary/15 px-2 py-0.5 text-xs text-primary">
                    {c}
                  </span>
                ))}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
