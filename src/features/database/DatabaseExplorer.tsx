import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Box,
  ChevronRight,
  Copy,
  Database,
  Eye,
  Fingerprint,
  FileCode2,
  Folder,
  FolderTree,
  Hash,
  KeyRound,
  Layers,
  Link2,
  ListTree,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  User,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
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
import type {
  CatalogSchema,
  CatalogSnapshot,
  EnrichedTable,
} from "@/lib/db/catalog";
import { ObjectInspector, type InspectorTarget } from "@/features/database/ObjectInspector";

interface Props {
  onInsertQuery: (sql: string) => void;
}

type NodeId = string;

interface TreeState {
  expanded: Set<NodeId>;
}

const DEFAULT_EXPANDED: NodeId[] = ["root", "root/schemas"];

export function DatabaseExplorer({ onInsertQuery }: Props) {
  const { engineId, catalog, currentSampleId, loadSample, refreshCatalog, status } = useEngine();
  const [state, setState] = useState<TreeState>({ expanded: new Set(DEFAULT_EXPANDED) });
  const [search, setSearch] = useState("");
  const [inspector, setInspector] = useState<InspectorTarget | null>(null);

  // Auto-expand schemas when only one exists.
  useEffect(() => {
    if (catalog.schemas.length) {
      setState((s) => {
        const next = new Set(s.expanded);
        next.add("root");
        next.add("root/schemas");
        if (catalog.schemas.length === 1) next.add(`schema/${catalog.schemas[0].name}`);
        return { expanded: next };
      });
    }
  }, [catalog]);

  const q = search.trim().toLowerCase();
  const matches = (s: string) => !q || s.toLowerCase().includes(q);

  const toggle = (id: NodeId) =>
    setState((s) => {
      const next = new Set(s.expanded);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expanded: next };
    });

  const isOpen = (id: NodeId) => state.expanded.has(id);

  const expandAll = () => {
    const ids = collectAllIds(catalog);
    setState({ expanded: new Set(ids) });
  };
  const collapseAll = () => setState({ expanded: new Set(["root"]) });

  const totals = useMemo(() => {
    let tables = 0;
    let views = 0;
    let indexes = 0;
    let triggers = 0;
    let sequences = 0;
    let routines = 0;
    for (const s of catalog.schemas) {
      tables += s.tables.length;
      views += s.views.length + s.materializedViews.length;
      indexes += s.indexes.length;
      triggers += s.triggers.length;
      sequences += s.sequences.length;
      routines += s.functions.length + s.procedures.length;
    }
    return { tables, views, indexes, triggers, sequences, routines };
  }, [catalog]);

  const openInspector = (target: InspectorTarget) => setInspector(target);

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      {/* Sticky header */}
      <div className="flex-none space-y-2 border-b bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            {catalog.database || engineId}
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
            onClick={() => void refreshCatalog().then(() => toast.success("Schema refreshed"))}
          >
            <RefreshCcw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-1 text-[10px]">
          <button className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted" onClick={expandAll}>
            Expand all
          </button>
          <button className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted" onClick={collapseAll}>
            Collapse all
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter objects…"
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

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {status === "loading" && (
          <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-2">Loading catalog…</span>
          </div>
        )}

        {status === "ready" && (
          <ul className="text-xs">
            <TreeRow
              id="root"
              depth={0}
              open={isOpen("root")}
              onToggle={() => toggle("root")}
              icon={<Database className="h-3.5 w-3.5 text-primary" />}
              label={catalog.database || engineId}
              badge={String(catalog.schemas.length)}
              hasChildren
            />
            {isOpen("root") && (
              <>
                <SchemasBranch
                  catalog={catalog}
                  isOpen={isOpen}
                  toggle={toggle}
                  matches={matches}
                  onInsertQuery={onInsertQuery}
                  openInspector={openInspector}
                />

                <GroupRow
                  id="root/users"
                  open={isOpen("root/users")}
                  onToggle={() => toggle("root/users")}
                  icon={<Users className="h-3.5 w-3.5 text-emerald-500" />}
                  label="Users"
                  count={catalog.users.length}
                >
                  {catalog.users.filter((u) => matches(u.name)).map((u) => (
                    <LeafRow
                      key={`user/${u.name}`}
                      depth={2}
                      icon={<User className="h-3.5 w-3.5 text-emerald-500" />}
                      label={u.name}
                      onClick={() =>
                        openInspector({ kind: "user", name: u.name, principal: u })
                      }
                    />
                  ))}
                  {!catalog.users.length && <EmptyLeaf label="No users" depth={2} />}
                </GroupRow>

                <GroupRow
                  id="root/roles"
                  open={isOpen("root/roles")}
                  onToggle={() => toggle("root/roles")}
                  icon={<ShieldCheck className="h-3.5 w-3.5 text-sky-500" />}
                  label="Roles"
                  count={catalog.roles.length}
                >
                  {catalog.roles.filter((r) => matches(r.name)).map((r) => (
                    <LeafRow
                      key={`role/${r.name}`}
                      depth={2}
                      icon={<ShieldCheck className="h-3.5 w-3.5 text-sky-500" />}
                      label={r.name}
                      onClick={() => openInspector({ kind: "role", name: r.name, principal: r })}
                    />
                  ))}
                  {!catalog.roles.length && <EmptyLeaf label="No roles" depth={2} />}
                </GroupRow>

                <GroupRow
                  id="root/privileges"
                  open={isOpen("root/privileges")}
                  onToggle={() => toggle("root/privileges")}
                  icon={<KeyRound className="h-3.5 w-3.5 text-amber-500" />}
                  label="Privileges"
                  count={catalog.privileges.length}
                >
                  {catalog.privileges
                    .filter((p) => matches(`${p.grantee} ${p.privilege} ${p.object}`))
                    .slice(0, 200)
                    .map((p, i) => (
                      <LeafRow
                        key={`priv/${i}`}
                        depth={2}
                        icon={<KeyRound className="h-3.5 w-3.5 text-amber-500" />}
                        label={`${p.grantee} · ${p.privilege} on ${p.object}`}
                      />
                    ))}
                  {!catalog.privileges.length && (
                    <EmptyLeaf label="No explicit privileges" depth={2} />
                  )}
                </GroupRow>

                <GroupRow
                  id="root/constraints"
                  open={isOpen("root/constraints")}
                  onToggle={() => toggle("root/constraints")}
                  icon={<Link2 className="h-3.5 w-3.5 text-rose-500" />}
                  label="Constraints"
                  count={countConstraints(catalog)}
                >
                  {renderConstraintsFlat(catalog, matches, openInspector)}
                </GroupRow>
              </>
            )}
          </ul>
        )}

        {status === "ready" && totals.tables === 0 && totals.views === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            No objects yet. Run <code className="rounded bg-muted px-1">CREATE TABLE …</code> to
            get started.
          </div>
        )}
      </div>

      {inspector && (
        <ObjectInspector
          target={inspector}
          onClose={() => setInspector(null)}
          onInsertQuery={onInsertQuery}
        />
      )}
    </div>
  );
}

function collectAllIds(cat: CatalogSnapshot): string[] {
  const ids = new Set<string>(DEFAULT_EXPANDED);
  ids.add("root");
  ids.add("root/users");
  ids.add("root/roles");
  ids.add("root/privileges");
  ids.add("root/constraints");
  for (const s of cat.schemas) {
    ids.add(`schema/${s.name}`);
    for (const g of ["tables", "views", "indexes", "sequences", "triggers", "functions", "procedures", "materializedViews", "synonyms"] as const) {
      ids.add(`schema/${s.name}/${g}`);
    }
  }
  return [...ids];
}

function countConstraints(cat: CatalogSnapshot): number {
  let n = 0;
  for (const s of cat.schemas) {
    for (const t of s.tables) {
      n += t.primaryKey.length ? 1 : 0;
      n += t.foreignKeys.length + t.uniqueKeys.length + t.checks.length;
    }
  }
  return n;
}

function renderConstraintsFlat(
  cat: CatalogSnapshot,
  matches: (s: string) => boolean,
  openInspector: (t: InspectorTarget) => void,
) {
  const nodes: React.ReactNode[] = [];
  for (const s of cat.schemas) {
    for (const t of s.tables) {
      if (t.primaryKey.length && matches(`${t.name} pk`)) {
        nodes.push(
          <LeafRow
            key={`pk/${s.name}/${t.name}`}
            depth={2}
            icon={<KeyRound className="h-3.5 w-3.5 text-amber-500" />}
            label={`PK · ${t.name}(${t.primaryKey.join(", ")})`}
            onClick={() => openInspector({ kind: "table", schema: s.name, name: t.name, table: t, defaultTab: "constraints" })}
          />,
        );
      }
      for (const fk of t.foreignKeys) {
        if (!matches(`${t.name} ${fk.refTable}`)) continue;
        nodes.push(
          <LeafRow
            key={`fk/${s.name}/${t.name}/${fk.name ?? fk.columns.join()}`}
            depth={2}
            icon={<Link2 className="h-3.5 w-3.5 text-rose-500" />}
            label={`FK · ${t.name}(${fk.columns.join(", ")}) → ${fk.refTable}(${fk.refColumns.join(", ")})`}
            onClick={() => openInspector({ kind: "table", schema: s.name, name: t.name, table: t, defaultTab: "constraints" })}
          />,
        );
      }
      for (const uk of t.uniqueKeys) {
        if (!matches(`${t.name} ${uk.name}`)) continue;
        nodes.push(
          <LeafRow
            key={`uk/${s.name}/${t.name}/${uk.name}`}
            depth={2}
            icon={<Fingerprint className="h-3.5 w-3.5 text-violet-500" />}
            label={`UNIQUE · ${t.name}(${uk.columns.join(", ")})`}
            onClick={() => openInspector({ kind: "table", schema: s.name, name: t.name, table: t, defaultTab: "constraints" })}
          />,
        );
      }
      for (const c of t.checks) {
        if (!matches(`${t.name} ${c.definition}`)) continue;
        nodes.push(
          <LeafRow
            key={`chk/${s.name}/${t.name}/${c.name ?? c.definition}`}
            depth={2}
            icon={<ShieldCheck className="h-3.5 w-3.5 text-teal-500" />}
            label={`CHECK · ${t.name} ${c.definition}`}
          />,
        );
      }
    }
  }
  if (!nodes.length) return <EmptyLeaf label="No constraints" depth={2} />;
  return nodes;
}

function SchemasBranch({
  catalog,
  isOpen,
  toggle,
  matches,
  onInsertQuery,
  openInspector,
}: {
  catalog: CatalogSnapshot;
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  matches: (s: string) => boolean;
  onInsertQuery: (sql: string) => void;
  openInspector: (t: InspectorTarget) => void;
}) {
  return (
    <>
      <GroupRow
        id="root/schemas"
        open={isOpen("root/schemas")}
        onToggle={() => toggle("root/schemas")}
        icon={<FolderTree className="h-3.5 w-3.5 text-blue-500" />}
        label="Schemas"
        count={catalog.schemas.length}
        depth={1}
      >
        {catalog.schemas.map((s) => (
          <SchemaNode
            key={s.name}
            schema={s}
            isOpen={isOpen}
            toggle={toggle}
            matches={matches}
            onInsertQuery={onInsertQuery}
            openInspector={openInspector}
          />
        ))}
      </GroupRow>
    </>
  );
}

function SchemaNode({
  schema,
  isOpen,
  toggle,
  matches,
  onInsertQuery,
  openInspector,
}: {
  schema: CatalogSchema;
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  matches: (s: string) => boolean;
  onInsertQuery: (sql: string) => void;
  openInspector: (t: InspectorTarget) => void;
}) {
  const id = `schema/${schema.name}`;
  const tables = schema.tables.filter((t) => matches(t.name) || t.columns.some((c) => matches(c.name)));
  const views = schema.views.filter((v) => matches(v.name));
  const mviews = schema.materializedViews.filter((v) => matches(v.name));

  return (
    <>
      <TreeRow
        id={id}
        depth={2}
        open={isOpen(id)}
        onToggle={() => toggle(id)}
        icon={<Folder className="h-3.5 w-3.5 text-blue-500" />}
        label={schema.name}
        hasChildren
      />
      {isOpen(id) && (
        <>
          <GroupRow
            id={`${id}/tables`}
            depth={3}
            open={isOpen(`${id}/tables`)}
            onToggle={() => toggle(`${id}/tables`)}
            icon={<Table2 className="h-3.5 w-3.5 text-blue-500" />}
            label="Tables"
            count={tables.length}
          >
            {tables.map((t) => (
              <TableLeaf
                key={t.name}
                table={t}
                depth={4}
                open={isOpen(`table/${schema.name}/${t.name}`)}
                onToggle={() => toggle(`table/${schema.name}/${t.name}`)}
                onInsertQuery={onInsertQuery}
                onOpenInspector={() =>
                  openInspector({ kind: "table", schema: schema.name, name: t.name, table: t })
                }
              />
            ))}
            {!tables.length && <EmptyLeaf label="No tables" depth={4} />}
          </GroupRow>

          <GroupRow
            id={`${id}/views`}
            depth={3}
            open={isOpen(`${id}/views`)}
            onToggle={() => toggle(`${id}/views`)}
            icon={<Eye className="h-3.5 w-3.5 text-purple-500" />}
            label="Views"
            count={views.length}
          >
            {views.map((v) => (
              <LeafRow
                key={v.name}
                depth={4}
                icon={<Eye className="h-3.5 w-3.5 text-purple-500" />}
                label={v.name}
                onClick={() =>
                  openInspector({ kind: "table", schema: schema.name, name: v.name, table: v })
                }
                onDoubleClick={() =>
                  onInsertQuery(`SELECT * FROM ${quote(schema.name, v.name)} LIMIT 100;`)
                }
              />
            ))}
            {!views.length && <EmptyLeaf label="No views" depth={4} />}
          </GroupRow>

          <GroupRow
            id={`${id}/indexes`}
            depth={3}
            open={isOpen(`${id}/indexes`)}
            onToggle={() => toggle(`${id}/indexes`)}
            icon={<Zap className="h-3.5 w-3.5 text-yellow-500" />}
            label="Indexes"
            count={schema.indexes.length}
          >
            {schema.indexes.filter((i) => matches(i.name) || matches(i.table)).map((i) => (
              <LeafRow
                key={i.name}
                depth={4}
                icon={<Zap className={cn("h-3.5 w-3.5", i.unique ? "text-amber-500" : "text-yellow-500")} />}
                label={`${i.name}  ·  ${i.table}`}
                onClick={() => openInspector({ kind: "index", schema: schema.name, name: i.name, index: i })}
              />
            ))}
            {!schema.indexes.length && <EmptyLeaf label="No indexes" depth={4} />}
          </GroupRow>

          <GroupRow
            id={`${id}/sequences`}
            depth={3}
            open={isOpen(`${id}/sequences`)}
            onToggle={() => toggle(`${id}/sequences`)}
            icon={<Hash className="h-3.5 w-3.5 text-orange-500" />}
            label="Sequences"
            count={schema.sequences.length}
          >
            {schema.sequences.filter((s) => matches(s.name)).map((s) => (
              <LeafRow
                key={s.name}
                depth={4}
                icon={<Hash className="h-3.5 w-3.5 text-orange-500" />}
                label={s.name}
                onClick={() => openInspector({ kind: "sequence", schema: schema.name, name: s.name, sequence: s })}
              />
            ))}
            {!schema.sequences.length && <EmptyLeaf label="No sequences" depth={4} />}
          </GroupRow>

          <GroupRow
            id={`${id}/triggers`}
            depth={3}
            open={isOpen(`${id}/triggers`)}
            onToggle={() => toggle(`${id}/triggers`)}
            icon={<Wand2 className="h-3.5 w-3.5 text-pink-500" />}
            label="Triggers"
            count={schema.triggers.length}
          >
            {schema.triggers.filter((t) => matches(t.name) || matches(t.table)).map((t) => (
              <LeafRow
                key={t.name}
                depth={4}
                icon={<Wand2 className="h-3.5 w-3.5 text-pink-500" />}
                label={`${t.name}  ·  ${t.table}`}
                onClick={() => openInspector({ kind: "trigger", schema: schema.name, name: t.name, trigger: t })}
              />
            ))}
            {!schema.triggers.length && <EmptyLeaf label="No triggers" depth={4} />}
          </GroupRow>

          <GroupRow
            id={`${id}/functions`}
            depth={3}
            open={isOpen(`${id}/functions`)}
            onToggle={() => toggle(`${id}/functions`)}
            icon={<Sparkles className="h-3.5 w-3.5 text-cyan-500" />}
            label="Functions"
            count={schema.functions.length}
          >
            {schema.functions.filter((f) => matches(f.name)).map((f) => (
              <LeafRow
                key={f.name}
                depth={4}
                icon={<Sparkles className="h-3.5 w-3.5 text-cyan-500" />}
                label={f.name}
                onClick={() => openInspector({ kind: "routine", schema: schema.name, name: f.name, routine: f })}
              />
            ))}
            {!schema.functions.length && <EmptyLeaf label="No functions" depth={4} />}
          </GroupRow>

          <GroupRow
            id={`${id}/procedures`}
            depth={3}
            open={isOpen(`${id}/procedures`)}
            onToggle={() => toggle(`${id}/procedures`)}
            icon={<FileCode2 className="h-3.5 w-3.5 text-indigo-500" />}
            label="Procedures"
            count={schema.procedures.length}
          >
            {schema.procedures.filter((f) => matches(f.name)).map((f) => (
              <LeafRow
                key={f.name}
                depth={4}
                icon={<FileCode2 className="h-3.5 w-3.5 text-indigo-500" />}
                label={f.name}
                onClick={() => openInspector({ kind: "routine", schema: schema.name, name: f.name, routine: f })}
              />
            ))}
            {!schema.procedures.length && <EmptyLeaf label="No procedures" depth={4} />}
          </GroupRow>

          <GroupRow
            id={`${id}/materializedViews`}
            depth={3}
            open={isOpen(`${id}/materializedViews`)}
            onToggle={() => toggle(`${id}/materializedViews`)}
            icon={<ListTree className="h-3.5 w-3.5 text-fuchsia-500" />}
            label="Materialized views"
            count={mviews.length}
          >
            {mviews.map((v) => (
              <LeafRow
                key={v.name}
                depth={4}
                icon={<ListTree className="h-3.5 w-3.5 text-fuchsia-500" />}
                label={v.name}
                onClick={() => openInspector({ kind: "table", schema: schema.name, name: v.name, table: v })}
              />
            ))}
            {!mviews.length && <EmptyLeaf label="None" depth={4} />}
          </GroupRow>

          <GroupRow
            id={`${id}/synonyms`}
            depth={3}
            open={isOpen(`${id}/synonyms`)}
            onToggle={() => toggle(`${id}/synonyms`)}
            icon={<Box className="h-3.5 w-3.5 text-slate-500" />}
            label="Synonyms"
            count={schema.synonyms.length}
          >
            <EmptyLeaf label="Not supported by this engine" depth={4} />
          </GroupRow>
        </>
      )}
    </>
  );
}

function TableLeaf({
  table,
  depth,
  open,
  onToggle,
  onInsertQuery,
  onOpenInspector,
}: {
  table: EnrichedTable;
  depth: number;
  open: boolean;
  onToggle: () => void;
  onInsertQuery: (sql: string) => void;
  onOpenInspector: () => void;
}) {
  const qName = quote(table.schema, table.name);
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <li>
            <TreeRow
              id={`table/${table.schema}/${table.name}`}
              depth={depth}
              open={open}
              onToggle={onToggle}
              icon={<Table2 className="h-3.5 w-3.5 text-blue-500" />}
              label={table.name}
              badge={table.rowCount != null ? String(table.rowCount) : `${table.columns.length}c`}
              onDoubleClick={() => onInsertQuery(`SELECT * FROM ${qName} LIMIT 100;`)}
              hasChildren
            />
          </li>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={onOpenInspector}>
            <Layers className="mr-2 h-3.5 w-3.5" /> View properties
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onInsertQuery(`SELECT * FROM ${qName} LIMIT 100;`)}>
            <Eye className="mr-2 h-3.5 w-3.5" /> Preview 100 rows
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() =>
              onInsertQuery(
                `SELECT ${table.columns.map((c) => c.name).join(", ")}\nFROM ${qName}\nLIMIT 100;`,
              )
            }
          >
            <Sparkles className="mr-2 h-3.5 w-3.5" /> Generate SELECT
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onInsertQuery(`SELECT COUNT(*) FROM ${qName};`)}>
            <Hash className="mr-2 h-3.5 w-3.5" /> Count rows
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => {
              void navigator.clipboard.writeText(table.name);
              toast.success("Name copied");
            }}
          >
            <Copy className="mr-2 h-3.5 w-3.5" /> Copy name
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {open && (
        <ul className="border-l border-border/60 bg-muted/10">
          {table.columns.map((c) => (
            <li
              key={c.name}
              className="group flex cursor-pointer items-center gap-1.5 py-0.5 pr-2 font-mono text-[11px] hover:bg-accent/40"
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
              onClick={() => onInsertQuery(`SELECT ${c.name} FROM ${qName} LIMIT 100;`)}
              title={`${c.name} · ${c.type}${c.notNull ? " · NOT NULL" : ""}${c.pk ? " · PK" : ""}`}
            >
              {c.pk ? (
                <KeyRound className="h-3 w-3 shrink-0 text-amber-500" aria-label="Primary key" />
              ) : (
                <span className="inline-block h-3 w-3 shrink-0" />
              )}
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-[10px] text-muted-foreground">{(c.type || "").toLowerCase()}</span>
              {c.notNull && !c.pk && (
                <span className="text-[9px] font-medium text-orange-600" title="NOT NULL">!</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TreeRow({
  depth,
  open,
  onToggle,
  icon,
  label,
  badge,
  hasChildren,
  onDoubleClick,
}: {
  id: string;
  depth: number;
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  hasChildren?: boolean;
  onDoubleClick?: () => void;
}) {
  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? open : undefined}
      tabIndex={0}
      onClick={onToggle}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "group flex cursor-pointer items-center gap-1 py-1 pr-2 text-xs transition-colors hover:bg-accent/60",
        open && "bg-accent/20",
      )}
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
    >
      <ChevronRight
        className={cn(
          "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
          open && "rotate-90",
          !hasChildren && "invisible",
        )}
      />
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {badge != null && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {badge}
        </span>
      )}
    </div>
  );
}

function GroupRow({
  id,
  open,
  onToggle,
  icon,
  label,
  count,
  children,
  depth = 1,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
  depth?: number;
}) {
  return (
    <>
      <TreeRow
        id={id}
        depth={depth}
        open={open}
        onToggle={onToggle}
        icon={icon}
        label={label}
        badge={String(count)}
        hasChildren
      />
      {open && <ul>{children}</ul>}
    </>
  );
}

function LeafRow({
  depth,
  icon,
  label,
  onClick,
  onDoubleClick,
}: {
  depth: number;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}) {
  return (
    <li
      role="treeitem"
      tabIndex={0}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className="flex cursor-pointer items-center gap-1 py-0.5 pr-2 text-xs transition-colors hover:bg-accent/60"
      style={{ paddingLeft: `${depth * 12 + 16}px` }}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
    </li>
  );
}

function EmptyLeaf({ label, depth }: { label: string; depth: number }) {
  return (
    <li
      className="py-0.5 pr-2 text-[11px] italic text-muted-foreground"
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
    >
      {label}
    </li>
  );
}

function quote(schema: string, name: string): string {
  const safe = (s: string) => `"${s.replace(/"/g, '""')}"`;
  if (schema && schema !== "main") return `${safe(schema)}.${safe(name)}`;
  return safe(name);
}
