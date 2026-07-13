import { ChevronDown, ChevronRight, Database, Eye, KeyRound, RotateCcw, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEngine } from "@/lib/db/engine-provider";
import { sampleDatabases } from "@/lib/db/sample-databases";
import type { TableInfo } from "@/types/workbench";

interface Props {
  onInsertQuery: (sql: string) => void;
}

export function DatabaseExplorer({ onInsertQuery }: Props) {
  const { engineId, tables, currentSampleId, loadSample, refreshTables } = useEngine();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => {
    const byKind = { tables: [] as TableInfo[], views: [] as TableInfo[] };
    for (const t of tables) (t.kind === "view" ? byKind.views : byKind.tables).push(t);
    return byKind;
  }, [tables]);

  return (
    <div className="flex h-full flex-col text-xs">
      <div className="border-b px-3 py-2">
        <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wide text-muted-foreground">
          <Database className="h-3.5 w-3.5" /> Sample database
        </div>
        <select
          value={currentSampleId}
          onChange={(e) => {
            void loadSample(e.target.value);
          }}
          className="w-full rounded border bg-background px-2 py-1 text-xs"
        >
          {sampleDatabases.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="mt-2 flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 flex-1 justify-start px-2 text-xs"
            onClick={() => {
              void loadSample(currentSampleId).then(() => toast.info("Sample reloaded"));
            }}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 flex-1 justify-start px-2 text-xs"
            onClick={() => {
              void refreshTables();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Section title={`Tables (${groups.tables.length})`}>
          {groups.tables.map((t) => (
            <TableNode
              key={t.name}
              table={t}
              expanded={!!open[t.name]}
              onToggle={() => setOpen((s) => ({ ...s, [t.name]: !s[t.name] }))}
              onQuery={() => onInsertQuery(`SELECT * FROM ${t.name} LIMIT 100;`)}
            />
          ))}
        </Section>
        {groups.views.length > 0 && (
          <Section title={`Views (${groups.views.length})`}>
            {groups.views.map((t) => (
              <TableNode
                key={t.name}
                table={t}
                expanded={!!open[t.name]}
                onToggle={() => setOpen((s) => ({ ...s, [t.name]: !s[t.name] }))}
                onQuery={() => onInsertQuery(`SELECT * FROM ${t.name} LIMIT 100;`)}
                isView
              />
            ))}
          </Section>
        )}
        <div className="border-t p-3 text-[10px] uppercase tracking-wide text-muted-foreground">
          Engine: {engineId}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="border-b bg-muted/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function TableNode({
  table,
  expanded,
  onToggle,
  onQuery,
  isView = false,
}: {
  table: TableInfo;
  expanded: boolean;
  onToggle: () => void;
  onQuery: () => void;
  isView?: boolean;
}) {
  return (
    <li>
      <div className="group flex items-center gap-1 border-b px-2 py-1 hover:bg-muted/50">
        <button onClick={onToggle} className="flex flex-1 items-center gap-1 text-left">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {isView ? <Eye className="h-3.5 w-3.5 text-purple-500" /> : <Table2 className="h-3.5 w-3.5 text-blue-500" />}
          <span className="font-mono">{table.name}</span>
        </button>
        <button
          onClick={onQuery}
          className="rounded px-1 py-0.5 text-[10px] text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100"
          title="SELECT * FROM …"
        >
          query
        </button>
      </div>
      {expanded && (
        <ul className="bg-muted/20 pl-6">
          {table.columns.map((c) => (
            <li key={c.name} className="flex items-center gap-1.5 border-b border-border/40 px-2 py-1 font-mono">
              {c.pk && <KeyRound className="h-3 w-3 text-amber-500" />}
              <span>{c.name}</span>
              <span className="text-muted-foreground">{c.type}</span>
              {c.notNull && <span className="text-[9px] text-orange-500">NOT NULL</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
