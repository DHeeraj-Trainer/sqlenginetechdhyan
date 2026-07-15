/**
 * MySQL emulation error diagnostics.
 *
 * Given an original MySQL statement, the SQLite-translated statement, and
 * the underlying sql.js error message, infer a human-readable reason for
 * the mismatch and a compatible-alternative suggestion.
 */

export interface MysqlDiagnostic {
  /** The SQL the user typed (unchanged). */
  original: string;
  /** What the emulator handed to the underlying SQLite engine. */
  translated: string;
  /** Raw error surfaced by sql.js. */
  message: string;
  /** Short explanation of why the mismatch happened. */
  reason: string;
  /** A concrete, copy-pasteable suggestion or workaround. */
  suggestion: string;
}

/** Marker used to smuggle a JSON diagnostic through error-string boundaries. */
export const MYSQL_DIAG_MARKER = "\u0001MYSQL_DIAG\u0001";

export function encodeDiagnostic(diag: MysqlDiagnostic): string {
  return MYSQL_DIAG_MARKER + JSON.stringify(diag) + MYSQL_DIAG_MARKER;
}

export function extractDiagnostic(text: string): MysqlDiagnostic | null {
  const start = text.indexOf(MYSQL_DIAG_MARKER);
  if (start === -1) return null;
  const end = text.indexOf(MYSQL_DIAG_MARKER, start + MYSQL_DIAG_MARKER.length);
  if (end === -1) return null;
  try {
    return JSON.parse(text.slice(start + MYSQL_DIAG_MARKER.length, end)) as MysqlDiagnostic;
  } catch {
    return null;
  }
}

interface Rule {
  test: (msg: string, original: string, translated: string) => boolean;
  reason: string;
  suggestion: string;
}

const RULES: Rule[] = [
  {
    test: (_m, o) => /\bJSON_(EXTRACT|OBJECT|ARRAY|VALUE|SET|REMOVE|CONTAINS|LENGTH|KEYS|UNQUOTE)\b/i.test(o),
    reason:
      "MySQL JSON_* functions are not implemented by the emulator. The translator passes them through unchanged, but SQLite doesn't know them.",
    suggestion:
      "Use SQLite's json1 functions: json_extract(col, '$.path'), json_object(...), json_array(...), or connect to a live MySQL server (Engine → Connect MySQL server…).",
  },
  {
    test: (_m, o) => /\bGROUP_CONCAT\s*\([^)]*\bSEPARATOR\b/i.test(o),
    reason:
      "GROUP_CONCAT(..., SEPARATOR '...') syntax isn't supported; SQLite uses a positional separator argument.",
    suggestion: "Rewrite as GROUP_CONCAT(expr, ', ') — SQLite accepts an optional second argument.",
  },
  {
    test: (_m, o) => /\bDATE_(ADD|SUB)\s*\(/i.test(o) || /\bINTERVAL\s+\d+\s+\w+/i.test(o),
    reason:
      "DATE_ADD / DATE_SUB / INTERVAL syntax isn't translated. SQLite uses date() and time() modifiers.",
    suggestion:
      "Use date('now', '+1 day') / datetime(col, '-7 days') / strftime('%Y-%m-%d', col, '+1 month').",
  },
  {
    test: (_m, o) => /\bSTR_TO_DATE\s*\(/i.test(o) || /\bDATE_FORMAT\s*\(/i.test(o),
    reason: "STR_TO_DATE / DATE_FORMAT are MySQL-specific formatters that don't map 1:1 to SQLite.",
    suggestion:
      "Use strftime('%Y-%m-%d %H:%M:%S', col) for formatting, and store dates as ISO-8601 strings.",
  },
  {
    test: (_m, o) => /\bON\s+DUPLICATE\s+KEY\s+UPDATE\b/i.test(o),
    reason: "ON DUPLICATE KEY UPDATE has no direct SQLite equivalent.",
    suggestion:
      "Use INSERT INTO … ON CONFLICT(col) DO UPDATE SET … (SQLite's UPSERT, available since 3.24).",
  },
  {
    test: (_m, o) => /\bREPLACE\s+INTO\b/i.test(o),
    reason: "REPLACE INTO parses in SQLite but has subtly different semantics (delete + insert) than MySQL.",
    suggestion:
      "Prefer INSERT INTO … ON CONFLICT(col) DO UPDATE SET … to make the intent explicit.",
  },
  {
    test: (_m, o) => /\bCREATE\s+(DEFINER\s*=|PROCEDURE|FUNCTION|TRIGGER|EVENT)\b/i.test(o),
    reason: "Stored routines (PROCEDURE / FUNCTION / EVENT / DEFINER=) aren't emulated.",
    suggestion:
      "Rewrite the logic in SQL statements executed from the client, or connect to a live MySQL server via Engine → Connect MySQL server….",
  },
  {
    test: (_m, o) => /\bLOCK\s+IN\s+SHARE\s+MODE\b/i.test(o) || /\bFOR\s+UPDATE\b/i.test(o),
    reason:
      "Row-level locking (FOR UPDATE / LOCK IN SHARE MODE) is a MySQL/InnoDB feature; SQLite uses file-level locking.",
    suggestion: "Drop the locking clause for the emulator, or connect to a live MySQL server.",
  },
  {
    test: (_m, o) => /\bMATCH\s*\([^)]+\)\s*AGAINST\s*\(/i.test(o),
    reason: "MATCH … AGAINST full-text search isn't emulated.",
    suggestion: "Use SQLite's FTS5 virtual tables, or run against a live MySQL server.",
  },
  {
    test: (m) => /no such function:\s*(\w+)/i.test(m),
    reason:
      "The MySQL function used isn't recognised by SQLite and hasn't been mapped by the emulator.",
    suggestion:
      "Check the MySQL Compatibility panel for supported functions, or rewrite using a SQLite equivalent (COALESCE, strftime, substr, printf, etc.).",
  },
  {
    test: (m, _o, t) => /near\s+"AUTOINCREMENT"/i.test(m) && /AUTOINCREMENT/i.test(t),
    reason:
      "SQLite requires AUTOINCREMENT to follow INTEGER PRIMARY KEY exactly. The translator normalises common orders but this column shape wasn't recognised.",
    suggestion: "Declare the column as: `id INTEGER PRIMARY KEY AUTOINCREMENT`.",
  },
  {
    test: (m) => /near\s+"USING"/i.test(m),
    reason: "MySQL index hints (USE INDEX / FORCE INDEX / IGNORE INDEX) aren't supported.",
    suggestion: "Remove the index hint — SQLite's planner will choose an index automatically.",
  },
  {
    test: (m) => /no such column/i.test(m),
    reason:
      "SQLite couldn't resolve a column name. Backtick-quoted names become double-quoted; a stray identifier may not match.",
    suggestion:
      "Verify the column name against the Tables sidebar. Case matters if the column was created quoted.",
  },
  {
    test: (m) => /no such table/i.test(m),
    reason: "SQLite couldn't find the referenced table. USE <db> is a no-op in the emulator — there is only one schema.",
    suggestion:
      "Load a sample dataset (Samples menu) or CREATE TABLE first. Cross-database references (db.table) aren't emulated.",
  },
  {
    test: (m) => /syntax error/i.test(m),
    reason:
      "SQLite's parser rejected the translated statement. The construct likely has no SQLite equivalent and wasn't rewritten.",
    suggestion:
      "Simplify the statement, or switch to a live MySQL connection (Engine → Connect MySQL server…) for full-fidelity execution.",
  },
];

export function diagnoseMysqlError(
  original: string,
  translated: string,
  message: string,
): { reason: string; suggestion: string } {
  for (const r of RULES) {
    if (r.test(message, original, translated)) {
      return { reason: r.reason, suggestion: r.suggestion };
    }
  }
  return {
    reason:
      "The MySQL statement was translated to SQLite but the underlying engine rejected it. This construct may not be covered by the emulator.",
    suggestion:
      "Compare the original and translated SQL below. If the divergence looks meaningful, check the MySQL Compatibility panel or run against a live MySQL server (Engine → Connect MySQL server…).",
  };
}

export function buildMysqlDiagnostic(
  original: string,
  translated: string,
  message: string,
): MysqlDiagnostic {
  const { reason, suggestion } = diagnoseMysqlError(original, translated, message);
  return { original, translated, message, reason, suggestion };
}
