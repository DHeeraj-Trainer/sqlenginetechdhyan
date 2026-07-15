/**
 * Live MySQL engine — runs queries against a real MySQL server through the
 * `runMysqlQuery` server function. There is no in-browser database; every
 * `exec()` opens a fresh connection on the backend.
 *
 * The active connection id is stored in memory and localStorage; the engine
 * is inert (`no connection selected`) until one is set via `setConnection`.
 */
import type { EngineId, QueryResult, SqlEngine, TableInfo } from "@/types/workbench";
import { runMysqlQuery, listMysqlTables, type StoredMysqlConnection } from "@/lib/mysql-live.functions";

const STORAGE_KEY = "wb.mysql-live.connection.v1";

export class MysqlLiveEngine implements SqlEngine {
  readonly id: EngineId = "mysql-live";
  readonly label: string = "MySQL (live)";
  private connection: StoredMysqlConnection | null = null;

  async init(): Promise<void> {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          this.connection = JSON.parse(raw) as StoredMysqlConnection;
        } catch {
          this.connection = null;
        }
      }
    }
  }

  getConnection(): StoredMysqlConnection | null {
    return this.connection;
  }

  setConnection(conn: StoredMysqlConnection | null): void {
    this.connection = conn;
    if (typeof window !== "undefined") {
      if (conn) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conn));
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  private requireConnection(): StoredMysqlConnection {
    if (!this.connection) {
      throw new Error(
        "No live MySQL connection selected. Open the engine menu → Connect MySQL server… to configure one.",
      );
    }
    return this.connection;
  }

  async exec(sql: string): Promise<QueryResult[]> {
    const conn = this.requireConnection();
    const res = await runMysqlQuery({ data: { sql, connectionId: conn.id } });
    if (res.error) {
      // Match the in-browser engines' contract: throw on statement error so
      // the router surfaces it to the results pane.
      throw new Error(res.error);
    }
    return res.results.map((r) => ({
      columns: r.columns,
      rows: r.rows as unknown[][],
      rowsAffected: r.rowsAffected,
      durationMs: r.durationMs,
      statement: r.statement,
    }));
  }

  async listTables(): Promise<TableInfo[]> {
    const conn = this.requireConnection();
    const tables = await listMysqlTables({ data: { connectionId: conn.id } });
    return tables.map((t) => ({
      name: t.name,
      kind: "table",
      columns: t.columns.map((c) => ({
        name: c.name,
        type: c.type,
        notNull: c.notNull,
        pk: c.pk,
      })),
    }));
  }

  async reset(): Promise<void> {
    // Never destructive against a real server.
    throw new Error("Reset is disabled for live MySQL connections.");
  }

  async loadScript(_sql: string): Promise<void> {
    // Loading sample databases would run DDL against the user's real server.
    // Explicitly disabled — users can paste and run any script themselves.
  }

  async dump(): Promise<string> {
    throw new Error("Dump is not supported for live MySQL connections.");
  }
}
