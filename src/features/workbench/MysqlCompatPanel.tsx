/**
 * MySQL compatibility panel.
 *
 * Sidebar view that surfaces the workbench's MySQL feature matrix
 * (`src/lib/db/mysql-compat.ts`) for the currently active engine. Features
 * are grouped by category and filterable by status + search.
 *
 * The panel is always visible in the sidebar — it doesn't require the
 * emulator engine to be active. It just reflects how the *current* engine
 * treats each MySQL feature so users know what to expect before they run
 * a query.
 */
import { useMemo, useState } from "react";
import { Search, CheckCircle2, AlertTriangle, XCircle, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEngine } from "@/lib/db/engine-provider";
import {
  compatFeatures,
  statusFor,
  type CompatFeature,
  type CompatStatus,
} from "@/lib/db/mysql-compat";
import type { EngineId } from "@/types/workbench";
import { toast } from "sonner";

const ENGINE_LABEL: Record<EngineId, string> = {
  sqlite: "SQLite",
  postgres: "PostgreSQL",
  alasql: "AlaSQL",
  mysql: "MySQL (emulated)",
  "mysql-live": "MySQL (live)",
};

const STATUS_META: Record<
  CompatStatus,
  { label: string; short: string; icon: typeof CheckCircle2; className: string; badge: string }
> = {
  supported: {
    label: "Fully supported",
    short: "Supported",
    icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-400",
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  emulated: {
    label: "Emulated / translated",
    short: "Emulated",
    icon: AlertTriangle,
    className: "text-amber-600 dark:text-amber-400",
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  unsupported: {
    label: "Not supported",
    short: "Unsupported",
    icon: XCircle,
    className: "text-rose-600 dark:text-rose-400",
    badge: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

type Filter = "all" | CompatStatus;

interface Props {
  onInsertQuery?: (sql: string) => void;
}

export function MysqlCompatPanel({ onInsertQuery }: Props) {
  const { engineId } = useEngine();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return compatFeatures
      .map((f) => ({ f, s: statusFor(f, engineId) }))
      .filter(({ f, s }) => {
        if (filter !== "all" && s !== filter) return false;
        if (!q) return true;
        return (
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          (f.example?.toLowerCase().includes(q) ?? false) ||
          f.category.toLowerCase().includes(q)
        );
      });
  }, [engineId, filter, query]);

  const counts = useMemo(() => {
    const c = { supported: 0, emulated: 0, unsupported: 0 };
    for (const f of compatFeatures) c[statusFor(f, engineId)]++;
    return c;
  }, [engineId]);

  const grouped = useMemo(() => {
    const map = new Map<string, { f: CompatFeature; s: CompatStatus }[]>();
    for (const row of rows) {
      const list = map.get(row.f.category) ?? [];
      list.push(row);
      map.set(row.f.category, list);
    }
    return Array.from(map.entries());
  }, [rows]);

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-3 py-2 space-y-2">
        <div className="text-xs text-muted-foreground">
          Compatibility for <span className="font-medium text-foreground">{ENGINE_LABEL[engineId]}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label={`All (${compatFeatures.length})`}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterChip
            label={`Supported (${counts.supported})`}
            active={filter === "supported"}
            onClick={() => setFilter("supported")}
            tone="supported"
          />
          <FilterChip
            label={`Emulated (${counts.emulated})`}
            active={filter === "emulated"}
            onClick={() => setFilter("emulated")}
            tone="emulated"
          />
          <FilterChip
            label={`Unsupported (${counts.unsupported})`}
            active={filter === "unsupported"}
            onClick={() => setFilter("unsupported")}
            tone="unsupported"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search features…"
            className="h-8 pl-7 text-sm"
            aria-label="Filter compatibility features"
          />
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-auto">
        {grouped.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No features match this filter.
          </div>
        ) : (
          grouped.map(([category, list]) => (
            <div key={category} className="border-b last:border-b-0">
              <div className="sticky top-0 z-10 bg-muted/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
                {category}
              </div>
              <ul>
                {list.map(({ f, s }) => {
                  const meta = STATUS_META[s];
                  const Icon = meta.icon;
                  const isOpen = expanded.has(f.name);
                  return (
                    <li key={f.name} className="border-t first:border-t-0">
                      <button
                        type="button"
                        onClick={() => toggle(f.name)}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
                        aria-expanded={isOpen}
                      >
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.className}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{f.name}</span>
                            <Badge variant="outline" className={`shrink-0 text-[10px] ${meta.badge}`}>
                              {meta.short}
                            </Badge>
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{f.description}</div>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="space-y-2 border-t bg-muted/20 px-3 py-2 text-xs">
                          {f.example && (
                            <div>
                              <div className="mb-1 flex items-center justify-between">
                                <span className="font-medium text-muted-foreground">Example</span>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                    onClick={() => void copy(f.example!)}
                                  >
                                    <Copy className="mr-1 h-3 w-3" /> Copy
                                  </Button>
                                  {onInsertQuery && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2"
                                      onClick={() => onInsertQuery(f.example!)}
                                    >
                                      Insert
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <pre className="overflow-x-auto rounded border bg-background p-2 font-mono text-[11px] leading-snug">
                                {f.example}
                              </pre>
                            </div>
                          )}
                          {f.notes && (
                            <div>
                              <div className="mb-1 font-medium text-muted-foreground">Notes</div>
                              <p className="text-foreground/80">{f.notes}</p>
                            </div>
                          )}
                          {!f.example && !f.notes && (
                            <p className="italic text-muted-foreground">No additional details.</p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {/* Footer legend */}
      <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <LegendDot tone="supported" />
          <LegendDot tone="emulated" />
          <LegendDot tone="unsupported" />
        </div>
        {engineId === "mysql-live" && (
          <div className="mt-1 text-emerald-600 dark:text-emerald-400">
            Connected to a real MySQL server — SQL is executed as-is.
          </div>
        )}
        {engineId === "mysql" && (
          <div className="mt-1">
            In-browser emulator: SQL is translated to SQLite before execution.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: CompatStatus;
}) {
  const toneClass = tone ? STATUS_META[tone].badge : "border-border bg-background";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
        active ? "ring-2 ring-ring ring-offset-1 ring-offset-background " : ""
      }${toneClass}`}
    >
      {label}
    </button>
  );
}

function LegendDot({ tone }: { tone: CompatStatus }) {
  const meta = STATUS_META[tone];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={`h-3 w-3 ${meta.className}`} />
      {meta.label}
    </span>
  );
}
