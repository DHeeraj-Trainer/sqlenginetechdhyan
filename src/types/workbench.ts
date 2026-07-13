// Common types for the workbench.
export type EngineId = "sqlite" | "postgres" | "alasql" | "mysql";

export interface ColumnMeta {
  name: string;
  type: string;
  notNull?: boolean;
  pk?: boolean;
}

export interface TableInfo {
  name: string;
  kind: "table" | "view";
  columns: ColumnMeta[];
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowsAffected?: number;
  durationMs: number;
  statement: string;
}

export interface EngineError {
  message: string;
  statement: string;
  durationMs: number;
}

export interface SqlEngine {
  readonly id: EngineId;
  readonly label: string;
  init(): Promise<void>;
  exec(sql: string): Promise<QueryResult[]>;
  listTables(): Promise<TableInfo[]>;
  reset(): Promise<void>;
  loadScript(sql: string): Promise<void>;
  dump(): Promise<string>;
}

export interface QueryHistoryEntry {
  id: string;
  sql: string;
  engine: EngineId;
  timestamp: number;
  ok: boolean;
  durationMs: number;
  error?: string;
}

export interface SavedSnippet {
  id: string;
  name: string;
  sql: string;
  engine: EngineId;
  createdAt: number;
}

export interface EditorTab {
  id: string;
  name: string;
  content: string;
  dirty?: boolean;
}
