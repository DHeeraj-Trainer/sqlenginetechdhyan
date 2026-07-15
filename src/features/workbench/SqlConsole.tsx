import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Loader2, ExternalLink, Eraser, Terminal, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResultsGrid } from "@/features/database/ResultsGrid";
import { useEngine } from "@/lib/db/engine-provider";
import { usePersistedState } from "@/hooks/use-persisted-state";
import type { QueryResult } from "@/types/workbench";

interface Props {
  /** Pushes a signal to prefill the console SQL (from Tables explorer). */
  prefill: { sql: string; v: number } | null;
  /** Send current SQL to a new editor tab. */
  onOpenInEditor: (sql: string) => void;
}

export function SqlConsole({ prefill, onOpenInEditor }: Props) {
  const { runQuery, status, engineId } = useEngine();
  const [sql, setSql] = usePersistedState<string>(
    "wb.console.sql.v1",
    "SELECT 1 AS ok;",
  );
  const [autoRun, setAutoRun] = usePersistedState<boolean>("wb.console.autorun.v1", true);
  const [results, setResults] = useState<QueryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const lastPrefillV = useRef<number>(0);

  // Apply prefill from Tables explorer.
  useEffect(() => {
    if (!prefill) return;
    if (prefill.v === lastPrefillV.current) return;
    lastPrefillV.current = prefill.v;
    setSql(prefill.sql);
  }, [prefill, setSql]);

  const doRun = useCallback(
    async (source: string) => {
      const trimmed = source.trim();
      if (!trimmed) {
        setResults(null);
        setError(null);
        setDuration(null);
        return;
      }
      setRunning(true);
      const res = await runQuery(trimmed);
      setRunning(false);
      setDuration(res.durationMs);
      if (res.error) {
        setError(res.error);
        setResults(null);
      } else {
        setError(null);
        setResults(res.results);
      }
    },
    [runQuery],
  );

  // Auto-run with debounce whenever SQL changes and autoRun is on.
  useEffect(() => {
    if (!autoRun) return;
    if (status !== "ready") return;
    const h = setTimeout(() => {
      void doRun(sql);
    }, 500);
    return () => clearTimeout(h);
  }, [sql, autoRun, status, doRun]);

  const activeResult = results?.[0];
  const resultCount = results?.length ?? 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void doRun(sql);
    }
  };

  const engineLabel = useMemo(() => engineId.toUpperCase(), [engineId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
        <Terminal className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Console
        </span>
        <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {engineLabel}
        </span>
        <label className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <input
            type="checkbox"
            className="h-3 w-3"
            checked={autoRun}
            onChange={(e) => setAutoRun(e.target.checked)}
          />
          Live
        </label>
      </div>

      <div className="border-b p-2">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          placeholder="SELECT * FROM ... — click any table in the Tables explorer to load its preview here."
          className="h-32 w-full resize-y rounded border bg-background p-2 font-mono text-[12px] leading-snug outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-1.5 flex items-center gap-1">
          <Button
            size="sm"
            className="h-7"
            onClick={() => void doRun(sql)}
            disabled={status !== "ready" || running}
          >
            {running ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-1 h-3.5 w-3.5" />
            )}
            Run
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => {
              if (!sql.trim()) {
                toast.error("Nothing to open");
                return;
              }
              onOpenInEditor(sql);
              toast.success("Opened in editor");
            }}
            title="Open in editor tab"
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Editor
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => {
              setSql("");
              setResults(null);
              setError(null);
              setDuration(null);
            }}
            title="Clear"
          >
            <Eraser className="h-3.5 w-3.5" />
          </Button>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
            <Timer className="h-3 w-3" />
            {duration != null ? `${duration.toFixed(0)} ms` : "—"}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          Ctrl/Cmd + Enter to run
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {error ? (
          <div className="h-full overflow-auto p-2 text-xs text-destructive">
            <div className="font-semibold">Query error</div>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px]">{error}</pre>
          </div>
        ) : activeResult ? (
          <div className="flex h-full flex-col">
            {resultCount > 1 && (
              <div className="border-b bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground">
                Showing statement 1 of {resultCount} — open in editor to browse all.
              </div>
            )}
            <div className="min-h-0 flex-1">
              <ResultsGrid result={activeResult} />
            </div>
            <div className="border-t bg-muted/10 px-2 py-1 text-[10px] text-muted-foreground">
              {activeResult.rows.length} row{activeResult.rows.length === 1 ? "" : "s"} ·{" "}
              {activeResult.columns.length} col
              {activeResult.columns.length === 1 ? "" : "s"}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-muted-foreground">
            {status !== "ready"
              ? "Waiting for engine…"
              : "Results will appear here. Live mode re-runs as you type."}
          </div>
        )}
      </div>
    </div>
  );
}
