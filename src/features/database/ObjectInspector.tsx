import { useEffect, useMemo, useState } from "react";
import { Copy, Database, ExternalLink, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useEngine } from "@/lib/db/engine-provider";
import {
  generateTableDDL,
  type CatalogIndex,
  type CatalogPrincipal,
  type CatalogRoutine,
  type CatalogSequence,
  type CatalogTrigger,
  type EnrichedTable,
} from "@/lib/db/catalog";
import type { QueryResult } from "@/types/workbench";

export type InspectorTarget =
  | { kind: "table"; schema: string; name: string; table: EnrichedTable; defaultTab?: string }
  | { kind: "index"; schema: string; name: string; index: CatalogIndex }
  | { kind: "trigger"; schema: string; name: string; trigger: CatalogTrigger }
  | { kind: "sequence"; schema: string; name: string; sequence: CatalogSequence }
  | { kind: "routine"; schema: string; name: string; routine: CatalogRoutine }
  | { kind: "user"; name: string; principal: CatalogPrincipal }
  | { kind: "role"; name: string; principal: CatalogPrincipal };

interface Props {
  target: InspectorTarget;
  onClose: () => void;
  onInsertQuery: (sql: string) => void;
}

export function ObjectInspector({ target, onClose, onInsertQuery }: Props) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/40 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-primary" />
            <span className="font-mono">{titleFor(target)}</span>
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            {kindLabel(target)} object properties (read-only)
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[75vh] overflow-y-auto p-4">
          {target.kind === "table" && (
            <TableInspector target={target} onInsertQuery={onInsertQuery} />
          )}
          {target.kind === "index" && <IndexInspector index={target.index} />}
          {target.kind === "trigger" && <TriggerInspector trigger={target.trigger} />}
          {target.kind === "sequence" && <SequenceInspector sequence={target.sequence} />}
          {target.kind === "routine" && <RoutineInspector routine={target.routine} />}
          {(target.kind === "user" || target.kind === "role") && (
            <PrincipalInspector principal={target.principal} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function titleFor(t: InspectorTarget): string {
  if (t.kind === "table" || t.kind === "index" || t.kind === "trigger" || t.kind === "sequence" || t.kind === "routine") {
    return `${t.schema}.${t.name}`;
  }
  return t.name;
}
function kindLabel(t: InspectorTarget): string {
  if (t.kind === "table") return t.table.kind === "view" ? "View" : t.table.kind === "materialized view" ? "Materialized view" : "Table";
  return t.kind[0].toUpperCase() + t.kind.slice(1);
}

// ---------------------------------------------------------------------------
// Table / view
// ---------------------------------------------------------------------------

function TableInspector({ target, onInsertQuery }: { target: Extract<InspectorTarget, { kind: "table" }>; onInsertQuery: (sql: string) => void }) {
  const { engineId, runQuery } = useEngine();
  const t = target.table;
  const [tab, setTab] = useState(target.defaultTab ?? "overview");
  const ddl = useMemo(() => generateTableDDL(t, engineId), [t, engineId]);
  const qName = quote(t.schema, t.name, engineId);

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4 h-8">
        <TabsTrigger value="overview" className="h-6 text-xs">Overview</TabsTrigger>
        <TabsTrigger value="columns" className="h-6 text-xs">Columns</TabsTrigger>
        <TabsTrigger value="constraints" className="h-6 text-xs">Constraints</TabsTrigger>
        <TabsTrigger value="indexes" className="h-6 text-xs">Indexes</TabsTrigger>
        <TabsTrigger value="ddl" className="h-6 text-xs">DDL</TabsTrigger>
        <TabsTrigger value="data" className="h-6 text-xs">Sample data</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <PropGrid
          rows={[
            ["Name", t.name],
            ["Schema", t.schema],
            ["Kind", t.kind],
            ["Engine", t.engine ?? engineId],
            ["Columns", String(t.columns.length)],
            ["Row count", t.rowCount == null ? "—" : String(t.rowCount)],
            ["Primary key", t.primaryKey.join(", ") || "—"],
            ["Foreign keys", String(t.foreignKeys.length)],
            ["Unique keys", String(t.uniqueKeys.length)],
            ["Check constraints", String(t.checks.length)],
            ["Indexes", String(t.indexes.length)],
          ]}
        />
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onInsertQuery(`SELECT * FROM ${qName} LIMIT 100;`)}>
            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open in editor
          </Button>
          <Button size="sm" variant="outline" onClick={() => onInsertQuery(`SELECT COUNT(*) FROM ${qName};`)}>
            Count rows
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="columns">
        <TableGrid
          headers={["#", "Name", "Type", "Nullable", "Default", "PK", "Identity", "Generated"]}
          rows={t.columns.map((c) => [
            String(c.ordinalPosition ?? ""),
            c.name,
            c.length ? `${c.type}(${c.length})` : c.type,
            c.notNull ? "NO" : "YES",
            c.default ?? "",
            c.pk ? "✓" : "",
            c.identity ? "✓" : "",
            c.generated ? "✓" : "",
          ])}
        />
      </TabsContent>

      <TabsContent value="constraints">
        <Section title="Primary key">
          {t.primaryKey.length ? (
            <code className="rounded bg-muted px-2 py-1 text-xs">PRIMARY KEY ({t.primaryKey.join(", ")})</code>
          ) : (
            <Empty>None</Empty>
          )}
        </Section>
        <Section title="Foreign keys">
          {t.foreignKeys.length ? (
            <TableGrid
              headers={["Name", "Columns", "References", "On update", "On delete"]}
              rows={t.foreignKeys.map((fk) => [
                fk.name ?? "—",
                fk.columns.join(", "),
                `${fk.refTable}(${fk.refColumns.join(", ")})`,
                fk.onUpdate ?? "—",
                fk.onDelete ?? "—",
              ])}
            />
          ) : (
            <Empty>None</Empty>
          )}
        </Section>
        <Section title="Unique keys">
          {t.uniqueKeys.length ? (
            <TableGrid
              headers={["Name", "Columns"]}
              rows={t.uniqueKeys.map((u) => [u.name, u.columns.join(", ")])}
            />
          ) : (
            <Empty>None</Empty>
          )}
        </Section>
        <Section title="Check constraints">
          {t.checks.length ? (
            <TableGrid
              headers={["Name", "Definition"]}
              rows={t.checks.map((c) => [c.name ?? "—", c.definition])}
            />
          ) : (
            <Empty>None</Empty>
          )}
        </Section>
      </TabsContent>

      <TabsContent value="indexes">
        {t.indexes.length ? (
          <TableGrid
            headers={["Name", "Unique", "Columns"]}
            rows={t.indexes.map((i) => [i.name, i.unique ? "✓" : "", i.columns.join(", ")])}
          />
        ) : (
          <Empty>No indexes</Empty>
        )}
      </TabsContent>

      <TabsContent value="ddl">
        <DdlView sql={ddl} />
      </TabsContent>

      <TabsContent value="data">
        <SampleData
          fetchSql={`SELECT * FROM ${qName} LIMIT 100`}
          runQuery={runQuery}
        />
      </TabsContent>
    </Tabs>
  );
}

function SampleData({
  fetchSql,
  runQuery,
}: {
  fetchSql: string;
  runQuery: (sql: string) => Promise<{ results: QueryResult[] | null; error: string | null; durationMs: number }>;
}) {
  const [state, setState] = useState<{ loading: boolean; result: QueryResult | null; error: string | null }>(
    { loading: true, result: null, error: null },
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, result: null, error: null });
    void (async () => {
      const res = await runQuery(fetchSql);
      if (cancelled) return;
      setState({
        loading: false,
        result: res.results?.[0] ?? null,
        error: res.error,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchSql, runQuery, reloadKey]);

  if (state.loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading rows…
      </div>
    );
  }
  if (state.error) {
    return <div className="rounded bg-destructive/10 p-3 text-xs text-destructive">{state.error}</div>;
  }
  if (!state.result || !state.result.rows.length) {
    return <Empty>No rows</Empty>;
  }

  const q = filter.trim().toLowerCase();
  const rows = q
    ? state.result.rows.filter((r) => r.some((c) => String(c ?? "").toLowerCase().includes(q)))
    : state.result.rows;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="h-7 rounded border bg-background px-2 text-xs"
        />
        <Button size="sm" variant="ghost" className="h-7" onClick={() => setReloadKey((k) => k + 1)}>
          <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Refresh
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {rows.length} / {state.result.rows.length} rows
        </span>
      </div>
      <TableGrid
        headers={state.result.columns}
        rows={rows.slice(0, 100).map((r) => r.map((v) => (v == null ? "NULL" : String(v))))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-inspectors
// ---------------------------------------------------------------------------

function IndexInspector({ index }: { index: CatalogIndex }) {
  return (
    <>
      <PropGrid
        rows={[
          ["Name", index.name],
          ["Schema", index.schema],
          ["Table", index.table],
          ["Unique", index.unique ? "Yes" : "No"],
          ["Columns", index.columns.join(", ") || "—"],
        ]}
      />
      {index.sql && (
        <div className="mt-4">
          <DdlView sql={index.sql} />
        </div>
      )}
    </>
  );
}

function TriggerInspector({ trigger }: { trigger: CatalogTrigger }) {
  return (
    <>
      <PropGrid
        rows={[
          ["Name", trigger.name],
          ["Schema", trigger.schema],
          ["Table", trigger.table],
          ["Timing", trigger.timing ?? "—"],
          ["Event", trigger.event ?? "—"],
        ]}
      />
      {trigger.sql && (
        <div className="mt-4">
          <DdlView sql={trigger.sql} />
        </div>
      )}
    </>
  );
}

function SequenceInspector({ sequence }: { sequence: CatalogSequence }) {
  return (
    <PropGrid
      rows={[
        ["Name", sequence.name],
        ["Schema", sequence.schema],
        ["Start", sequence.start != null ? String(sequence.start) : "—"],
        ["Increment", sequence.increment != null ? String(sequence.increment) : "—"],
      ]}
    />
  );
}

function RoutineInspector({ routine }: { routine: CatalogRoutine }) {
  return (
    <>
      <PropGrid
        rows={[
          ["Name", routine.name],
          ["Schema", routine.schema],
          ["Kind", routine.kind],
          ["Language", routine.language ?? "—"],
          ["Return type", routine.returnType ?? "—"],
        ]}
      />
      {routine.sql && (
        <div className="mt-4">
          <DdlView sql={routine.sql} />
        </div>
      )}
    </>
  );
}

function PrincipalInspector({ principal }: { principal: CatalogPrincipal }) {
  return (
    <PropGrid
      rows={[
        ["Name", principal.name],
        ["Kind", principal.kind],
        ["Attributes", principal.attributes ?? "—"],
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

function PropGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <div className="text-muted-foreground">{k}</div>
          <div className="font-mono">{v}</div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-dashed bg-muted/30 p-2 text-[11px] italic text-muted-foreground">{children}</div>;
}

function TableGrid({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-auto rounded border">
      <table className="w-full min-w-max text-left text-xs">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-2 py-1 font-semibold text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={cn("border-t", i % 2 === 1 && "bg-muted/20")}>
              {r.map((c, j) => (
                <td key={j} className="whitespace-nowrap px-2 py-1 font-mono">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DdlView({ sql }: { sql: string }) {
  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        className="absolute right-2 top-2 h-6 gap-1 text-[10px]"
        onClick={() => {
          void navigator.clipboard.writeText(sql);
          toast.success("DDL copied");
        }}
      >
        <Copy className="h-3 w-3" /> Copy
      </Button>
      <pre className="max-h-[50vh] overflow-auto rounded bg-muted/60 p-3 text-[11px] leading-relaxed">
        <code>{sql}</code>
      </pre>
    </div>
  );
}

function quote(schema: string, name: string, engineId: string): string {
  const safe = (s: string) => `"${s.replace(/"/g, '""')}"`;
  if (engineId === "postgres") return `${safe(schema)}.${safe(name)}`;
  if (schema && schema !== "main") return `${safe(schema)}.${safe(name)}`;
  return safe(name);
}
