import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Download,
  Eye,
  FileCode2,
  Filter,
  GitBranch,
  KeyRound,
  Layers,
  Link2,
  ListTree,
  Loader2,
  Maximize2,
  Minus,
  Move,
  Network,
  Plus,
  RefreshCcw,
  Search,
  Table2,
  Terminal,
  X,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEngine } from "@/lib/db/engine-provider";
import type {
  CatalogForeignKey,
  EnrichedTable,
} from "@/lib/db/catalog";

interface Props {
  onInsertQuery: (sql: string) => void;
  onSendToConsole?: (sql: string) => void;
}

type ModalState =
  | { kind: "schema"; table: EnrichedTable }
  | { kind: "relationships"; table: EnrichedTable }
  | { kind: "indexes"; table: EnrichedTable }
  | { kind: "data"; table: EnrichedTable }
  | { kind: "sql"; table: EnrichedTable }
  | { kind: "er"; focus?: string }
  | null;

function q(schema: string, name: string) {
  const s = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return schema && schema !== "main" ? `${s(schema)}.${s(name)}` : s(name);
}

function tableDescription(t: EnrichedTable): string {
  const parts: string[] = [];
  if (t.kind !== "table") parts.push(t.kind);
  if (t.primaryKey.length) parts.push(`PK: ${t.primaryKey.join(", ")}`);
  if (t.foreignKeys.length) parts.push(`${t.foreignKeys.length} FK`);
  if (t.rowCount != null) parts.push(`${t.rowCount.toLocaleString()} rows`);
  return parts.length ? parts.join(" · ") : "Database table";
}

export function TablesExplorer({ onInsertQuery, onSendToConsole }: Props) {
  const { catalog, refreshCatalog, status } = useEngine();
  const [search, setSearch] = useState("");
  const [schemaFilter, setSchemaFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "columns" | "rows" | "fks">("name");
  const [modal, setModal] = useState<ModalState>(null);

  const allTables = useMemo(() => {
    const out: EnrichedTable[] = [];
    for (const s of catalog.schemas) for (const t of s.tables) out.push(t);
    return out;
  }, [catalog]);

  const schemas = useMemo(
    () => Array.from(new Set(catalog.schemas.map((s) => s.name))),
    [catalog],
  );

  const filtered = useMemo(() => {
    const qq = search.trim().toLowerCase();
    let r = allTables.filter(
      (t) =>
        (schemaFilter === "all" || t.schema === schemaFilter) &&
        (!qq ||
          t.name.toLowerCase().includes(qq) ||
          t.columns.some((c) => c.name.toLowerCase().includes(qq))),
    );
    r = [...r].sort((a, b) => {
      if (sortBy === "columns") return b.columns.length - a.columns.length;
      if (sortBy === "rows") return (b.rowCount ?? 0) - (a.rowCount ?? 0);
      if (sortBy === "fks") return b.foreignKeys.length - a.foreignKeys.length;
      return a.name.localeCompare(b.name);
    });
    return r;
  }, [allTables, search, schemaFilter, sortBy]);

  const openModal = useCallback((s: ModalState) => setModal(s), []);
  const closeModal = useCallback(() => setModal(null), []);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Tables</h2>
            <Badge variant="secondary" className="text-[10px]">
              {allTables.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1"
              onClick={() => openModal({ kind: "er" })}
              disabled={!allTables.length}
            >
              <Network className="h-3.5 w-3.5" /> ER Diagram
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => refreshCatalog()}
              title="Refresh catalog"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tables or columns…"
              className="h-8 pl-7 text-xs"
            />
          </div>
          {schemas.length > 1 && (
            <Select value={schemaFilter} onValueChange={setSchemaFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All schemas</SelectItem>
                {schemas.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <ArrowUpDown className="mr-1 h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="columns">Sort: Columns</SelectItem>
              <SelectItem value="rows">Sort: Rows</SelectItem>
              <SelectItem value="fks">Sort: FKs</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {status !== "ready" ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading catalog…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 p-4 text-center">
            <Table2 className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No tables found</p>
            <p className="text-xs text-muted-foreground">
              {allTables.length ? "Try a different search" : "Load a sample database to get started"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => (
              <TableCard
                key={`${t.schema}.${t.name}`}
                table={t}
                allTables={allTables}
                openModal={openModal}
                onInsertQuery={onInsertQuery}
                onSendToConsole={onSendToConsole}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {modal?.kind === "schema" && (
        <SchemaDialog table={modal.table} onClose={closeModal} />
      )}
      {modal?.kind === "relationships" && (
        <RelationshipsDialog
          table={modal.table}
          allTables={allTables}
          onClose={closeModal}
          onFocusER={(name) => setModal({ kind: "er", focus: name })}
        />
      )}
      {modal?.kind === "indexes" && (
        <IndexesDialog table={modal.table} onClose={closeModal} />
      )}
      {modal?.kind === "data" && (
        <SampleDataDialog table={modal.table} onClose={closeModal} />
      )}
      {modal?.kind === "sql" && (
        <SqlPreviewDialog
          table={modal.table}
          onClose={closeModal}
          onInsert={(sql) => {
            onInsertQuery(sql);
            closeModal();
          }}
          onSendToConsole={
            onSendToConsole
              ? (sql) => {
                  onSendToConsole(sql);
                  closeModal();
                }
              : undefined
          }
        />
      )}
      {modal?.kind === "er" && (
        <ERDiagramDialog
          tables={allTables}
          focusTable={modal.focus}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table Card
// ---------------------------------------------------------------------------

function TableCard({
  table,
  allTables,
  openModal,
  onInsertQuery,
  onSendToConsole,
}: {
  table: EnrichedTable;
  allTables: EnrichedTable[];
  openModal: (m: ModalState) => void;
  onInsertQuery: (sql: string) => void;
  onSendToConsole?: (sql: string) => void;
}) {
  const inbound = useMemo(
    () =>
      allTables
        .flatMap((t) => t.foreignKeys.map((fk) => ({ from: t.name, fk })))
        .filter((r) => r.fk.refTable === table.name),
    [allTables, table.name],
  );

  const qName = q(table.schema, table.name);

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 border-b bg-gradient-to-br from-primary/5 to-transparent p-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="rounded-md bg-primary/10 p-1.5 text-primary">
            <Table2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold" title={table.name}>
              {table.name}
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {tableDescription(table)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline" className="whitespace-nowrap text-[10px]">
            {table.columns.length} cols
          </Badge>
          {inbound.length > 0 && (
            <Badge variant="secondary" className="whitespace-nowrap text-[10px]">
              {inbound.length} in
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 p-3">
        <div className="flex flex-wrap gap-1">
          {table.primaryKey.slice(0, 4).map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
            >
              <KeyRound className="h-2.5 w-2.5" /> {c}
            </span>
          ))}
          {table.foreignKeys.slice(0, 3).map((fk, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-400"
              title={`${fk.columns.join(",")} → ${fk.refTable}(${fk.refColumns.join(",")})`}
            >
              <Link2 className="h-2.5 w-2.5" /> {fk.refTable}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 border-t bg-muted/20 p-2">
        <CardBtn
          icon={<Eye className="h-3 w-3" />}
          label="View Data"
          onClick={() => openModal({ kind: "data", table })}
        />
        <CardBtn
          icon={<ListTree className="h-3 w-3" />}
          label="Schema"
          onClick={() => openModal({ kind: "schema", table })}
        />
        <CardBtn
          icon={<GitBranch className="h-3 w-3" />}
          label="Relations"
          onClick={() => openModal({ kind: "relationships", table })}
        />
        <CardBtn
          icon={<Network className="h-3 w-3" />}
          label="ER"
          onClick={() => openModal({ kind: "er", focus: table.name })}
        />
        <CardBtn
          icon={<Layers className="h-3 w-3" />}
          label="Indexes"
          onClick={() => openModal({ kind: "indexes", table })}
        />
        <CardBtn
          icon={<Table2 className="h-3 w-3" />}
          label="Samples"
          onClick={() => openModal({ kind: "data", table })}
        />
        <CardBtn
          icon={<FileCode2 className="h-3 w-3" />}
          label="SQL"
          onClick={() => openModal({ kind: "sql", table })}
        />
        <CardBtn
          icon={<Copy className="h-3 w-3" />}
          label="Query"
          onClick={() => {
            onInsertQuery(`SELECT * FROM ${qName} LIMIT 100;`);
            toast.success("Query inserted");
          }}
        />
        {onSendToConsole && (
          <CardBtn
            icon={<Terminal className="h-3 w-3" />}
            label="Console"
            onClick={() => {
              onSendToConsole(`SELECT * FROM ${qName} LIMIT 100;`);
            }}
          />
        )}
      </div>
    </div>
  );
}

function CardBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 rounded px-1 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Schema Dialog
// ---------------------------------------------------------------------------

function SchemaDialog({ table, onClose }: { table: EnrichedTable; onClose: () => void }) {
  const fkByColumn = useMemo(() => {
    const map = new Map<string, CatalogForeignKey>();
    for (const fk of table.foreignKeys) {
      for (const c of fk.columns) map.set(c, fk);
    }
    return map;
  }, [table]);

  const uniqueCols = useMemo(() => {
    const s = new Set<string>();
    for (const uk of table.uniqueKeys) for (const c of uk.columns) s.add(c);
    return s;
  }, [table]);

  const indexedCols = useMemo(() => {
    const s = new Set<string>();
    for (const i of table.indexes) for (const c of i.columns) s.add(c);
    return s;
  }, [table]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTree className="h-4 w-4 text-primary" />
            Schema · {table.name}
          </DialogTitle>
          <DialogDescription>
            {table.columns.length} columns · {table.foreignKeys.length} foreign keys · {table.indexes.length} indexes
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr className="border-b text-left">
                <th className="px-2 py-2 font-semibold">#</th>
                <th className="px-2 py-2 font-semibold">Column</th>
                <th className="px-2 py-2 font-semibold">Type</th>
                <th className="px-2 py-2 font-semibold">PK</th>
                <th className="px-2 py-2 font-semibold">FK</th>
                <th className="px-2 py-2 font-semibold">Nullable</th>
                <th className="px-2 py-2 font-semibold">Default</th>
                <th className="px-2 py-2 font-semibold">Constraints</th>
                <th className="px-2 py-2 font-semibold">Indexes</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((c, i) => {
                const fk = fkByColumn.get(c.name);
                const cons: string[] = [];
                if (c.notNull) cons.push("NOT NULL");
                if (uniqueCols.has(c.name)) cons.push("UNIQUE");
                if (c.autoIncrement) cons.push("AUTO");
                return (
                  <tr key={c.name} className="border-b hover:bg-muted/30">
                    <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-1.5 font-mono font-medium">
                      <span className="flex items-center gap-1">
                        {c.pk && <KeyRound className="h-3 w-3 text-amber-500" />}
                        {fk && !c.pk && <Link2 className="h-3 w-3 text-sky-500" />}
                        {c.name}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">
                      {(c.type || "—").toLowerCase()}
                    </td>
                    <td className="px-2 py-1.5">
                      {c.pk ? (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                          PK
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {fk ? (
                        <span className="font-mono text-[10px] text-sky-600 dark:text-sky-400">
                          → {fk.refTable}.{fk.refColumns.join(",")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {c.notNull ? (
                        <span className="text-orange-600">NO</span>
                      ) : (
                        <span className="text-emerald-600">YES</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">
                      {c.default ?? "—"}
                    </td>
                    <td className="px-2 py-1.5">
                      {cons.length ? (
                        <div className="flex flex-wrap gap-1">
                          {cons.map((x) => (
                            <span key={x} className="rounded bg-muted px-1 text-[9px]">
                              {x}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {indexedCols.has(c.name) ? (
                        <Badge variant="secondary" className="text-[9px]">
                          idx
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Relationships Dialog
// ---------------------------------------------------------------------------

function classifyRelationship(
  fk: CatalogForeignKey,
  fromTable: EnrichedTable,
  toTable?: EnrichedTable,
): "1:1" | "1:N" | "N:M" {
  // 1:1 if fk columns match a unique key or full PK of fromTable
  const fkCols = fk.columns.slice().sort().join(",");
  const pk = fromTable.primaryKey.slice().sort().join(",");
  if (fkCols === pk && pk) return "1:1";
  const uniqueMatch = fromTable.uniqueKeys.some(
    (u) => u.columns.slice().sort().join(",") === fkCols,
  );
  if (uniqueMatch) return "1:1";
  void toTable;
  return "1:N";
}

function RelationshipsDialog({
  table,
  allTables,
  onClose,
  onFocusER,
}: {
  table: EnrichedTable;
  allTables: EnrichedTable[];
  onClose: () => void;
  onFocusER: (name: string) => void;
}) {
  const outbound = table.foreignKeys.map((fk) => ({
    fk,
    target: allTables.find((t) => t.name === fk.refTable),
    kind: classifyRelationship(fk, table),
  }));
  const inbound = allTables
    .flatMap((t) =>
      t.foreignKeys
        .filter((fk) => fk.refTable === table.name)
        .map((fk) => ({ fk, source: t, kind: classifyRelationship(fk, t) })),
    );

  // Detect junction table pattern (N:M): this table has 2 FKs to different tables
  const isJunction =
    table.foreignKeys.length === 2 &&
    table.foreignKeys[0].refTable !== table.foreignKeys[1].refTable;

  const parents = Array.from(new Set(outbound.map((o) => o.fk.refTable)));
  const children = Array.from(new Set(inbound.map((i) => i.source.name)));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Relationships · {table.name}
          </DialogTitle>
          <DialogDescription>
            How this table connects to the rest of your schema
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-2">
          <div className="space-y-4 text-xs">
            <RelSection
              title="Foreign Keys (outgoing)"
              icon={<Link2 className="h-3.5 w-3.5" />}
              empty="No outgoing foreign keys"
            >
              {outbound.map((o, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md border bg-muted/20 p-2 font-mono"
                >
                  <Badge className="shrink-0" variant="outline">
                    {o.kind}
                  </Badge>
                  <span className="text-amber-600">{table.name}</span>
                  <span>({o.fk.columns.join(", ")})</span>
                  <span className="text-muted-foreground">→</span>
                  <button
                    type="button"
                    className="text-sky-600 hover:underline"
                    onClick={() => onFocusER(o.fk.refTable)}
                  >
                    {o.fk.refTable}
                  </button>
                  <span>({o.fk.refColumns.join(", ")})</span>
                </div>
              ))}
            </RelSection>

            <RelSection
              title="Referenced By (incoming)"
              icon={<Link2 className="h-3.5 w-3.5 rotate-180" />}
              empty="No tables reference this one"
            >
              {inbound.map((o, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md border bg-muted/20 p-2 font-mono"
                >
                  <Badge className="shrink-0" variant="outline">
                    {o.kind}
                  </Badge>
                  <button
                    type="button"
                    className="text-sky-600 hover:underline"
                    onClick={() => onFocusER(o.source.name)}
                  >
                    {o.source.name}
                  </button>
                  <span>({o.fk.columns.join(", ")})</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-amber-600">{table.name}</span>
                  <span>({o.fk.refColumns.join(", ")})</span>
                </div>
              ))}
            </RelSection>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <RelBucket
                title="One-to-One"
                items={[
                  ...outbound.filter((o) => o.kind === "1:1").map((o) => o.fk.refTable),
                  ...inbound.filter((o) => o.kind === "1:1").map((o) => o.source.name),
                ]}
                color="emerald"
              />
              <RelBucket
                title="One-to-Many"
                items={inbound.filter((o) => o.kind === "1:N").map((o) => o.source.name)}
                color="sky"
              />
              <RelBucket
                title="Many-to-Many"
                items={
                  isJunction
                    ? table.foreignKeys.map((fk) => fk.refTable)
                    : allTables
                        .filter(
                          (t) =>
                            t.foreignKeys.length === 2 &&
                            t.foreignKeys.some((fk) => fk.refTable === table.name),
                        )
                        .flatMap((jt) =>
                          jt.foreignKeys
                            .filter((fk) => fk.refTable !== table.name)
                            .map((fk) => `${fk.refTable} (via ${jt.name})`),
                        )
                }
                color="fuchsia"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <RelBucket title="Parent Tables" items={parents} color="amber" />
              <RelBucket title="Child Tables" items={children} color="violet" />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function RelSection({
  title,
  icon,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  children: React.ReactNode;
}) {
  const arr = Array.isArray(children) ? children : [children];
  const isEmpty = !arr || arr.length === 0 || arr.every((c) => !c);
  return (
    <section>
      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </h4>
      {isEmpty ? (
        <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </section>
  );
}

function RelBucket({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: "emerald" | "sky" | "fuchsia" | "amber" | "violet";
}) {
  const colorMap: Record<string, string> = {
    emerald: "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    sky: "border-sky-500/40 bg-sky-500/5 text-sky-700 dark:text-sky-400",
    fuchsia: "border-fuchsia-500/40 bg-fuchsia-500/5 text-fuchsia-700 dark:text-fuchsia-400",
    amber: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    violet: "border-violet-500/40 bg-violet-500/5 text-violet-700 dark:text-violet-400",
  };
  const unique = Array.from(new Set(items));
  return (
    <div className={cn("rounded-md border p-2", colorMap[color])}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide">{title}</p>
      {unique.length === 0 ? (
        <p className="text-[10px] opacity-60">— none —</p>
      ) : (
        <ul className="space-y-0.5 font-mono text-[11px]">
          {unique.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Indexes Dialog
// ---------------------------------------------------------------------------

function IndexesDialog({ table, onClose }: { table: EnrichedTable; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Indexes · {table.name}
          </DialogTitle>
          <DialogDescription>
            {table.indexes.length} index{table.indexes.length === 1 ? "" : "es"} defined
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh]">
          {table.indexes.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
              No indexes defined for this table
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/60">
                <tr className="border-b text-left">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Unique</th>
                  <th className="px-2 py-2">Columns</th>
                  <th className="px-2 py-2">Definition</th>
                </tr>
              </thead>
              <tbody>
                {table.indexes.map((i) => (
                  <tr key={i.name} className="border-b align-top">
                    <td className="px-2 py-1.5 font-mono">{i.name}</td>
                    <td className="px-2 py-1.5">
                      {i.unique ? (
                        <Badge variant="outline">UNIQUE</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 font-mono">{i.columns.join(", ")}</td>
                    <td className="max-w-[240px] truncate px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                      {i.sql || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sample Data Dialog (paginated, sortable, filterable, CSV export)
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

function SampleDataDialog({ table, onClose }: { table: EnrichedTable; onClose: () => void }) {
  const { runQuery } = useEngine();
  const [rows, setRows] = useState<unknown[][]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ col: string; dir: "asc" | "desc" } | null>(null);
  const [search, setSearch] = useState("");
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [rowCount, setRowCount] = useState<number | null>(table.rowCount ?? null);

  const qName = q(table.schema, table.name);
  const sqlPreview = useMemo(() => {
    const orderBy = sort ? ` ORDER BY "${sort.col}" ${sort.dir.toUpperCase()}` : "";
    return `SELECT * FROM ${qName}${orderBy} LIMIT 500;`;
  }, [qName, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { results, error } = await runQuery(sqlPreview);
      if (cancelled) return;
      if (error) {
        setError(error);
        setLoading(false);
        return;
      }
      const first = results?.[0];
      if (first) {
        setCols(first.columns);
        setRows(first.rows);
      }
      setLoading(false);
      if (rowCount == null) {
        const r = await runQuery(`SELECT COUNT(*) FROM ${qName};`);
        if (!cancelled && r.results?.[0]?.rows?.[0]) {
          setRowCount(Number(r.results[0].rows[0][0]));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqlPreview]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (q) {
        const match = row.some((v) => String(v ?? "").toLowerCase().includes(q));
        if (!match) return false;
      }
      for (const [col, val] of Object.entries(colFilters)) {
        if (!val) continue;
        const idx = cols.indexOf(col);
        if (idx < 0) continue;
        if (!String(row[idx] ?? "").toLowerCase().includes(val.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, cols, search, colFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    if (page >= totalPages) setPage(0);
  }, [totalPages, page]);

  const exportCSV = useCallback(() => {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.map(esc).join(","), ...filteredRows.map((r) => r.map(esc).join(","))].join(
      "\n",
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [cols, filteredRows, table.name]);

  const toggleSort = (c: string) => {
    setSort((s) =>
      s?.col === c ? (s.dir === "asc" ? { col: c, dir: "desc" } : null) : { col: c, dir: "asc" },
    );
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Sample Data · {table.name}
          </DialogTitle>
          <DialogDescription>
            Showing first {rows.length} of {rowCount ?? "?"} rows
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rows…"
              className="h-8 pl-7 text-xs"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setShowFilters((s) => !s)}
          >
            <Filter className="h-3.5 w-3.5" />
            Column filters
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>

        <details className="rounded-md border bg-muted/20 p-2 text-[10px]">
          <summary className="cursor-pointer font-mono text-muted-foreground">SQL Preview</summary>
          <pre className="mt-1 whitespace-pre-wrap font-mono">{sqlPreview}</pre>
        </details>

        <ScrollArea className="max-h-[45vh] rounded-md border">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-destructive">{error}</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="border-b">
                  {cols.map((c) => (
                    <th
                      key={c}
                      className="cursor-pointer px-2 py-2 text-left font-semibold hover:bg-muted"
                      onClick={() => toggleSort(c)}
                    >
                      <div className="flex items-center gap-1">
                        {c}
                        {sort?.col === c && (
                          <span className="text-primary">{sort.dir === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
                {showFilters && (
                  <tr className="border-b bg-background">
                    {cols.map((c) => (
                      <th key={c} className="px-1 py-1">
                        <Input
                          value={colFilters[c] || ""}
                          onChange={(e) =>
                            setColFilters((s) => ({ ...s, [c]: e.target.value }))
                          }
                          placeholder="filter…"
                          className="h-6 text-[10px]"
                        />
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={cols.length} className="p-4 text-center text-muted-foreground">
                      No rows match
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      {row.map((v, j) => (
                        <td key={j} className="px-2 py-1.5 font-mono">
                          {v == null ? (
                            <span className="italic text-muted-foreground">NULL</span>
                          ) : (
                            String(v)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {filteredRows.length} row{filteredRows.length === 1 ? "" : "s"} · page {page + 1} of{" "}
            {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// SQL Preview Dialog
// ---------------------------------------------------------------------------

function SqlPreviewDialog({
  table,
  onClose,
  onInsert,
  onSendToConsole,
}: {
  table: EnrichedTable;
  onClose: () => void;
  onInsert: (sql: string) => void;
  onSendToConsole?: (sql: string) => void;
}) {
  const qName = q(table.schema, table.name);
  const snippets: { label: string; sql: string }[] = [
    { label: "SELECT *", sql: `SELECT * FROM ${qName} LIMIT 100;` },
    {
      label: "SELECT columns",
      sql: `SELECT ${table.columns.map((c) => c.name).join(", ")}\nFROM ${qName}\nLIMIT 100;`,
    },
    { label: "COUNT(*)", sql: `SELECT COUNT(*) AS total FROM ${qName};` },
    {
      label: "INSERT template",
      sql: `INSERT INTO ${qName} (${table.columns.map((c) => c.name).join(", ")})\nVALUES (${table.columns
        .map(() => "?")
        .join(", ")});`,
    },
    {
      label: "UPDATE template",
      sql: `UPDATE ${qName}\nSET ${table.columns
        .filter((c) => !c.pk)
        .slice(0, 3)
        .map((c) => `${c.name} = ?`)
        .join(", ")}\nWHERE ${
        table.primaryKey[0] ? `${table.primaryKey[0]} = ?` : "id = ?"
      };`,
    },
    {
      label: "DELETE template",
      sql: `DELETE FROM ${qName} WHERE ${
        table.primaryKey[0] ? `${table.primaryKey[0]} = ?` : "id = ?"
      };`,
    },
  ];
  if (table.ddl) snippets.push({ label: "DDL", sql: table.ddl });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-primary" />
            SQL Preview · {table.name}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh]">
          <div className="space-y-3">
            {snippets.map((s) => (
              <div key={s.label} className="rounded-md border bg-muted/20">
                <div className="flex items-center justify-between border-b px-2 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        void navigator.clipboard.writeText(s.sql);
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="mr-1 h-3 w-3" /> Copy
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => onInsert(s.sql)}
                    >
                      Insert
                    </Button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap p-2 font-mono text-[11px]">{s.sql}</pre>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ER Diagram Dialog (SVG-based zoom/pan/drag)
// ---------------------------------------------------------------------------

interface ERNode {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  table: EnrichedTable;
}

const NODE_W = 220;
const HEADER_H = 32;
const ROW_H = 18;

function computeLayout(tables: EnrichedTable[]): Map<string, ERNode> {
  const map = new Map<string, ERNode>();
  const cols = Math.ceil(Math.sqrt(tables.length));
  const gapX = 300;
  const gapY = 320;
  tables.forEach((t, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    map.set(t.name, {
      name: t.name,
      x: col * gapX + 40,
      y: row * gapY + 40,
      w: NODE_W,
      h: HEADER_H + Math.min(t.columns.length, 10) * ROW_H + 8,
      table: t,
    });
  });
  return map;
}

function ERDiagramDialog({
  tables,
  focusTable,
  onClose,
}: {
  tables: EnrichedTable[];
  focusTable?: string;
  onClose: () => void;
}) {
  const [nodes, setNodes] = useState<Map<string, ERNode>>(() => computeLayout(tables));
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoverTable, setHoverTable] = useState<string | null>(focusTable ?? null);
  const [selectedTable, setSelectedTable] = useState<string | null>(focusTable ?? null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    kind: "node" | "pan";
    id?: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    setNodes(computeLayout(tables));
  }, [tables]);

  useEffect(() => {
    if (focusTable) {
      setSelectedTable(focusTable);
      setHoverTable(focusTable);
    }
  }, [focusTable]);

  const highlighted = useMemo(() => {
    const active = hoverTable || selectedTable;
    if (!active) return null;
    const s = new Set<string>([active]);
    const table = tables.find((t) => t.name === active);
    if (table) {
      for (const fk of table.foreignKeys) s.add(fk.refTable);
    }
    for (const t of tables) {
      for (const fk of t.foreignKeys) {
        if (fk.refTable === active) s.add(t.name);
      }
    }
    return s;
  }, [hoverTable, selectedTable, tables]);

  const edges = useMemo(() => {
    const out: { from: string; to: string; fromCols: string[]; toCols: string[]; label: string }[] =
      [];
    for (const t of tables) {
      for (const fk of t.foreignKeys) {
        if (nodes.has(fk.refTable) && nodes.has(t.name)) {
          out.push({
            from: t.name,
            to: fk.refTable,
            fromCols: fk.columns,
            toCols: fk.refColumns,
            label: fk.columns.join(","),
          });
        }
      }
    }
    return out;
  }, [tables, nodes]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale((s) => Math.min(3, Math.max(0.2, s + delta)));
  };

  const onMouseDown = (e: React.MouseEvent, id?: string) => {
    e.preventDefault();
    if (id) {
      const n = nodes.get(id);
      if (!n) return;
      dragRef.current = {
        kind: "node",
        id,
        startX: e.clientX,
        startY: e.clientY,
        origX: n.x,
        origY: n.y,
      };
      setSelectedTable(id);
    } else {
      dragRef.current = {
        kind: "pan",
        startX: e.clientX,
        startY: e.clientY,
        origX: pan.x,
        origY: pan.y,
      };
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    if (d.kind === "node" && d.id) {
      setNodes((prev) => {
        const next = new Map(prev);
        const n = next.get(d.id!);
        if (n) next.set(d.id!, { ...n, x: d.origX + dx, y: d.origY + dy });
        return next;
      });
    } else {
      setPan({ x: d.origX + (e.clientX - d.startX), y: d.origY + (e.clientY - d.startY) });
    }
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  const fitScreen = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setNodes(computeLayout(tables));
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] p-0 sm:max-w-[95vw]">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            ER Diagram
            <Badge variant="secondary" className="text-[10px]">
              {tables.length} tables
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Drag tables to reposition · Wheel to zoom · Drag empty space to pan · Hover to highlight
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 border-b bg-muted/20 px-3 py-1.5">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setScale((s) => Math.min(3, s + 0.2))}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setScale((s) => Math.max(0.2, s - 0.2))}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-12 text-center text-[10px] text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-[10px]" onClick={fitScreen}>
            <Maximize2 className="h-3.5 w-3.5" /> Fit
          </Button>
          <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" /> PK
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-sky-500" /> FK
            </span>
            <span className="flex items-center gap-1">
              <Move className="h-3 w-3" /> drag
            </span>
            <span className="flex items-center gap-1">
              <ZoomIn className="h-3 w-3" /> zoom
            </span>
          </div>
        </div>

        <div
          className="relative h-[70vh] w-full overflow-hidden bg-[radial-gradient(circle,_theme(colors.muted.DEFAULT)_1px,_transparent_1px)] [background-size:20px_20px]"
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <svg
            ref={svgRef}
            className="h-full w-full cursor-grab active:cursor-grabbing"
            onWheel={onWheel}
            onMouseDown={(e) => onMouseDown(e)}
          >
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
              {/* Edges */}
              {edges.map((e, i) => {
                const from = nodes.get(e.from);
                const to = nodes.get(e.to);
                if (!from || !to) return null;
                const x1 = from.x + from.w / 2;
                const y1 = from.y + from.h / 2;
                const x2 = to.x + to.w / 2;
                const y2 = to.y + to.h / 2;
                const active =
                  !highlighted ||
                  (highlighted.has(e.from) && highlighted.has(e.to));
                return (
                  <g key={i} className={active ? "text-sky-500" : "text-muted-foreground/30"}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="currentColor"
                      strokeWidth={active ? 1.5 : 1}
                      markerEnd="url(#arrow)"
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 4}
                      textAnchor="middle"
                      className="fill-current text-[9px] font-mono"
                    >
                      {e.label}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {Array.from(nodes.values()).map((n) => {
                const isHi = !highlighted || highlighted.has(n.name);
                const isSelected = selectedTable === n.name;
                const t = n.table;
                const visibleCols = t.columns.slice(0, 10);
                return (
                  <g
                    key={n.name}
                    transform={`translate(${n.x} ${n.y})`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onMouseDown(e, n.name);
                    }}
                    onMouseEnter={() => setHoverTable(n.name)}
                    onMouseLeave={() => setHoverTable(null)}
                    onClick={() => setSelectedTable(n.name)}
                    className="cursor-move"
                    opacity={isHi ? 1 : 0.35}
                  >
                    <rect
                      width={n.w}
                      height={n.h}
                      rx={6}
                      className={cn(
                        "fill-card stroke-border",
                        isSelected && "stroke-primary",
                      )}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    <rect
                      width={n.w}
                      height={HEADER_H}
                      rx={6}
                      className="fill-primary/10"
                    />
                    <text
                      x={10}
                      y={20}
                      className="fill-foreground text-[13px] font-semibold"
                    >
                      {n.name}
                    </text>
                    <text
                      x={n.w - 10}
                      y={20}
                      textAnchor="end"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {t.columns.length}c
                    </text>
                    {visibleCols.map((c, i) => {
                      const isFk = t.foreignKeys.some((fk) => fk.columns.includes(c.name));
                      const y = HEADER_H + i * ROW_H + 12;
                      return (
                        <g key={c.name}>
                          <circle
                            cx={12}
                            cy={y - 4}
                            r={3}
                            className={
                              c.pk
                                ? "fill-amber-500"
                                : isFk
                                  ? "fill-sky-500"
                                  : "fill-muted-foreground/40"
                            }
                          />
                          <text
                            x={22}
                            y={y}
                            className={cn(
                              "text-[10px] font-mono",
                              c.pk
                                ? "fill-amber-600 font-semibold"
                                : isFk
                                  ? "fill-sky-600"
                                  : "fill-foreground/80",
                            )}
                          >
                            {c.name}
                          </text>
                          <text
                            x={n.w - 8}
                            y={y}
                            textAnchor="end"
                            className="fill-muted-foreground text-[9px] font-mono"
                          >
                            {(c.type || "").toLowerCase().slice(0, 12)}
                          </text>
                        </g>
                      );
                    })}
                    {t.columns.length > 10 && (
                      <text
                        x={n.w / 2}
                        y={n.h - 4}
                        textAnchor="middle"
                        className="fill-muted-foreground text-[9px] italic"
                      >
                        +{t.columns.length - 10} more
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {selectedTable && (
            <div className="pointer-events-none absolute bottom-3 left-3 max-w-xs rounded-md border bg-card/95 p-2 shadow-lg backdrop-blur">
              <div className="mb-1 flex items-center gap-1 text-xs font-semibold">
                <Table2 className="h-3 w-3" /> {selectedTable}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Connections:{" "}
                {highlighted ? Math.max(0, highlighted.size - 1) : 0} table(s)
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
