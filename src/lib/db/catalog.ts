// Metadata catalog for the Database Explorer.
// Introspects the live SQL engine and produces a rich, normalized snapshot
// used to drive the tree, the object inspector, and the DDL generator.

import type { ColumnMeta, EngineId, QueryResult, SqlEngine, TableInfo } from "@/types/workbench";

export interface CatalogForeignKey {
  name?: string;
  table: string;
  columns: string[];
  refSchema?: string;
  refTable: string;
  refColumns: string[];
  onUpdate?: string;
  onDelete?: string;
}

export interface CatalogUniqueKey {
  name: string;
  columns: string[];
}

export interface CatalogCheck {
  name?: string;
  definition: string;
}

export interface CatalogIndex {
  name: string;
  schema: string;
  table: string;
  unique: boolean;
  columns: string[];
  sql?: string;
}

export interface CatalogTrigger {
  name: string;
  schema: string;
  table: string;
  timing?: string;
  event?: string;
  sql?: string;
}

export interface CatalogSequence {
  name: string;
  schema: string;
  start?: number;
  increment?: number;
  minValue?: number;
  maxValue?: number;
}

export interface CatalogRoutine {
  name: string;
  schema: string;
  kind: "function" | "procedure";
  language?: string;
  returnType?: string;
  sql?: string;
}

export interface EnrichedColumn extends ColumnMeta {
  length?: number | null;
  default?: string | null;
  identity?: boolean;
  autoIncrement?: boolean;
  generated?: boolean;
  ordinalPosition?: number;
}

export interface EnrichedTable {
  name: string;
  schema: string;
  kind: "table" | "view" | "materialized view";
  columns: EnrichedColumn[];
  primaryKey: string[];
  foreignKeys: CatalogForeignKey[];
  uniqueKeys: CatalogUniqueKey[];
  checks: CatalogCheck[];
  indexes: CatalogIndex[];
  rowCount?: number | null;
  owner?: string;
  createdAt?: string;
  engine?: string;
  charset?: string;
  collation?: string;
  ddl?: string;
  viewDefinition?: string;
}

export interface CatalogSchema {
  name: string;
  tables: EnrichedTable[];
  views: EnrichedTable[];
  materializedViews: EnrichedTable[];
  indexes: CatalogIndex[];
  triggers: CatalogTrigger[];
  sequences: CatalogSequence[];
  functions: CatalogRoutine[];
  procedures: CatalogRoutine[];
  synonyms: { name: string; target: string }[];
}

export interface CatalogPrincipal {
  name: string;
  kind: "user" | "role";
  attributes?: string;
}

export interface CatalogPrivilege {
  grantee: string;
  schema: string;
  object: string;
  privilege: string;
}

export interface CatalogSnapshot {
  engine: EngineId;
  database: string;
  schemas: CatalogSchema[];
  users: CatalogPrincipal[];
  roles: CatalogPrincipal[];
  privileges: CatalogPrivilege[];
  loadedAt: number;
}

function emptySchema(name: string): CatalogSchema {
  return {
    name,
    tables: [],
    views: [],
    materializedViews: [],
    indexes: [],
    triggers: [],
    sequences: [],
    functions: [],
    procedures: [],
    synonyms: [],
  };
}

export function emptyCatalog(engineId: EngineId): CatalogSnapshot {
  return {
    engine: engineId,
    database: engineId,
    schemas: [emptySchema(defaultSchema(engineId))],
    users: [],
    roles: [],
    privileges: [],
    loadedAt: Date.now(),
  };
}

export function defaultSchema(engineId: EngineId): string {
  if (engineId === "postgres") return "public";
  return "main";
}

/** Convert QueryResult[] → array of row objects (first result set only). */
function rowsAsObjects(results: QueryResult[] | null | undefined): Record<string, unknown>[] {
  if (!results || !results.length) return [];
  const r = results[0];
  return r.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    r.columns.forEach((c, i) => {
      obj[c] = row[i];
    });
    return obj;
  });
}

async function safeExec(engine: SqlEngine, sql: string): Promise<QueryResult[] | null> {
  try {
    return await engine.exec(sql);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SQLite catalog
// ---------------------------------------------------------------------------

async function loadSqliteCatalog(engine: SqlEngine): Promise<CatalogSnapshot> {
  const schema = emptySchema("main");
  const objects = rowsAsObjects(
    await safeExec(
      engine,
      "SELECT name, type, sql, tbl_name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
    ),
  );

  const tableByName = new Map<string, EnrichedTable>();

  for (const o of objects) {
    const name = String(o.name);
    const type = String(o.type);
    const sql = o.sql == null ? undefined : String(o.sql);
    if (type === "table" || type === "view") {
      const enriched = await enrichSqliteTable(engine, name, type === "view" ? "view" : "table", sql);
      if (type === "table") schema.tables.push(enriched);
      else schema.views.push(enriched);
      tableByName.set(name, enriched);
    } else if (type === "index") {
      const table = String(o.tbl_name ?? "");
      const idxInfo = rowsAsObjects(
        await safeExec(engine, `PRAGMA index_info("${name.replace(/"/g, '""')}")`),
      );
      const listInfo = rowsAsObjects(
        await safeExec(engine, `PRAGMA index_list("${table.replace(/"/g, '""')}")`),
      );
      const meta = listInfo.find((r) => r.name === name);
      const idx: CatalogIndex = {
        name,
        schema: "main",
        table,
        unique: !!meta?.unique,
        columns: idxInfo.map((r) => String(r.name ?? "")).filter(Boolean),
        sql,
      };
      schema.indexes.push(idx);
      const target = tableByName.get(table);
      if (target) target.indexes.push(idx);
    } else if (type === "trigger") {
      schema.triggers.push({
        name,
        schema: "main",
        table: String(o.tbl_name ?? ""),
        sql,
      });
    }
  }

  return {
    engine: "sqlite",
    database: "main",
    schemas: [schema],
    users: [],
    roles: [],
    privileges: [],
    loadedAt: Date.now(),
  };
}

async function enrichSqliteTable(
  engine: SqlEngine,
  name: string,
  kind: "table" | "view",
  ddl?: string,
): Promise<EnrichedTable> {
  const quoted = `"${name.replace(/"/g, '""')}"`;
  const info = rowsAsObjects(await safeExec(engine, `PRAGMA table_info(${quoted})`));
  const columns: EnrichedColumn[] = info.map((r) => ({
    name: String(r.name),
    type: String(r.type ?? ""),
    notNull: r.notnull === 1 || r.notnull === true,
    pk: (r.pk as number) > 0,
    default: r.dflt_value == null ? null : String(r.dflt_value),
    ordinalPosition: Number(r.cid ?? 0) + 1,
    autoIncrement: (r.pk as number) > 0 && /INTEGER/i.test(String(r.type ?? "")),
  }));

  const fkRows = rowsAsObjects(await safeExec(engine, `PRAGMA foreign_key_list(${quoted})`));
  const fkMap = new Map<number, CatalogForeignKey>();
  for (const r of fkRows) {
    const id = Number(r.id);
    let fk = fkMap.get(id);
    if (!fk) {
      fk = {
        table: name,
        columns: [],
        refTable: String(r.table ?? ""),
        refColumns: [],
        onUpdate: r.on_update ? String(r.on_update) : undefined,
        onDelete: r.on_delete ? String(r.on_delete) : undefined,
      };
      fkMap.set(id, fk);
    }
    fk.columns.push(String(r.from));
    fk.refColumns.push(String(r.to));
  }

  const idxListRows = rowsAsObjects(await safeExec(engine, `PRAGMA index_list(${quoted})`));
  const uniqueKeys: CatalogUniqueKey[] = [];
  for (const r of idxListRows) {
    if (!r.unique) continue;
    const info2 = rowsAsObjects(
      await safeExec(engine, `PRAGMA index_info("${String(r.name).replace(/"/g, '""')}")`),
    );
    uniqueKeys.push({
      name: String(r.name),
      columns: info2.map((c) => String(c.name)),
    });
  }

  let rowCount: number | null = null;
  if (kind === "table") {
    const cnt = await safeExec(engine, `SELECT COUNT(*) AS c FROM ${quoted}`);
    if (cnt && cnt[0]?.rows.length) rowCount = Number(cnt[0].rows[0][0]);
  }

  return {
    name,
    schema: "main",
    kind,
    columns,
    primaryKey: columns.filter((c) => c.pk).map((c) => c.name),
    foreignKeys: [...fkMap.values()],
    uniqueKeys,
    checks: [],
    indexes: [],
    rowCount,
    engine: "sqlite",
    ddl: ddl ? `${ddl};` : undefined,
    viewDefinition: kind === "view" ? ddl : undefined,
  };
}

// ---------------------------------------------------------------------------
// Postgres (PGlite) catalog
// ---------------------------------------------------------------------------

async function loadPostgresCatalog(engine: SqlEngine): Promise<CatalogSnapshot> {
  const schemas = rowsAsObjects(
    await safeExec(
      engine,
      `SELECT nspname AS name FROM pg_namespace
       WHERE nspname NOT LIKE 'pg\\_%' ESCAPE '\\'
         AND nspname NOT IN ('information_schema')
       ORDER BY nspname`,
    ),
  ).map((r) => String(r.name));

  if (schemas.length === 0) schemas.push("public");

  const out: CatalogSchema[] = [];
  for (const schemaName of schemas) {
    const s = emptySchema(schemaName);

    // Tables + views (single query, then split by table_type).
    const tables = rowsAsObjects(
      await safeExec(
        engine,
        `SELECT table_name, table_type FROM information_schema.tables
         WHERE table_schema = '${schemaName.replace(/'/g, "''")}'
         ORDER BY table_name`,
      ),
    );

    for (const t of tables) {
      const tblName = String(t.table_name);
      const typ = String(t.table_type);
      const kind: EnrichedTable["kind"] =
        typ === "VIEW" ? "view" : typ === "MATERIALIZED VIEW" ? "materialized view" : "table";
      const enriched = await enrichPostgresTable(engine, schemaName, tblName, kind);
      if (kind === "view") s.views.push(enriched);
      else if (kind === "materialized view") s.materializedViews.push(enriched);
      else s.tables.push(enriched);
    }

    // Indexes
    const idx = rowsAsObjects(
      await safeExec(
        engine,
        `SELECT indexname AS name, tablename AS table, indexdef AS sql
         FROM pg_indexes WHERE schemaname = '${schemaName.replace(/'/g, "''")}' ORDER BY indexname`,
      ),
    );
    for (const r of idx) {
      const def = String(r.sql ?? "");
      const cols = /\(([^)]*)\)/.exec(def)?.[1]?.split(",").map((x) => x.trim()) ?? [];
      const index: CatalogIndex = {
        name: String(r.name),
        schema: schemaName,
        table: String(r.table),
        unique: /CREATE\s+UNIQUE\s+INDEX/i.test(def),
        columns: cols,
        sql: def ? `${def};` : undefined,
      };
      s.indexes.push(index);
      const parent =
        s.tables.find((tt) => tt.name === index.table) ??
        s.views.find((tt) => tt.name === index.table);
      if (parent) parent.indexes.push(index);
    }

    // Triggers
    const trg = rowsAsObjects(
      await safeExec(
        engine,
        `SELECT trigger_name AS name, event_object_table AS table,
                action_timing AS timing, event_manipulation AS event, action_statement AS body
         FROM information_schema.triggers
         WHERE trigger_schema = '${schemaName.replace(/'/g, "''")}'`,
      ),
    );
    for (const r of trg) {
      s.triggers.push({
        name: String(r.name),
        schema: schemaName,
        table: String(r.table),
        timing: r.timing ? String(r.timing) : undefined,
        event: r.event ? String(r.event) : undefined,
        sql: r.body ? String(r.body) : undefined,
      });
    }

    // Sequences
    const seq = rowsAsObjects(
      await safeExec(
        engine,
        `SELECT sequence_name AS name, start_value AS start, increment
         FROM information_schema.sequences
         WHERE sequence_schema = '${schemaName.replace(/'/g, "''")}'`,
      ),
    );
    for (const r of seq) {
      s.sequences.push({
        name: String(r.name),
        schema: schemaName,
        start: r.start != null ? Number(r.start) : undefined,
        increment: r.increment != null ? Number(r.increment) : undefined,
      });
    }

    // Routines
    const rt = rowsAsObjects(
      await safeExec(
        engine,
        `SELECT routine_name AS name, routine_type AS kind, external_language AS language,
                data_type AS return_type, routine_definition AS body
         FROM information_schema.routines
         WHERE specific_schema = '${schemaName.replace(/'/g, "''")}'`,
      ),
    );
    for (const r of rt) {
      const kind = String(r.kind ?? "").toLowerCase() === "procedure" ? "procedure" : "function";
      const routine: CatalogRoutine = {
        name: String(r.name),
        schema: schemaName,
        kind,
        language: r.language ? String(r.language) : undefined,
        returnType: r.return_type ? String(r.return_type) : undefined,
        sql: r.body ? String(r.body) : undefined,
      };
      if (kind === "procedure") s.procedures.push(routine);
      else s.functions.push(routine);
    }

    out.push(s);
  }

  // Roles / users / privileges
  const roleRows = rowsAsObjects(
    await safeExec(
      engine,
      `SELECT rolname AS name, rolcanlogin AS can_login FROM pg_roles ORDER BY rolname`,
    ),
  );
  const users: CatalogPrincipal[] = [];
  const roles: CatalogPrincipal[] = [];
  for (const r of roleRows) {
    const p: CatalogPrincipal = { name: String(r.name), kind: r.can_login ? "user" : "role" };
    if (r.can_login) users.push(p);
    else roles.push(p);
  }

  const privRows = rowsAsObjects(
    await safeExec(
      engine,
      `SELECT grantee, table_schema, table_name, privilege_type
       FROM information_schema.role_table_grants
       WHERE table_schema NOT IN ('pg_catalog','information_schema')
       LIMIT 500`,
    ),
  );
  const privileges: CatalogPrivilege[] = privRows.map((r) => ({
    grantee: String(r.grantee),
    schema: String(r.table_schema),
    object: String(r.table_name),
    privilege: String(r.privilege_type),
  }));

  return {
    engine: "postgres",
    database: "postgres",
    schemas: out,
    users,
    roles,
    privileges,
    loadedAt: Date.now(),
  };
}

async function enrichPostgresTable(
  engine: SqlEngine,
  schemaName: string,
  tableName: string,
  kind: EnrichedTable["kind"],
): Promise<EnrichedTable> {
  const s = schemaName.replace(/'/g, "''");
  const t = tableName.replace(/'/g, "''");
  const cols = rowsAsObjects(
    await safeExec(
      engine,
      `SELECT column_name, data_type, is_nullable, column_default,
              character_maximum_length, is_identity, is_generated, ordinal_position
       FROM information_schema.columns
       WHERE table_schema = '${s}' AND table_name = '${t}'
       ORDER BY ordinal_position`,
    ),
  );

  const pkRows = rowsAsObjects(
    await safeExec(
      engine,
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = '${s}' AND tc.table_name = '${t}'
       ORDER BY kcu.ordinal_position`,
    ),
  );
  const pkSet = new Set(pkRows.map((r) => String(r.column_name)));

  const fkRows = rowsAsObjects(
    await safeExec(
      engine,
      `SELECT tc.constraint_name, kcu.column_name,
              ccu.table_schema AS ref_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_column,
              rc.update_rule, rc.delete_rule
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.referential_constraints rc
         ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
       JOIN information_schema.constraint_column_usage ccu
         ON rc.unique_constraint_name = ccu.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = '${s}' AND tc.table_name = '${t}'
       ORDER BY tc.constraint_name, kcu.ordinal_position`,
    ),
  );
  const fkMap = new Map<string, CatalogForeignKey>();
  for (const r of fkRows) {
    const key = String(r.constraint_name);
    let fk = fkMap.get(key);
    if (!fk) {
      fk = {
        name: key,
        table: tableName,
        columns: [],
        refSchema: r.ref_schema ? String(r.ref_schema) : undefined,
        refTable: String(r.ref_table),
        refColumns: [],
        onUpdate: r.update_rule ? String(r.update_rule) : undefined,
        onDelete: r.delete_rule ? String(r.delete_rule) : undefined,
      };
      fkMap.set(key, fk);
    }
    fk.columns.push(String(r.column_name));
    fk.refColumns.push(String(r.ref_column));
  }

  const uqRows = rowsAsObjects(
    await safeExec(
      engine,
      `SELECT tc.constraint_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'UNIQUE'
         AND tc.table_schema = '${s}' AND tc.table_name = '${t}'
       ORDER BY tc.constraint_name, kcu.ordinal_position`,
    ),
  );
  const uqMap = new Map<string, CatalogUniqueKey>();
  for (const r of uqRows) {
    const key = String(r.constraint_name);
    const existing = uqMap.get(key);
    if (existing) existing.columns.push(String(r.column_name));
    else uqMap.set(key, { name: key, columns: [String(r.column_name)] });
  }

  const chkRows = rowsAsObjects(
    await safeExec(
      engine,
      `SELECT cc.constraint_name AS name, cc.check_clause AS definition
       FROM information_schema.check_constraints cc
       JOIN information_schema.table_constraints tc USING (constraint_name, constraint_schema)
       WHERE tc.table_schema = '${s}' AND tc.table_name = '${t}'`,
    ),
  );

  let rowCount: number | null = null;
  if (kind === "table" || kind === "materialized view") {
    const c = await safeExec(engine, `SELECT COUNT(*) AS c FROM "${schemaName}"."${tableName}"`);
    if (c && c[0]?.rows.length) rowCount = Number(c[0].rows[0][0]);
  }

  let viewDefinition: string | undefined;
  if (kind === "view") {
    const v = rowsAsObjects(
      await safeExec(
        engine,
        `SELECT view_definition AS def FROM information_schema.views
         WHERE table_schema = '${s}' AND table_name = '${t}'`,
      ),
    );
    if (v.length) viewDefinition = String(v[0].def ?? "");
  }

  const columns: EnrichedColumn[] = cols.map((r) => ({
    name: String(r.column_name),
    type: String(r.data_type ?? ""),
    notNull: String(r.is_nullable) === "NO",
    pk: pkSet.has(String(r.column_name)),
    length: r.character_maximum_length == null ? null : Number(r.character_maximum_length),
    default: r.column_default == null ? null : String(r.column_default),
    identity: String(r.is_identity) === "YES",
    generated: String(r.is_generated ?? "NEVER") !== "NEVER",
    ordinalPosition: Number(r.ordinal_position ?? 0),
  }));

  return {
    name: tableName,
    schema: schemaName,
    kind,
    columns,
    primaryKey: [...pkSet],
    foreignKeys: [...fkMap.values()],
    uniqueKeys: [...uqMap.values()],
    checks: chkRows.map((r) => ({
      name: r.name ? String(r.name) : undefined,
      definition: String(r.definition ?? ""),
    })),
    indexes: [],
    rowCount,
    engine: "postgres",
    viewDefinition,
  };
}

// ---------------------------------------------------------------------------
// AlaSQL / fallback catalog (uses listTables only)
// ---------------------------------------------------------------------------

async function loadFallbackCatalog(engine: SqlEngine): Promise<CatalogSnapshot> {
  const list = await engine.listTables();
  const schema = emptySchema(defaultSchema(engine.id));
  for (const t of list) {
    const enriched: EnrichedTable = {
      name: t.name,
      schema: schema.name,
      kind: t.kind,
      columns: t.columns.map((c: ColumnMeta, i) => ({ ...c, ordinalPosition: i + 1 })),
      primaryKey: t.columns.filter((c) => c.pk).map((c) => c.name),
      foreignKeys: [],
      uniqueKeys: [],
      checks: [],
      indexes: [],
      rowCount: null,
      engine: engine.id,
    };
    if (t.kind === "view") schema.views.push(enriched);
    else schema.tables.push(enriched);
  }
  return {
    engine: engine.id,
    database: engine.id,
    schemas: [schema],
    users: [],
    roles: [],
    privileges: [],
    loadedAt: Date.now(),
  };
}

export async function loadCatalog(engine: SqlEngine): Promise<CatalogSnapshot> {
  try {
    if (engine.id === "sqlite") return await loadSqliteCatalog(engine);
    if (engine.id === "postgres") return await loadPostgresCatalog(engine);
    return await loadFallbackCatalog(engine);
  } catch (err) {
    console.error("[catalog] load failed", err);
    return emptyCatalog(engine.id);
  }
}

/** Flatten catalog into a list of navigable objects for search. */
export interface FlatObject {
  kind:
    | "table"
    | "view"
    | "materialized view"
    | "index"
    | "trigger"
    | "sequence"
    | "function"
    | "procedure"
    | "user"
    | "role";
  schema: string;
  name: string;
  parent?: string;
}

export function flattenCatalog(cat: CatalogSnapshot): FlatObject[] {
  const out: FlatObject[] = [];
  for (const s of cat.schemas) {
    for (const t of s.tables) out.push({ kind: "table", schema: s.name, name: t.name });
    for (const v of s.views) out.push({ kind: "view", schema: s.name, name: v.name });
    for (const v of s.materializedViews)
      out.push({ kind: "materialized view", schema: s.name, name: v.name });
    for (const i of s.indexes) out.push({ kind: "index", schema: s.name, name: i.name, parent: i.table });
    for (const t of s.triggers) out.push({ kind: "trigger", schema: s.name, name: t.name, parent: t.table });
    for (const q of s.sequences) out.push({ kind: "sequence", schema: s.name, name: q.name });
    for (const f of s.functions) out.push({ kind: "function", schema: s.name, name: f.name });
    for (const p of s.procedures) out.push({ kind: "procedure", schema: s.name, name: p.name });
  }
  for (const u of cat.users) out.push({ kind: "user", schema: "-", name: u.name });
  for (const r of cat.roles) out.push({ kind: "role", schema: "-", name: r.name });
  return out;
}

/** Generate a CREATE TABLE DDL from an enriched table (best-effort, engine-aware). */
export function generateTableDDL(table: EnrichedTable, engineId: EngineId): string {
  if (table.ddl) return table.ddl;
  const q = engineId === "postgres" ? '"' : '"';
  const cols = table.columns.map((c) => {
    const parts = [`  ${q}${c.name}${q}`, c.type || "TEXT"];
    if (c.length) parts[1] = `${c.type}(${c.length})`;
    if (c.notNull) parts.push("NOT NULL");
    if (c.default != null) parts.push(`DEFAULT ${c.default}`);
    if (c.identity) parts.push("GENERATED BY DEFAULT AS IDENTITY");
    return parts.join(" ");
  });
  if (table.primaryKey.length) {
    cols.push(`  PRIMARY KEY (${table.primaryKey.map((c) => `${q}${c}${q}`).join(", ")})`);
  }
  for (const fk of table.foreignKeys) {
    cols.push(
      `  CONSTRAINT ${q}${fk.name ?? `fk_${fk.columns.join("_")}`}${q} FOREIGN KEY (${fk.columns
        .map((c) => `${q}${c}${q}`)
        .join(", ")}) REFERENCES ${q}${fk.refTable}${q}(${fk.refColumns
        .map((c) => `${q}${c}${q}`)
        .join(", ")})${fk.onDelete ? ` ON DELETE ${fk.onDelete}` : ""}${
        fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : ""
      }`,
    );
  }
  for (const u of table.uniqueKeys) {
    cols.push(
      `  CONSTRAINT ${q}${u.name}${q} UNIQUE (${u.columns.map((c) => `${q}${c}${q}`).join(", ")})`,
    );
  }
  for (const c of table.checks) {
    cols.push(`  CONSTRAINT ${q}${c.name ?? "chk"}${q} CHECK (${c.definition})`);
  }
  const schemaPrefix = engineId === "postgres" ? `${q}${table.schema}${q}.` : "";
  const keyword =
    table.kind === "view"
      ? "CREATE VIEW"
      : table.kind === "materialized view"
        ? "CREATE MATERIALIZED VIEW"
        : "CREATE TABLE";
  if (table.kind === "view" && table.viewDefinition) {
    return `CREATE VIEW ${schemaPrefix}${q}${table.name}${q} AS\n${table.viewDefinition};`;
  }
  return `${keyword} ${schemaPrefix}${q}${table.name}${q} (\n${cols.join(",\n")}\n);`;
}

/** Detect if a SQL string likely mutates schema so we know to refresh catalog. */
export function isSchemaChanging(sql: string): boolean {
  return /\b(create|drop|alter|truncate|grant|revoke|comment|rename|attach|detach)\b/i.test(sql);
}

/** Detect DML that may change row counts. */
export function isDataChanging(sql: string): boolean {
  return /\b(insert|update|delete|replace|merge|copy)\b/i.test(sql);
}

export type { TableInfo };
