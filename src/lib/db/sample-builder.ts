import type { EngineId } from "@/types/workbench";

// Convert generic sample-DB definitions to per-dialect DDL/DML.
export interface ColumnSpec {
  name: string;
  type: "int" | "text" | "real" | "date";
  pk?: boolean;
  notNull?: boolean;
}

export interface SampleTable {
  name: string;
  columns: ColumnSpec[];
  rows: Array<Record<string, string | number | null>>;
}

export interface SampleDatabase {
  id: string;
  name: string;
  description: string;
  tables: SampleTable[];
}

function q(v: string | number | null): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

function typeFor(t: ColumnSpec["type"], engine: EngineId): string {
  if (engine === "postgres") {
    return t === "int" ? "INTEGER" : t === "real" ? "DOUBLE PRECISION" : t === "date" ? "DATE" : "TEXT";
  }
  if (engine === "sqlite") {
    return t === "int" ? "INTEGER" : t === "real" ? "REAL" : "TEXT";
  }
  // alasql / mysql
  return t === "int" ? "INT" : t === "real" ? "DOUBLE" : t === "date" ? "DATE" : "VARCHAR(255)";
}

export function buildScript(db: SampleDatabase, engine: EngineId): string {
  const parts: string[] = [];
  const drop = engine === "postgres" ? "DROP TABLE IF EXISTS" : "DROP TABLE IF EXISTS";
  for (const t of [...db.tables].reverse()) {
    parts.push(`${drop} ${t.name};`);
  }
  for (const t of db.tables) {
    const cols = t.columns
      .map((c) => {
        const parts: string[] = [c.name, typeFor(c.type, engine)];
        if (c.pk) parts.push("PRIMARY KEY");
        if (c.notNull && !c.pk) parts.push("NOT NULL");
        return parts.join(" ");
      })
      .join(", ");
    parts.push(`CREATE TABLE ${t.name} (${cols});`);
  }
  for (const t of db.tables) {
    if (!t.rows.length) continue;
    const colNames = t.columns.map((c) => c.name);
    for (const r of t.rows) {
      const vs = colNames.map((c) => q(r[c] ?? null)).join(", ");
      parts.push(`INSERT INTO ${t.name} (${colNames.join(", ")}) VALUES (${vs});`);
    }
  }
  return parts.join("\n");
}
