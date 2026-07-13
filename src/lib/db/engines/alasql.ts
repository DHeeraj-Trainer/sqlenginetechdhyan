import type { EngineId, QueryResult, SqlEngine, TableInfo } from "@/types/workbench";

// AlaSQL fallback (legacy). Import lazily so the SSR bundle never touches
// the alasql source (which references react-native optional deps).
export class AlaSqlEngine implements SqlEngine {
  readonly id: EngineId = "alasql";
  readonly label = "AlaSQL (legacy)";
  private db: unknown = null;
  private alasqlNs: unknown = null;

  private async load(): Promise<{ Database: new () => unknown }> {
    if (!this.alasqlNs) {
      const mod = (await import("alasql")) as unknown as { default: { Database: new () => unknown } };
      this.alasqlNs = mod.default;
    }
    return this.alasqlNs as { Database: new () => unknown };
  }

  async init(): Promise<void> {
    if (this.db) return;
    const alasql = await this.load();
    this.db = new alasql.Database();
  }

  private require(): { exec: (sql: string) => unknown; tables: Record<string, { columns: { columnid: string; dbtypeid: string }[] }> } {
    if (!this.db) throw new Error("AlaSQL engine not initialised");
    return this.db as { exec: (sql: string) => unknown; tables: Record<string, { columns: { columnid: string; dbtypeid: string }[] }> };
  }

  async exec(sql: string): Promise<QueryResult[]> {
    const db = this.require();
    const start = performance.now();
    const res = db.exec(sql);
    const dur = performance.now() - start;
    const asArray = Array.isArray(res) ? res : [res];
    const results: QueryResult[] = [];
    for (const r of asArray) {
      if (Array.isArray(r) && r.length && typeof r[0] === "object") {
        const columns = Object.keys(r[0] as Record<string, unknown>);
        const rows = (r as Record<string, unknown>[]).map((row) => columns.map((c) => row[c]));
        results.push({ columns, rows, durationMs: dur, statement: sql });
      } else {
        results.push({ columns: [], rows: [], rowsAffected: Number(r) || 0, durationMs: dur, statement: sql });
      }
    }
    return results;
  }

  async listTables(): Promise<TableInfo[]> {
    const db = this.require();
    const names = Object.keys(db.tables || {});
    return names.map((n) => {
      const table = db.tables[n];
      const columns = (table.columns || []).map((c) => ({ name: c.columnid, type: c.dbtypeid || "ANY" }));
      return { name: n, kind: "table" as const, columns };
    });
  }

  async reset(): Promise<void> {
    const alasql = await this.load();
    this.db = new alasql.Database();
  }

  async loadScript(sql: string): Promise<void> {
    this.require().exec(sql);
  }

  async dump(): Promise<string> {
    return "-- AlaSQL dump not implemented.";
  }
}
