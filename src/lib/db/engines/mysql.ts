import { SqliteEngine } from "./sqlite";
import type { EngineId, QueryResult } from "@/types/workbench";
import { buildMysqlDiagnostic, encodeDiagnostic } from "./mysql-diagnostics";

/**
 * In-browser MySQL emulation.
 *
 * Runs a real SQLite (sql.js) engine under the hood and preprocesses MySQL
 * dialect into SQLite before every exec/loadScript. See translateMysql() for
 * the full list of rewrites. When SQLite rejects a translated statement the
 * engine attaches a structured diagnostic (original SQL, translated SQL,
 * reason, suggestion) via encodeDiagnostic so the UI can render it.
 */
export class MysqlEmulationEngine extends SqliteEngine {
  readonly id: EngineId = "mysql";
  readonly label = "MySQL (emulated)";

  async init(): Promise<void> {
    await super.init();
    this.registerRegexp();
  }

  async reset(): Promise<void> {
    await super.reset();
    this.registerRegexp();
  }

  /**
   * Register a `regexp(pattern, value)` SQL function so `col REGEXP pat` and
   * `col NOT REGEXP pat` work under the emulator. SQLite's grammar recognises
   * REGEXP as a two-argument function call — we bind it to JS RegExp with
   * pattern caching for hot loops. Matches MySQL's default POSIX-ERE flavour
   * closely enough for the vast majority of interview-style patterns.
   */
  private registerRegexp() {
    const db = (this as unknown as { db: import("sql.js").Database | null }).db;
    if (!db) return;
    const cache = new Map<string, RegExp | null>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).create_function("regexp", (pattern: string, value: unknown) => {
      if (value == null || pattern == null) return 0;
      let re = cache.get(pattern);
      if (re === undefined) {
        try {
          re = new RegExp(pattern);
        } catch {
          re = null;
        }
        cache.set(pattern, re);
      }
      if (!re) return 0;
      return re.test(String(value)) ? 1 : 0;
    });
  }

  async exec(sql: string): Promise<QueryResult[]> {
    const statements = splitTopLevel(sql);
    const results: QueryResult[] = [];
    for (const stmt of statements) {
      if (!stmt.trim()) continue;
      const translated = translateMysql(stmt);
      try {
        const r = await super.exec(translated);
        for (const one of r) results.push(one);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const diag = buildMysqlDiagnostic(stmt.trim(), translated.trim(), msg);
        throw new Error(encodeDiagnostic(diag) + msg);
      }
    }
    return results;
  }

  async loadScript(sql: string): Promise<void> {
    return super.loadScript(translateMysql(sql));
  }
}


/** Minimal statement splitter that is quote-aware; keeps semicolons out of strings. */
function splitTopLevel(sql: string): string[] {
  const out: string[] = [];
  let cur = "";
  let s = false;
  let d = false;
  let b = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (!d && !b && c === "'" && sql[i - 1] !== "\\") s = !s;
    else if (!s && !b && c === '"' && sql[i - 1] !== "\\") d = !d;
    else if (!s && !d && c === "`") b = !b;
    if (c === ";" && !s && !d && !b) {
      out.push(cur + ";");
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/**
 * Preprocess a MySQL script to SQLite-compatible SQL. Best-effort, string-based,
 * quote-aware. Not a full parser.
 */
export function translateMysql(input: string): string {
  const parts = tokenize(input);
  const transformed: Token[] = parts.map((p) =>
    p.kind === "code" ? { kind: "code", value: transformCode(p.value) } : p,
  );
  // MySQL LIKE uses backslash as the default escape character; SQLite has no
  // default escape. Append `ESCAPE '\'` to any LIKE/NOT LIKE whose pattern
  // literal contains a backslash and that doesn't already carry an ESCAPE
  // clause, so \%, \_, and \\ behave as literals — matching MySQL semantics.
  for (let i = 0; i < transformed.length; i++) {
    const tok = transformed[i];
    if (tok.kind !== "string") continue;
    const prev = transformed[i - 1];
    if (!prev || prev.kind !== "code") continue;
    if (!/\b(?:NOT\s+)?LIKE\s*$/i.test(prev.value)) continue;
    if (!/\\/.test(tok.value)) continue;
    const next = transformed[i + 1];
    if (next && next.kind === "code" && /^\s*ESCAPE\b/i.test(next.value)) continue;
    transformed.splice(i + 1, 0, { kind: "code", value: " ESCAPE '\\'" });
    i++;
  }
  return rewriteConcat(transformed.map((t) => t.value).join(""));
}

/**
 * Rewrite `CONCAT(a, b, ...)` → `(a || b || ...)` on the fully re-joined SQL
 * so arguments that contain string literals (which the tokenizer split out of
 * the code stream) are handled correctly. Quote/paren-aware; only splits on
 * top-level commas.
 */
function rewriteConcat(sql: string): string {
  const out: string[] = [];
  let i = 0;
  const re = /\bCONCAT\s*\(/gi;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(sql)) !== null) {
    const start = m.index;
    // Skip matches inside strings/comments by scanning from `last` to `start`.
    if (insideStringOrComment(sql, start)) continue;
    const openParen = m.index + m[0].length - 1;
    // Find matching close paren.
    let depth = 1;
    let j = openParen + 1;
    let s = false, d = false;
    for (; j < sql.length && depth > 0; j++) {
      const c = sql[j];
      const p = sql[j - 1];
      if (!d && c === "'" && p !== "\\") s = !s;
      else if (!s && c === '"' && p !== "\\") d = !d;
      else if (!s && !d) {
        if (c === "(") depth++;
        else if (c === ")") depth--;
      }
    }
    if (depth !== 0) continue;
    const inner = sql.slice(openParen + 1, j - 1);
    // Split top-level commas.
    const parts: string[] = [];
    let cur = "";
    let pd = 0, ps = false, pdq = false;
    for (let k = 0; k < inner.length; k++) {
      const c = inner[k];
      const p = inner[k - 1];
      if (!pdq && c === "'" && p !== "\\") ps = !ps;
      else if (!ps && c === '"' && p !== "\\") pdq = !pdq;
      else if (!ps && !pdq) {
        if (c === "(") pd++;
        else if (c === ")") pd--;
      }
      if (c === "," && pd === 0 && !ps && !pdq) {
        parts.push(cur);
        cur = "";
      } else cur += c;
    }
    if (cur.length) parts.push(cur);
    out.push(sql.slice(last, start));
    out.push("(" + parts.map((p) => p.trim()).join(" || ") + ")");
    last = j;
    re.lastIndex = j;
  }
  out.push(sql.slice(last));
  return out.join("");
}

/** Cheap check: is `pos` inside a '…' string or /* … *​/ / -- comment? */
function insideStringOrComment(sql: string, pos: number): boolean {
  let s = false;
  for (let i = 0; i < pos; i++) {
    const c = sql[i];
    if (c === "'" && sql[i - 1] !== "\\") s = !s;
    if (!s && c === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      if (nl === -1 || nl >= pos) return true;
      i = nl;
    }
    if (!s && c === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      if (end === -1 || end >= pos) return true;
      i = end + 1;
    }
  }
  return s;
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
  // Only rewrite DESCRIBE (full keyword) or DESC when it clearly precedes a table name
  // at statement start. Never touch DESC used inside ORDER BY.
  s = s.replace(/(^|;)\s*DESCRIBE\s+([A-Za-z_][\w]*|"[^"]+")/gi, '$1 PRAGMA table_info($2)');
  s = s.replace(/(^|;)\s*DESC\s+([A-Za-z_][\w]*|"[^"]+")\s*(?=;|$)/gi, '$1 PRAGMA table_info($2)');

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
  // RLIKE is a MySQL alias for REGEXP. Normalise so the SQLite REGEXP hook fires.
  s = s.replace(/\bNOT\s+RLIKE\b/gi, "NOT REGEXP");
  s = s.replace(/\bRLIKE\b/gi, "REGEXP");
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

  // NULLS FIRST / NULLS LAST is not MySQL syntax, but is commonly written by
  // portability-minded users. Translate it into an equivalent (expr IS NULL)
  // sort prefix so behaviour is deterministic and matches MySQL's own
  // default NULL ordering (ASC → NULLs first, DESC → NULLs last) when the
  // NULLS clause is redundant, and overrides it correctly when it isn't.
  // Match with explicit direction first (ASC|DESC NULLS ...), then bare.
  s = s.replace(
    /(`[^`]+`|"[^"]+"|[A-Za-z_][\w.]*)\s+(ASC|DESC)\s+NULLS\s+(FIRST|LAST)\b/gi,
    (_m, term: string, dir: string, pos: string) => {
      const nullDir = pos.toUpperCase() === "FIRST" ? "DESC" : "ASC";
      return `(${term}) IS NULL ${nullDir}, ${term} ${dir}`;
    },
  );
  s = s.replace(
    /(`[^`]+`|"[^"]+"|[A-Za-z_][\w.]*)\s+NULLS\s+(FIRST|LAST)\b/gi,
    (_m, term: string, pos: string) => {
      const nullDir = pos.toUpperCase() === "FIRST" ? "DESC" : "ASC";
      return `(${term}) IS NULL ${nullDir}, ${term}`;
    },
  );

  // INSERT IGNORE INTO → INSERT OR IGNORE INTO (SQLite equivalent).
  s = s.replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, "INSERT OR IGNORE INTO");
  // INSERT ... ON DUPLICATE KEY UPDATE col = VALUES(col), ...  →
  //   INSERT ... ON CONFLICT DO UPDATE SET col = excluded.col, ...
  s = s.replace(
    /\bON\s+DUPLICATE\s+KEY\s+UPDATE\b([\s\S]*?)(?=;|$)/gi,
    (_m, assigns: string) => {
      const rewritten = assigns.replace(
        /\bVALUES\s*\(\s*([A-Za-z_][\w]*|"[^"]+")\s*\)/gi,
        (_v, col: string) => `excluded.${col}`,
      );
      return `ON CONFLICT DO UPDATE SET${rewritten}`;
    },
  );

  // Collapse extra whitespace introduced by strips
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  return s;
}
