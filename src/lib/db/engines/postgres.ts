import { PGlite } from "@electric-sql/pglite";
import type { EngineId, QueryResult, SqlEngine, TableInfo } from "@/types/workbench";

// PostgreSQL in-browser via PGlite (WASM).
export class PostgresEngine implements SqlEngine {
  readonly id: EngineId = "postgres";
  readonly label = "PostgreSQL (PGlite)";
  private db: PGlite | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    this.db = new PGlite();
    await this.db.waitReady;
  }

  private require(): PGlite {
    if (!this.db) throw new Error("Postgres engine not initialised");
    return this.db;
  }

  async exec(sql: string): Promise<QueryResult[]> {
    const db = this.require();
    const start = performance.now();
    try {
      const res = await db.exec(sql);
      const dur = performance.now() - start;
      return res.map((r) => ({
        columns: r.fields?.map((f: { name: string }) => f.name) ?? [],
        rows: (r.rows ?? []).map((row) =>
          (r.fields ?? []).map((f: { name: string }) => (row as Record<string, unknown>)[f.name]),
        ),
        rowsAffected: r.affectedRows,
        durationMs: dur / Math.max(res.length, 1),
        statement: sql,
      }));
    } catch (e) {
      throw e;
    }
  }

  async listTables(): Promise<TableInfo[]> {
    const db = this.require();
    const res = await db.query<{ table_name: string; table_type: string }>(
      `SELECT table_name, table_type FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const out: TableInfo[] = [];
    for (const r of res.rows) {
      const cols = await db.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [r.table_name],
      );
      const pks = await db.query<{ column_name: string }>(
        `SELECT a.attname AS column_name
         FROM   pg_index i
         JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
         WHERE  i.indrelid = format('public.%I', $1)::regclass AND i.indisprimary`,
        [r.table_name],
      ).catch(() => ({ rows: [] as { column_name: string }[] }));
      const pkSet = new Set(pks.rows.map((p) => p.column_name));
      out.push({
        name: r.table_name,
        kind: r.table_type === "VIEW" ? "view" : "table",
        columns: cols.rows.map((c) => ({
          name: c.column_name,
          type: c.data_type,
          notNull: c.is_nullable === "NO",
          pk: pkSet.has(c.column_name),
        })),
      });
    }
    return out;
  }

  async reset(): Promise<void> {
    if (this.db) await this.db.close();
    this.db = null;
    await this.init();
  }

  async loadScript(sql: string): Promise<void> {
    await this.require().exec(sql);
  }

  async dump(): Promise<string> {
    return "-- PGlite dump not implemented in browser build.";
  }
}
