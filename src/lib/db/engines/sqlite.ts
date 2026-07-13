import initSqlJs, { type Database } from "sql.js";
import type { EngineId, QueryResult, SqlEngine, TableInfo } from "@/types/workbench";

// SQLite via sql.js. WASM served from /public/wasm/sql-wasm.wasm.
export class SqliteEngine implements SqlEngine {
  readonly id: EngineId = "sqlite";
  readonly label = "SQLite (sql.js)";
  private db: Database | null = null;
  private ready: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (!this.ready) {
      this.ready = (async () => {
        const SQL = await initSqlJs({ locateFile: () => "/wasm/sql-wasm.wasm" });
        this.db = new SQL.Database();
      })();
    }
    await this.ready;
  }

  private require(): Database {
    if (!this.db) throw new Error("SQLite engine not initialised");
    return this.db;
  }

  async exec(sql: string): Promise<QueryResult[]> {
    const db = this.require();
    const statements = splitStatements(sql);
    const results: QueryResult[] = [];
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;
      const start = performance.now();
      const isSelect = /^\s*(select|with|pragma|explain)\b/i.test(trimmed);
      if (isSelect) {
        const res = db.exec(trimmed);
        const durationMs = performance.now() - start;
        if (res.length === 0) {
          results.push({ columns: [], rows: [], durationMs, statement: trimmed });
        } else {
          for (const r of res) {
            results.push({
              columns: r.columns,
              rows: r.values as unknown[][],
              durationMs,
              statement: trimmed,
            });
          }
        }
      } else {
        db.run(trimmed);
        const durationMs = performance.now() - start;
        const rowsAffected = db.getRowsModified();
        results.push({ columns: [], rows: [], rowsAffected, durationMs, statement: trimmed });
      }
    }
    return results;
  }

  async listTables(): Promise<TableInfo[]> {
    const db = this.require();
    const q = db.exec(
      "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    if (!q.length) return [];
    const tables: TableInfo[] = [];
    for (const row of q[0].values) {
      const name = row[0] as string;
      const kind = (row[1] as string) === "view" ? "view" : "table";
      const infoRes = db.exec(`PRAGMA table_info("${name.replace(/"/g, '""')}")`);
      const columns = infoRes[0]
        ? infoRes[0].values.map((c) => ({
            name: c[1] as string,
            type: (c[2] as string) || "",
            notNull: !!c[3],
            pk: !!c[5],
          }))
        : [];
      tables.push({ name, kind, columns });
    }
    return tables;
  }

  async reset(): Promise<void> {
    if (this.db) this.db.close();
    this.db = null;
    this.ready = null;
    await this.init();
  }

  async loadScript(sql: string): Promise<void> {
    this.require().exec(sql);
  }

  async dump(): Promise<string> {
    const tables = await this.listTables();
    const lines: string[] = [];
    for (const t of tables) {
      if (t.kind === "view") continue;
      const create = this.require().exec(
        `SELECT sql FROM sqlite_master WHERE name = ?`,
      );
      const row = this.require().exec(
        `SELECT sql FROM sqlite_master WHERE name = '${t.name.replace(/'/g, "''")}'`,
      );
      if (row[0]?.values[0]?.[0]) lines.push(`${row[0].values[0][0]};`);
      const data = this.require().exec(`SELECT * FROM "${t.name}"`);
      if (data[0]) {
        for (const values of data[0].values) {
          const vs = values
            .map((v) =>
              v === null
                ? "NULL"
                : typeof v === "number"
                  ? String(v)
                  : `'${String(v).replace(/'/g, "''")}'`,
            )
            .join(", ");
          lines.push(`INSERT INTO "${t.name}" VALUES (${vs});`);
        }
      }
      void create;
    }
    return lines.join("\n");
  }
}

function splitStatements(sql: string): string[] {
  // Simple splitter respecting single quotes and line comments.
  const out: string[] = [];
  let cur = "";
  let inSingle = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && sql[i - 1] !== "\\") inSingle = !inSingle;
    if (ch === "-" && sql[i + 1] === "-" && !inSingle) {
      while (i < sql.length && sql[i] !== "\n") {
        cur += sql[i++];
      }
      continue;
    }
    if (ch === ";" && !inSingle) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
