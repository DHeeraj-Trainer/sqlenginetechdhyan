/**
 * MySQL compatibility matrix.
 *
 * Data-driven catalog of MySQL features and how each of the workbench's
 * engines handles them:
 *   - `supported`  : works natively on the engine
 *   - `emulated`   : rewritten/approximated by our translator or shim
 *   - `unsupported`: will fail or silently produce wrong results
 *
 * The panel filters this list for the currently active engine. When a live
 * MySQL server is connected, effectively everything is "supported" — the
 * engine hands SQL straight to the real server.
 */

import type { EngineId } from "@/types/workbench";

export type CompatStatus = "supported" | "emulated" | "unsupported";

export interface CompatFeature {
  /** Short human-readable name. */
  name: string;
  /** One-line description of the feature. */
  description: string;
  /** Category used to group features in the panel. */
  category:
    | "Syntax"
    | "Types"
    | "Functions"
    | "DDL"
    | "DML"
    | "Introspection"
    | "Transactions"
    | "Extensions";
  /** Example MySQL snippet (short). */
  example?: string;
  /**
   * Status per engine. Any engine omitted here inherits `unsupported`, except
   * `mysql-live` which is always assumed to fully support any MySQL feature
   * unless explicitly overridden below.
   */
  status: Partial<Record<EngineId, CompatStatus>>;
  /** Optional caveat shown when the row is expanded (emulated / unsupported only). */
  notes?: string;
}

// Convenience aliases to keep the table compact.
const S: CompatStatus = "supported";
const E: CompatStatus = "emulated";
const U: CompatStatus = "unsupported";

export const compatFeatures: CompatFeature[] = [
  // ---------- Syntax ------------------------------------------------------
  {
    name: "Backtick identifiers",
    description: "Quote identifiers with backticks (`col`).",
    category: "Syntax",
    example: "SELECT `id`, `name` FROM `users`;",
    status: { mysql: E, sqlite: U, postgres: U, alasql: U },
    notes: "Emulator rewrites backticks to double quotes for SQLite.",
  },
  {
    name: "LIMIT offset, count",
    description: "MySQL-style two-argument LIMIT.",
    category: "Syntax",
    example: "SELECT * FROM t LIMIT 10, 5;",
    status: { mysql: E, sqlite: U, postgres: U, alasql: U },
    notes: "Rewritten to `LIMIT count OFFSET offset`.",
  },
  {
    name: "# line comments",
    description: "MySQL allows `# comment` in addition to `-- comment`.",
    category: "Syntax",
    status: { mysql: E, sqlite: U, postgres: U, alasql: S },
    notes: "Emulator converts `#` comments to `--`.",
  },
  {
    name: "String concat with ||",
    description: "SQL-standard string concatenation.",
    category: "Syntax",
    example: "SELECT first_name || ' ' || last_name FROM users;",
    status: { mysql: U, sqlite: S, postgres: S, alasql: S },
    notes: "MySQL treats `||` as logical OR by default. Use `CONCAT()` for portable code.",
  },

  // ---------- Types -------------------------------------------------------
  {
    name: "TINYINT/SMALLINT/INT/BIGINT",
    description: "MySQL integer type family with width modifiers.",
    category: "Types",
    example: "id INT(11) UNSIGNED",
    status: { mysql: E, sqlite: S, postgres: E, alasql: E },
    notes: "Emulator collapses all integer widths and UNSIGNED/ZEROFILL to a plain integer.",
  },
  {
    name: "DATETIME / TIMESTAMP",
    description: "MySQL date-time types.",
    category: "Types",
    status: { mysql: E, sqlite: E, postgres: S, alasql: E },
    notes: "Stored as TEXT under the SQLite-backed emulator; comparisons still work lexicographically for ISO strings.",
  },
  {
    name: "VARCHAR(n) / TEXT family",
    description: "Length-bound and blob text types.",
    category: "Types",
    status: { mysql: E, sqlite: S, postgres: S, alasql: S },
    notes: "Length constraint is dropped by the emulator.",
  },
  {
    name: "DECIMAL(p, s)",
    description: "Fixed-precision numeric.",
    category: "Types",
    status: { mysql: E, sqlite: E, postgres: S, alasql: E },
    notes: "Rewritten to REAL/DOUBLE; scale is not enforced.",
  },
  {
    name: "ENUM / SET",
    description: "MySQL-only enumerated string columns.",
    category: "Types",
    status: { mysql: U, sqlite: U, postgres: U, alasql: U },
    notes: "Use a CHECK constraint or a lookup table for portability.",
  },
  {
    name: "JSON column type",
    description: "Native JSON storage.",
    category: "Types",
    status: { mysql: U, sqlite: U, postgres: S, alasql: U },
    notes: "Store JSON as TEXT in the emulator; JSON_* functions are unsupported.",
  },

  // ---------- Functions ---------------------------------------------------
  {
    name: "IFNULL(a, b)",
    description: "Return the first non-null argument.",
    category: "Functions",
    example: "SELECT IFNULL(nickname, name) FROM users;",
    status: { mysql: E, sqlite: U, postgres: U, alasql: U },
    notes: "Rewritten to COALESCE(a, b).",
  },
  {
    name: "CONCAT(a, b, ...)",
    description: "Variadic string concatenation.",
    category: "Functions",
    status: { mysql: E, sqlite: E, postgres: S, alasql: S },
    notes: "Emulator rewrites to `a || b || c` for SQLite.",
  },
  {
    name: "NOW() / CURDATE() / CURTIME()",
    description: "Current date/time helpers.",
    category: "Functions",
    status: { mysql: E, sqlite: E, postgres: E, alasql: E },
    notes: "Mapped to SQLite `datetime('now')` / `date('now')` / `time('now')`.",
  },
  {
    name: "DATE_FORMAT / STR_TO_DATE",
    description: "MySQL-specific date parsing/formatting.",
    category: "Functions",
    status: { mysql: U, sqlite: U, postgres: U, alasql: U },
    notes: "Use `strftime()` on SQLite or `to_char()` on Postgres for portable code.",
  },
  {
    name: "GROUP_CONCAT (basic)",
    description: "Aggregate rows into a delimited string.",
    category: "Functions",
    example: "SELECT GROUP_CONCAT(name) FROM t;",
    status: { mysql: E, sqlite: S, postgres: U, alasql: S },
    notes: "Basic form works via SQLite; the MySQL `SEPARATOR` and `ORDER BY` clauses inside GROUP_CONCAT are not translated.",
  },
  {
    name: "JSON_EXTRACT / JSON_* family",
    description: "MySQL JSON accessors.",
    category: "Functions",
    status: { mysql: U, sqlite: U, postgres: U, alasql: U },
    notes: "Not implemented by the emulator.",
  },
  {
    name: "Window functions",
    description: "OVER(...), ROW_NUMBER, RANK, LAG, LEAD.",
    category: "Functions",
    status: { mysql: S, sqlite: S, postgres: S, alasql: U },
  },

  // ---------- DDL ---------------------------------------------------------
  {
    name: "AUTO_INCREMENT",
    description: "Auto-generated integer primary keys.",
    category: "DDL",
    example: "id INT AUTO_INCREMENT PRIMARY KEY",
    status: { mysql: E, sqlite: E, postgres: E, alasql: E },
    notes: "Rewritten to `INTEGER PRIMARY KEY AUTOINCREMENT` for SQLite; SERIAL for Postgres.",
  },
  {
    name: "ENGINE=/CHARSET=/COLLATE= options",
    description: "MySQL table options at end of CREATE TABLE.",
    category: "DDL",
    status: { mysql: E, sqlite: U, postgres: U, alasql: U },
    notes: "Silently stripped by the emulator.",
  },
  {
    name: "Foreign keys",
    description: "REFERENCES with ON DELETE / ON UPDATE.",
    category: "DDL",
    status: { mysql: S, sqlite: S, postgres: S, alasql: U },
    notes: "SQLite requires `PRAGMA foreign_keys = ON;` — enabled by the emulator.",
  },
  {
    name: "Stored procedures / functions",
    description: "CREATE PROCEDURE / CREATE FUNCTION.",
    category: "DDL",
    status: { mysql: U, sqlite: U, postgres: U, alasql: U },
    notes: "Not supported by the in-browser engines. Use a live MySQL connection.",
  },
  {
    name: "Triggers",
    description: "CREATE TRIGGER … BEFORE/AFTER …",
    category: "DDL",
    status: { mysql: U, sqlite: S, postgres: S, alasql: U },
    notes: "SQLite supports triggers, but the MySQL trigger dialect is not translated.",
  },

  // ---------- DML ---------------------------------------------------------
  {
    name: "INSERT … ON DUPLICATE KEY UPDATE",
    description: "MySQL upsert form.",
    category: "DML",
    example: "INSERT INTO t (id, v) VALUES (1, 'a') ON DUPLICATE KEY UPDATE v = VALUES(v);",
    status: { mysql: U, sqlite: U, postgres: U, alasql: U },
    notes: "Rewrite to `INSERT … ON CONFLICT (id) DO UPDATE SET …` for portability.",
  },
  {
    name: "INSERT IGNORE",
    description: "Skip rows on unique-key conflict.",
    category: "DML",
    status: { mysql: U, sqlite: E, postgres: U, alasql: U },
    notes: "Use `INSERT OR IGNORE` (SQLite) or `ON CONFLICT DO NOTHING` (Postgres).",
  },
  {
    name: "REPLACE INTO",
    description: "Delete-then-insert on unique-key conflict.",
    category: "DML",
    status: { mysql: U, sqlite: S, postgres: U, alasql: U },
  },
  {
    name: "Multi-row VALUES INSERT",
    description: "INSERT INTO t VALUES (…), (…), (…)",
    category: "DML",
    status: { mysql: S, sqlite: S, postgres: S, alasql: S },
  },

  // ---------- Introspection ----------------------------------------------
  {
    name: "SHOW TABLES / SHOW DATABASES",
    description: "MySQL metadata commands.",
    category: "Introspection",
    status: { mysql: E, sqlite: U, postgres: U, alasql: U },
    notes: "Rewritten to a `sqlite_master` query.",
  },
  {
    name: "DESCRIBE t / DESC t",
    description: "Show a table's columns.",
    category: "Introspection",
    status: { mysql: E, sqlite: U, postgres: U, alasql: U },
    notes: "Rewritten to `PRAGMA table_info(t)`.",
  },
  {
    name: "INFORMATION_SCHEMA.*",
    description: "SQL-standard metadata views.",
    category: "Introspection",
    status: { mysql: U, sqlite: U, postgres: S, alasql: U },
    notes: "Not present in SQLite; use SHOW TABLES / PRAGMA in the emulator.",
  },
  {
    name: "EXPLAIN",
    description: "Query plan inspection.",
    category: "Introspection",
    status: { mysql: U, sqlite: S, postgres: S, alasql: U },
    notes: "SQLite's `EXPLAIN QUERY PLAN` is available directly.",
  },

  // ---------- Transactions ------------------------------------------------
  {
    name: "BEGIN / COMMIT / ROLLBACK",
    description: "Basic transactional control.",
    category: "Transactions",
    status: { mysql: S, sqlite: S, postgres: S, alasql: U },
  },
  {
    name: "SAVEPOINT / RELEASE SAVEPOINT",
    description: "Nested transaction points.",
    category: "Transactions",
    status: { mysql: S, sqlite: S, postgres: S, alasql: U },
  },
  {
    name: "LOCK TABLES / UNLOCK TABLES",
    description: "MySQL explicit table locking.",
    category: "Transactions",
    status: { mysql: U, sqlite: U, postgres: U, alasql: U },
  },

  // ---------- Extensions --------------------------------------------------
  {
    name: "USE db;",
    description: "Switch the current database.",
    category: "Extensions",
    status: { mysql: E, sqlite: U, postgres: U, alasql: U },
    notes: "Treated as a no-op by the emulator (single in-memory database).",
  },
  {
    name: "SET @var := …",
    description: "MySQL user-defined session variables.",
    category: "Extensions",
    status: { mysql: E, sqlite: U, postgres: U, alasql: U },
    notes: "The emulator no-ops `SET`; reads of `@var` will error.",
  },
  {
    name: "DELIMITER //",
    description: "Change statement delimiter for procedure bodies.",
    category: "Extensions",
    status: { mysql: U, sqlite: U, postgres: U, alasql: U },
    notes: "Not implemented; procedures are not supported outside a live server.",
  },
];

/**
 * Compute the effective status for a feature under a given engine. When the
 * engine is `mysql-live`, everything is `supported` unless explicitly marked
 * unsupported by the row itself.
 */
export function statusFor(feature: CompatFeature, engineId: EngineId): CompatStatus {
  if (engineId === "mysql-live") {
    // Anything explicitly marked in the row wins; otherwise real MySQL
    // supports it.
    return feature.status[engineId] ?? "supported";
  }
  return feature.status[engineId] ?? "unsupported";
}
