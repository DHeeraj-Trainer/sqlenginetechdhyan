/**
 * Live MySQL connection server functions.
 *
 * Connections are stored per authenticated user in `public.mysql_connections`.
 * Passwords are AES-256-GCM encrypted at rest via `MYSQL_CRED_KEY`. Every
 * function requires an authenticated session (`requireSupabaseAuth`).
 *
 * Runs on the Cloudflare Workers runtime with `nodejs_compat`. `mysql2` uses
 * `net.connect`, which workerd polyfills onto `cloudflare:sockets` — public
 * TCP + TLS MySQL hosts (RDS with public access, Aiven, DigitalOcean, etc.)
 * are reachable; VPC-only hosts are not.
 *
 * Per-invocation lifetime: Workers cannot hold sockets across invocations,
 * so each query opens a fresh connection and closes it on exit.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Client-safe types (re-exported so components can import them without
// pulling this module into the browser bundle).
export interface MysqlConnectionInput {
  label: string;
  host: string;
  port: number;
  username: string;
  password: string;
  databaseName: string;
  useTls: boolean;
}
export interface StoredMysqlConnection {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  databaseName: string;
  useTls: boolean;
  updatedAt: string;
}
export interface MysqlQueryResultDTO {
  columns: string[];
  rows: Array<Array<string | number | boolean | null>>;
  rowsAffected?: number;
  durationMs: number;
  statement: string;
}


const configSchema = z.object({
  label: z.string().trim().min(1).max(80),
  host: z.string().trim().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  username: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(512),
  databaseName: z.string().trim().min(1).max(128),
  useTls: z.boolean(),
});

const runSchema = z.object({
  sql: z.string().min(1).max(200_000),
  // Either a saved connection id, or an inline config with plaintext password
  // (used by the "Test connection" button before saving).
  connectionId: z.string().uuid().optional(),
  inlineConfig: configSchema.optional(),
});

const idSchema = z.object({ id: z.string().uuid() });

// -------------- helpers (server-only body) --------------------------------

async function openConnection(cfg: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  useTls: boolean;
}) {
  // Import mysql2 inside the handler so the client bundle never sees it.
  const mysql = await import("mysql2/promise");
  return mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ssl: cfg.useTls ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 15_000,
    // Workers can't reuse sockets across invocations, keep this short.
    enableKeepAlive: false,
    multipleStatements: true,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
}

function extractRowsAndColumns(rows: unknown, fields: unknown): { columns: string[]; rows: unknown[][]; rowsAffected?: number } {
  // mysql2 returns:
  //   SELECT-like: rows = array of row objects, fields = FieldPacket[]
  //   INSERT/UPDATE/DELETE/DDL: rows = OkPacket / ResultSetHeader (object with affectedRows)
  if (Array.isArray(rows) && Array.isArray(fields)) {
    const cols = (fields as Array<{ name: string }>).map((f) => f.name);
    const values = (rows as Array<Record<string, unknown>>).map((r) => cols.map((c) => r[c]));
    return { columns: cols, rows: values };
  }
  if (rows && typeof rows === "object" && "affectedRows" in (rows as Record<string, unknown>)) {
    const r = rows as { affectedRows: number };
    return { columns: [], rows: [], rowsAffected: r.affectedRows };
  }
  return { columns: [], rows: [] };
}

function splitStatements(sql: string): string[] {
  // Best-effort split: respect quotes, backticks, and line comments.
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let quote: string | null = null;
  while (i < sql.length) {
    const ch = sql[i];
    if (quote) {
      cur += ch;
      if (ch === "\\" && i + 1 < sql.length) { cur += sql[i + 1]; i += 2; continue; }
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; cur += ch; i++; continue; }
    if (ch === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") { cur += sql[i]; i++; }
      continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) { cur += sql[i]; i++; }
      if (i < sql.length) { cur += "*/"; i += 2; }
      continue;
    }
    if (ch === ";") {
      const stmt = cur.trim();
      if (stmt) out.push(stmt);
      cur = "";
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  const tail = cur.trim();
  if (tail) out.push(tail);
  return out;
}

// Loosely typed to avoid coupling this helper to the exact SupabaseClient
// generic. `context.supabase` at the call site is fully typed by the
// middleware — we only need query-shape access here.
type SupabaseLike = {
  from: (t: string) => {
    select: (cols: string) => {
      eq: (k: string, v: unknown) => {
        eq: (k: string, v: unknown) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
        };
      };
    };
  };
};

async function resolveConfig(
  supabase: SupabaseLike,
  userId: string,
  input: { connectionId?: string; inlineConfig?: MysqlConnectionInput },
) {
  if (input.inlineConfig) {
    return {
      host: input.inlineConfig.host,
      port: input.inlineConfig.port,
      user: input.inlineConfig.username,
      password: input.inlineConfig.password,
      database: input.inlineConfig.databaseName,
      useTls: input.inlineConfig.useTls,
    };
  }
  if (!input.connectionId) throw new Error("connectionId or inlineConfig required");
  const { data, error } = await supabase
    .from("mysql_connections")
    .select("host, port, username, database_name, use_tls, password_ciphertext")
    .eq("id", input.connectionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Connection not found");
  const { decryptPassword } = await import("./mysql-crypto.server");
  return {
    host: data.host as string,
    port: data.port as number,
    user: data.username as string,
    password: decryptPassword(data.password_ciphertext as string),
    database: data.database_name as string,
    useTls: data.use_tls as boolean,
  };
}

/** Coerce a mysql2 row cell to a JSON-serializable primitive. */
function toCell(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") return v;
  // Buffer -> hex string; Date -> ISO string (we use dateStrings:true, so
  // this is a fallback); anything else -> String().
  if (typeof (v as { toISOString?: () => string }).toISOString === "function") {
    return (v as { toISOString: () => string }).toISOString();
  }
  if (v instanceof Uint8Array) return Buffer.from(v).toString("hex");
  try { return JSON.stringify(v); } catch { return String(v); }
}


// -------------- server functions ------------------------------------------

export const listMysqlConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoredMysqlConnection[]> => {
    const { data, error } = await context.supabase
      .from("mysql_connections")
      .select("id, label, host, port, username, database_name, use_tls, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      label: r.label as string,
      host: r.host as string,
      port: r.port as number,
      username: r.username as string,
      databaseName: r.database_name as string,
      useTls: r.use_tls as boolean,
      updatedAt: r.updated_at as string,
    }));
  });

export const saveMysqlConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MysqlConnectionInput & { id?: string }) => {
    const parsed = configSchema.parse(input);
    return { ...parsed, id: (input as { id?: string }).id };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { encryptPassword } = await import("./mysql-crypto.server");
    const row = {
      user_id: context.userId,
      label: data.label,
      host: data.host,
      port: data.port,
      username: data.username,
      database_name: data.databaseName,
      use_tls: data.useTls,
      password_ciphertext: encryptPassword(data.password),
    };
    if (data.id) {
      const { data: up, error } = await context.supabase
        .from("mysql_connections")
        .update(row)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!up) throw new Error("Connection not found");
      return { id: up.id as string };
    }
    const { data: ins, error } = await context.supabase
      .from("mysql_connections")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id as string };
  });

export const deleteMysqlConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => idSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("mysql_connections")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testMysqlConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { connectionId?: string; inlineConfig?: MysqlConnectionInput }) =>
    z
      .object({ connectionId: z.string().uuid().optional(), inlineConfig: configSchema.optional() })
      .refine((v) => !!(v.connectionId || v.inlineConfig), { message: "connectionId or inlineConfig required" })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; serverVersion: string; database: string; latencyMs: number }> => {
    const cfg = await resolveConfig(context.supabase as unknown as SupabaseLike, context.userId, data);
    const started = Date.now();
    const conn = await openConnection(cfg);
    try {
      const [rows] = (await conn.query("SELECT VERSION() AS v, DATABASE() AS d")) as [
        Array<{ v: string; d: string }>,
        unknown,
      ];
      const r = rows[0];
      return {
        ok: true,
        serverVersion: String(r?.v ?? ""),
        database: String(r?.d ?? cfg.database),
        latencyMs: Date.now() - started,
      };
    } finally {
      await conn.end().catch(() => undefined);
    }
  });

export const runMysqlQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sql: string; connectionId?: string; inlineConfig?: MysqlConnectionInput }) =>
    runSchema.parse(input),
  )
  .handler(async ({ data, context }): Promise<{ results: MysqlQueryResultDTO[]; error: string | null }> => {
    const cfg = await resolveConfig(context.supabase as unknown as SupabaseLike, context.userId, data);
    const conn = await openConnection(cfg);
    const results: MysqlQueryResultDTO[] = [];
    try {
      // Run statements individually so we can time each one and return
      // per-statement result tabs, matching the in-browser engines.
      const statements = splitStatements(data.sql);
      for (const stmt of statements) {
        const start = Date.now();
        try {
          const [rows, fields] = await conn.query(stmt);
          const { columns, rows: values, rowsAffected } = extractRowsAndColumns(rows, fields);
          results.push({
            columns,
            rows: values.map((row) => row.map(toCell)),
            rowsAffected,
            durationMs: Date.now() - start,
            statement: stmt,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return { results, error: msg };
        }
      }
      return { results, error: null };
    } finally {
      await conn.end().catch(() => undefined);
    }
  });

export const listMysqlTables = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { connectionId: string }) => idSchema.parse({ id: input.connectionId }))
  .handler(async ({ data, context }): Promise<Array<{ name: string; columns: Array<{ name: string; type: string; notNull: boolean; pk: boolean }> }>> => {
    const cfg = await resolveConfig(context.supabase as unknown as SupabaseLike, context.userId, { connectionId: data.id });
    const conn = await openConnection(cfg);
    try {
      const [tblRows] = (await conn.query(
        "SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
        [cfg.database],
      )) as [Array<{ name: string }>, unknown];
      const [colRows] = (await conn.query(
        "SELECT TABLE_NAME AS t, COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable, COLUMN_KEY AS ck FROM information_schema.columns WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION",
        [cfg.database],
      )) as [Array<{ t: string; name: string; type: string; nullable: string; ck: string }>, unknown];
      const byTable = new Map<string, Array<{ name: string; type: string; notNull: boolean; pk: boolean }>>();
      for (const c of colRows) {
        const arr = byTable.get(c.t) ?? [];
        arr.push({ name: c.name, type: c.type, notNull: c.nullable === "NO", pk: c.ck === "PRI" });
        byTable.set(c.t, arr);
      }
      return tblRows.map((t) => ({ name: t.name, columns: byTable.get(t.name) ?? [] }));
    } finally {
      await conn.end().catch(() => undefined);
    }
  });
