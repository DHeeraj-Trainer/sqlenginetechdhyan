import { SqliteEngine } from "./sqlite";
import type { EngineId, QueryResult } from "@/types/workbench";

/**
 * In-browser MySQL emulation.
 *
 * Runs a real SQLite (sql.js) engine under the hood and preprocesses MySQL
 * dialect into SQLite before every exec/loadScript. Handles the common
 * differences shown in tutorials and interview prep material:
 *
 * - backticks -> double quotes for identifiers
 * - `AUTO_INCREMENT` -> `AUTOINCREMENT`
 * - `ENGINE=...`, `DEFAULT CHARSET=...`, `COLLATE=...` table options stripped
 * - `UNSIGNED`, `ZEROFILL` type modifiers stripped
 * - `TINYINT(1)/INT/BIGINT/MEDIUMINT/SMALLINT` -> `INTEGER`
 * - `DOUBLE/FLOAT/DECIMAL(x,y)` -> `REAL`
 * - `DATETIME/TIMESTAMP/DATE/TIME/YEAR` -> `TEXT`
 * - `VARCHAR(n)/CHAR(n)/TEXT/LONGTEXT/MEDIUMTEXT/TINYTEXT` -> `TEXT`
 * - `LIMIT x, y` -> `LIMIT y OFFSET x`
 * - `IFNULL(a,b)` -> `COALESCE(a,b)`
 * - `NOW()/CURDATE()/CURTIME()` -> SQLite equivalents
 * - `CONCAT(a,b,c...)` -> `a || b || c`
 * - MySQL `#` line comments -> `--`
 * - `USE db;`, `SET ...;`, `SHOW WARNINGS` -> no-op
 * - `SHOW TABLES` / `SHOW DATABASES` / `DESCRIBE t` -> equivalent SQLite queries
 *
 * This is an emulation, not a full MySQL server: stored procedures, MySQL-only
 * functions (JSON_*, GROUP_CONCAT with SEPARATOR), and some edge cases will not
 * behave exactly like MySQL. Users who need 100% fidelity should connect a real
 * MySQL server.
 */
export class MysqlEmulationEngine extends SqliteEngine {
  readonly id: EngineId = "mysql";
  readonly label = "MySQL (emulated)";

  async exec(sql: string): Promise<QueryResult[]> {
    return super.exec(translateMysql(sql));
  }

  async loadScript(sql: string): Promise<void> {
    return super.loadScript(translateMysql(sql));
  }
}

/**
 * Preprocess a MySQL script to SQLite-compatible SQL. Best-effort, string-based,
 * quote-aware. Not a full parser.
 */
export function translateMysql(input: string): string {
  const parts = tokenize(input);
  let out = "";
  for (const p of parts) {
    if (p.kind === "code") {
      out += transformCode(p.value);
    } else {
      out += p.value; // strings/comments preserved verbatim
    }
  }
  return out;
}

interface Token {
  kind: "code" | "string" | "comment";
  value: string;
}

/** Split into runs of code, string literals, and comments so transforms don't touch string bodies. */
function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let buf = "";
  let i = 0;
  const flushCode = () => {
    if (buf) {
      tokens.push({ kind: "code", value: buf });
      buf = "";
    }
  };
  while (i < sql.length) {
    const ch = sql[i];
    const nx = sql[i + 1];
    // -- line comment
    if (ch === "-" && nx === "-") {
      flushCode();
      let j = i;
      while (j < sql.length && sql[j] !== "\n") j++;
      tokens.push({ kind: "comment", value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // # line comment (MySQL) → convert to `-- `
    if (ch === "#") {
      flushCode();
      let j = i + 1;
      while (j < sql.length && sql[j] !== "\n") j++;
      tokens.push({ kind: "comment", value: "-- " + sql.slice(i + 1, j) });
      i = j;
      continue;
    }
    // /* block comment */
    if (ch === "/" && nx === "*") {
      flushCode();
      let j = i + 2;
      while (j < sql.length - 1 && !(sql[j] === "*" && sql[j + 1] === "/")) j++;
      j = Math.min(j + 2, sql.length);
      tokens.push({ kind: "comment", value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // 'string' with '' or \' escapes
    if (ch === "'") {
      flushCode();
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "\\" && j + 1 < sql.length) {
          j += 2;
          continue;
        }
        if (sql[j] === "'" && sql[j + 1] === "'") {
          j += 2;
          continue;
        }
        if (sql[j] === "'") {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ kind: "string", value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // "string" — in MySQL these can be identifiers or string literals depending on mode.
    // We leave them as code and let the identifier logic apply.
    buf += ch;
    i++;
  }
  if (buf) tokens.push({ kind: "code", value: buf });
  return tokens;
}

function transformCode(code: string): string {
  let s = code;

  // Backticked identifiers → double-quoted
  s = s.replace(/`([^`]*)`/g, (_m, name: string) => `"${name.replace(/"/g, '""')}"`);

  // Line-level: strip statements SQLite can't run
  s = s.replace(/^\s*USE\s+[^;]+;?/gim, "");
  s = s.replace(/^\s*SET\s+[^;]+;?/gim, "");
  s = s.replace(/^\s*SHOW\s+WARNINGS\s*;?/gim, "");
  s = s.replace(/^\s*START\s+TRANSACTION\s*;?/gim, "BEGIN;");
  s = s.replace(/^\s*LOCK\s+TABLES[^;]*;?/gim, "");
  s = s.replace(/^\s*UNLOCK\s+TABLES\s*;?/gim, "");
  s = s.replace(/^\s*DELIMITER\s+\S+/gim, "");

  // SHOW TABLES / SHOW DATABASES / DESCRIBE
  s = s.replace(/\bSHOW\s+TABLES\b/gi, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  s = s.replace(/\bSHOW\s+DATABASES\b/gi, "SELECT 'main' AS Database");
  s = s.replace(/\b(?:DESCRIBE|DESC)\s+([A-Za-z_][\w]*|"[^"]+")/gi, 'PRAGMA table_info($1)');

  // CREATE TABLE ... ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=... COMMENT='...';
  // Strip everything from the trailing `)` to the `;` if it looks like table options.
  s = s.replace(
    /\)\s*((?:ENGINE|DEFAULT\s+CHARSET|CHARSET|COLLATE|AUTO_INCREMENT|ROW_FORMAT|COMMENT|PACK_KEYS|DELAY_KEY_WRITE|STATS_PERSISTENT|CHECKSUM|CONNECTION)\b[\s\S]*?)(?=;|$)/gi,
    ")",
  );

  // Column-level `COMMENT 'x'`
  s = s.replace(/\bCOMMENT\s+'(?:[^'\\]|\\.|'')*'/gi, "");

  // ON UPDATE CURRENT_TIMESTAMP (column clause) → drop (SQLite doesn't support it)
  s = s.replace(/\bON\s+UPDATE\s+CURRENT_TIMESTAMP(?:\(\))?/gi, "");

  // AUTO_INCREMENT → AUTOINCREMENT (SQLite requires INTEGER PRIMARY KEY AUTOINCREMENT)
  s = s.replace(/\bAUTO_INCREMENT\b/gi, "AUTOINCREMENT");
  // MySQL allows `INT AUTO_INCREMENT PRIMARY KEY`; SQLite requires the
  // AUTOINCREMENT keyword to come AFTER `PRIMARY KEY`. Normalize both orders.
  s = s.replace(/\bAUTOINCREMENT\s+PRIMARY\s+KEY\b/gi, "PRIMARY KEY AUTOINCREMENT");

  // UNSIGNED / ZEROFILL → drop
  s = s.replace(/\b(UNSIGNED|ZEROFILL)\b/gi, "");

  // Numeric type mapping (with optional length)
  s = s.replace(/\b(?:INTEGER|TINYINT|SMALLINT|MEDIUMINT|BIGINT|INT|BIT)(?![A-Z0-9_])(?:\s*\(\s*\d+\s*(?:,\s*\d+\s*)?\))?/gi, "INTEGER");
  s = s.replace(/\b(?:DOUBLE(?:\s+PRECISION)?|FLOAT|REAL|DECIMAL|NUMERIC|DEC|FIXED)(?![A-Z0-9_])(?:\s*\(\s*\d+\s*(?:,\s*\d+\s*)?\))?/gi, "REAL");

  // Text type mapping
  s = s.replace(/\b(?:VARCHAR|CHAR|CHARACTER|NVARCHAR|NCHAR|VARBINARY|BINARY|BLOB|TINYBLOB|MEDIUMBLOB|LONGBLOB|TINYTEXT|MEDIUMTEXT|LONGTEXT|TEXT|ENUM|SET)(?![A-Z0-9_])(?:\s*\([^)]*\))?/gi, "TEXT");

  // Date/time → TEXT (SQLite stores as ISO strings)
  s = s.replace(/\b(?:DATETIME|TIMESTAMP|DATE|TIME|YEAR)\s*(?:\(\s*\d+\s*\))?/gi, "TEXT");

  // JSON → TEXT
  s = s.replace(/\bJSON\b/gi, "TEXT");

  // DEFAULT CURRENT_TIMESTAMP → DEFAULT CURRENT_TIMESTAMP (already OK) — no-op

  // Function mappings
  s = s.replace(/\bIFNULL\s*\(/gi, "COALESCE(");
  s = s.replace(/\bNOW\s*\(\s*\)/gi, "CURRENT_TIMESTAMP");
  s = s.replace(/\bCURDATE\s*\(\s*\)/gi, "DATE('now')");
  s = s.replace(/\bCURTIME\s*\(\s*\)/gi, "TIME('now')");
  s = s.replace(/\bUNIX_TIMESTAMP\s*\(\s*\)/gi, "strftime('%s','now')");
  s = s.replace(/\bRAND\s*\(\s*\)/gi, "(abs(random()) / 9223372036854775807.0)");

  // CONCAT(a, b, c) → (a || b || c). Handles nested parens best-effort.
  s = s.replace(/\bCONCAT\s*\(([\s\S]*?)\)/gi, (_m, inner) => {
    // Split top-level commas only.
    const parts: string[] = [];
    let depth = 0;
    let cur = "";
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      if (c === "," && depth === 0) {
        parts.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    if (cur) parts.push(cur);
    return "(" + parts.map((p) => p.trim()).join(" || ") + ")";
  });

  // LIMIT offset, count → LIMIT count OFFSET offset
  s = s.replace(/\bLIMIT\s+(\d+)\s*,\s*(\d+)/gi, "LIMIT $2 OFFSET $1");

  // Collapse extra whitespace introduced by strips
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  return s;
}
