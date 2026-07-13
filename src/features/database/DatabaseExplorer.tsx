import {
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Eye,
  KeyRound,
  Layers,
  RotateCcw,
  Search,
  Sparkles,
  Table2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useEngine } from "@/lib/db/engine-provider";
import { sampleDatabases } from "@/lib/db/sample-databases";
import type { TableInfo } from "@/types/workbench";

interface Props {
  onInsertQuery: (sql: string) => void;
}

export function DatabaseExplorer({ onInsertQuery }: Props) {
  const { engineId, tables, currentSampleId, loadSample, refreshTables, status } = useEngine();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byKind = { tables: [] as TableInfo[], views: [] as TableInfo[] };
    for (const t of tables) {
      if (q) {
        const inTable = t.name.toLowerCase().includes(q);
        const inCols = t.columns.some((c) => c.name.toLowerCase().includes(q));
        if (!inTable && !inCols) continue;
      }
      (t.kind === "view" ? byKind.views : byKind.tables).push(t);
    }
    return byKind;
  }, [tables, search]);

  // Auto-expand tables when searching column names
  const shouldExpand = (t: TableInfo) => {
    const q = search.trim().toLowerCase();
    if (!q) return !!open[t.name];
    if (t.name.toLowerCase().includes(q)) return !!open[t.name];
    return t.columns.some((c) => c.name.toLowerCase().includes(q));
  };

  const totalTables = groups.tables.length + groups.views.length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      {/* Sticky header */}
      <div className="flex-none space-y-2 border-b bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            Schema
          </div>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {engineId}
          </span>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Sample database
          </label>
          <select
            value={currentSampleId}
            onChange={(e) => void loadSample(e.target.value)}
            className="h-8 w-full rounded-md border bg-background px-2 text-xs shadow-sm transition-colors hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {sampleDatabases.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 gap-1 text-xs"
            onClick={() => void loadSample(currentSampleId).then(() => toast.info("Sample reloaded"))}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 gap-1 text-xs"
            onClick={() => void refreshTables()}
          >
            <Layers className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter tables & columns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 pr-7 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable tree */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === "loading" && (
          <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-2">Loading schema…</span>
          </div>
        )}

        {status === "ready" && totalTables === 0 && (
          <EmptyState searching={!!search.trim()} />
        )}

        {status === "ready" && totalTables > 0 && (
          <>
            {groups.tables.length > 0 && (
              <Section title="Tables" count={groups.tables.length}>
                {groups.tables.map((t) => (
                  <TableNode
                    key={t.name}
                    table={t}
                    expanded={shouldExpand(t)}
                    highlight={search.trim()}
                    onToggle={() => setOpen((s) => ({ ...s, [t.name]: !s[t.name] }))}
                    onInsertQuery={onInsertQuery}
                  />
                ))}
              </Section>
            )}
            {groups.views.length > 0 && (
              <Section title="Views" count={groups.views.length}>
                {groups.views.map((t) => (
                  <TableNode
                    key={t.name}
                    table={t}
                    expanded={shouldExpand(t)}
                    highlight={search.trim()}
                    onToggle={() => setOpen((s) => ({ ...s, [t.name]: !s[t.name] }))}
                    onInsertQuery={onInsertQuery}
                    isView
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        {searching ? <Search className="h-5 w-5 text-muted-foreground" /> : <Database className="h-5 w-5 text-muted-foreground" />}
      </div>
      <p className="text-sm font-medium">
        {searching ? "No matches" : "No tables yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {searching ? "Try a different search term" : "Load a sample database to get started"}
      </p>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card/95 px-3 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      </div>
      <ul className="py-1">{children}</ul>
    </div>
  );
}

function TableNode({
  table,
  expanded,
  highlight,
  onToggle,
  onInsertQuery,
  isView = false,
}: {
  table: TableInfo;
  expanded: boolean;
  highlight: string;
  onToggle: () => void;
  onInsertQuery: (sql: string) => void;
  isView?: boolean;
}) {
  const columnList = table.columns.map((c) => c.name).join(", ");

  return (
    <li>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group flex cursor-pointer items-center gap-1 px-2 py-1 text-xs transition-colors",
              "hover:bg-accent/60",
              expanded && "bg-accent/30",
            )}
            onClick={onToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-90",
              )}
            />
            {isView ? (
              <Eye className="h-3.5 w-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
            ) : (
              <Table2 className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
            )}
            <span className="flex-1 truncate font-mono text-xs">
              <Highlight text={table.name} query={highlight} />
            </span>
            <span className="hidden text-[10px] text-muted-foreground group-hover:inline">
              {table.columns.length}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInsertQuery(`SELECT * FROM ${table.name} LIMIT 100;`);
              }}
              className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 hover:bg-primary hover:text-primary-foreground group-hover:opacity-100"
              title="Preview 100 rows"
              aria-label={`Preview ${table.name}`}
            >
              ▶
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => onInsertQuery(`SELECT * FROM ${table.name} LIMIT 100;`)}>
            <Eye className="mr-2 h-3.5 w-3.5" /> Preview 100 rows
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onInsertQuery(`SELECT ${columnList}\nFROM ${table.name}\nLIMIT 100;`)}
          >
            <Sparkles className="mr-2 h-3.5 w-3.5" /> Generate SELECT
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onInsertQuery(`SELECT COUNT(*) FROM ${table.name};`)}>
            <Layers className="mr-2 h-3.5 w-3.5" /> Count rows
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => {
              void navigator.clipboard.writeText(table.name);
              toast.success("Table name copied");
            }}
          >
            <Copy className="mr-2 h-3.5 w-3.5" /> Copy name
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {expanded && (
        <ul className="border-l border-border/60 bg-muted/10 py-0.5 pl-4">
          {table.columns.map((c) => (
            <li
              key={c.name}
              className="group flex items-center gap-1.5 px-2 py-0.5 font-mono text-[11px] hover:bg-accent/40"
              onClick={(e) => {
                e.stopPropagation();
                onInsertQuery(`SELECT ${c.name} FROM ${table.name} LIMIT 100;`);
              }}
              role="button"
            >
              {c.pk ? (
                <KeyRound className="h-3 w-3 shrink-0 text-amber-500" aria-label="Primary key" />
              ) : (
                <span className="inline-block h-3 w-3 shrink-0" />
              )}
              <span className="flex-1 truncate">
                <Highlight text={c.name} query={highlight} />
              </span>
              <span className="text-[10px] text-muted-foreground">{c.type.toLowerCase()}</span>
              {c.notNull && !c.pk && (
                <span className="text-[9px] font-medium text-orange-600 dark:text-orange-400" title="NOT NULL">!</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-500/40">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
