/**
 * SQL Router / compatibility layer.
 *
 * Parses each incoming statement, classifies it, and either:
 *   - handles it internally (DCL, TCL, admin SHOW, SET AUTOCOMMIT), or
 *   - forwards it to the underlying SQL engine (DDL / DML / queries).
 *
 * Goal: give users a Workbench that *feels* like a real database — user /
 * role / privilege management, transaction control, autocommit — even
 * though the underlying engines (sql.js, PGlite, AlaSQL) do not support
 * those features natively. Unsupported statements are NEVER passed to the
 * engine as raw SQL — we return realistic messages instead of surfacing
 * `near "USER": syntax error`.
 */

import type { QueryResult, SqlEngine } from "@/types/workbench";

/* ------------------------------------------------------------------ */
/*  Statement splitter (quotes / comments aware)                      */
/* ------------------------------------------------------------------ */

export function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (!inSingle && !inDouble && !inBacktick && ch === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") cur += sql[i++];
      if (i < sql.length) cur += sql[i];
      continue;
    }
    if (!inSingle && !inDouble && !inBacktick && ch === "/" && next === "*") {
      cur += ch;
      i++;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) cur += sql[i++];
      if (i < sql.length) {
        cur += sql[i]; // *
        cur += sql[i + 1]; // /
        i++;
      }
      continue;
    }
    if (ch === "'" && !inDouble && !inBacktick) inSingle = !inSingle;
    else if (ch === '"' && !inSingle && !inBacktick) inDouble = !inDouble;
    else if (ch === "`" && !inSingle && !inDouble) inBacktick = !inBacktick;
    if (ch === ";" && !inSingle && !inDouble && !inBacktick) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/* ------------------------------------------------------------------ */
/*  Metadata catalog                                                   */
/* ------------------------------------------------------------------ */

interface UserRecord {
  username: string;
  password: string; // stored as-is (workbench simulation — no real auth)
  role: string;
  status: "active" | "locked";
  defaultSchema: string;
  createdAt: string;
}

interface RoleRecord {
  name: string;
  createdAt: string;
}

interface GrantRecord {
  privilege: string; // SELECT / INSERT / UPDATE / DELETE / ALL / ...
  object: string; // table / view name, or "*"
  grantee: string; // user or role
  grantedAt: string;
}

export interface RouterState {
  autocommit: boolean;
  currentUser: string;
  txDepth: number; // 0 = no active transaction
  savepoints: string[]; // stack of savepoint names
  users: Map<string, UserRecord>;
  roles: Map<string, RoleRecord>;
  grants: GrantRecord[];
}

function initialState(): RouterState {
  const now = new Date().toISOString();
  const users = new Map<string, UserRecord>();
  users.set("root", {
    username: "root",
    password: "",
    role: "DBA",
    status: "active",
    defaultSchema: "main",
    createdAt: now,
  });
  const roles = new Map<string, RoleRecord>();
  for (const r of ["DBA", "ADMIN", "USER", "READONLY"]) roles.set(r, { name: r, createdAt: now });
  return {
    autocommit: true,
    currentUser: "root",
    txDepth: 0,
    savepoints: [],
    users,
    roles,
    grants: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */

function stripLeadingComments(s: string): string {
  return s.replace(/^(?:\s*(?:--[^\n]*|\/\*[\s\S]*?\*\/))+/g, "").trimStart();
}

function ok(statement: string, message: string, extra?: Partial<QueryResult>): QueryResult {
  return {
    columns: ["result"],
    rows: [[message]],
    durationMs: 0,
    statement,
    ...extra,
  };
}

function grid(statement: string, columns: string[], rows: unknown[][]): QueryResult {
  return { columns, rows, durationMs: 0, statement };
}

function unquote(id: string): string {
  const t = id.trim();
  if (!t) return t;
  const f = t[0];
  if ((f === '"' || f === "'" || f === "`") && t.endsWith(f)) return t.slice(1, -1);
  return t;
}

/* ------------------------------------------------------------------ */
/*  Session                                                            */
/* ------------------------------------------------------------------ */

export type RouterListener = (state: Readonly<RouterState>) => void;

export class SqlSession {
  state: RouterState = initialState();
  private listeners = new Set<RouterListener>();

  subscribe(fn: RouterListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn(this.state);
  }

  snapshot(): Readonly<RouterState> {
    return this.state;
  }

  reset() {
    this.state = initialState();
    this.emit();
  }

  /**
   * Execute a (possibly multi-statement) SQL script against the given engine,
   * routing DCL / TCL / admin statements through the metadata layer.
   */
  async execute(
    sql: string,
    engine: SqlEngine,
  ): Promise<{ results: QueryResult[]; error: string | null; durationMs: number }> {
    const start = performance.now();
    const statements = splitStatements(sql);
    const results: QueryResult[] = [];
    for (const raw of statements) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const body = stripLeadingComments(trimmed);
      if (!body) continue;
      const handled = await this.tryHandle(trimmed, body, engine);
      if (handled === "forward") {
        try {
          await this.beforeForward(body, engine);
          const t0 = performance.now();
          const engineResults = await engine.exec(trimmed);
          const dur = performance.now() - t0;
          for (const r of engineResults) results.push({ ...r, durationMs: r.durationMs || dur });
        } catch (e) {
          return {
            results,
            error: friendlyError(e instanceof Error ? e.message : String(e), body),
            durationMs: performance.now() - start,
          };
        }
      } else if (handled) {
        for (const r of handled) results.push(r);
      }
    }
    this.emit();
    return { results, error: null, durationMs: performance.now() - start };
  }

  /**
   * If autocommit is OFF and this is a DML/DDL, open an implicit transaction
   * in the underlying engine (best-effort — engines that don't support
   * transactions silently ignore).
   */
  private async beforeForward(body: string, engine: SqlEngine) {
    if (!this.state.autocommit && this.state.txDepth === 0 && isMutating(body)) {
      try {
        await engine.exec("BEGIN");
        this.state.txDepth = 1;
      } catch {
        /* engine doesn't support it — proceed */
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Statement classification                                        */
  /* ---------------------------------------------------------------- */

  private async tryHandle(
    statement: string,
    body: string,
    engine: SqlEngine,
  ): Promise<QueryResult[] | "forward"> {
    const first = body.match(/^\s*(\w+)/i)?.[1]?.toUpperCase() ?? "";

    // SET AUTOCOMMIT / AUTOCOMMIT ON|OFF
    const acMatch = body.match(/^\s*(?:SET\s+)?AUTOCOMMIT\s*(?:=\s*)?(ON|OFF|1|0|TRUE|FALSE)\s*;?\s*$/i);
    if (acMatch) return [this.setAutocommit(statement, acMatch[1])];

    // Transaction control
    if (/^(BEGIN|START)\b/i.test(body) && /^(BEGIN(\s+TRANSACTION|\s+WORK)?|START\s+TRANSACTION)\s*;?\s*$/i.test(body.trim())) {
      return [await this.begin(statement, engine)];
    }
    if (/^COMMIT\b/i.test(body)) return [await this.commit(statement, engine)];
    if (/^ROLLBACK\s+TO\b/i.test(body)) {
      const m = body.match(/^ROLLBACK\s+TO\s+(?:SAVEPOINT\s+)?([`"']?)([A-Za-z_][A-Za-z0-9_]*)\1/i);
      return [await this.rollbackTo(statement, engine, m?.[2] ?? "")];
    }
    if (/^ROLLBACK\b/i.test(body)) return [await this.rollback(statement, engine)];
    if (/^SAVEPOINT\b/i.test(body)) {
      const m = body.match(/^SAVEPOINT\s+([`"']?)([A-Za-z_][A-Za-z0-9_]*)\1/i);
      return [await this.savepoint(statement, engine, m?.[2] ?? "")];
    }
    if (/^RELEASE\s+SAVEPOINT\b/i.test(body) || /^RELEASE\b/i.test(body)) {
      const m = body.match(/^RELEASE(?:\s+SAVEPOINT)?\s+([`"']?)([A-Za-z_][A-Za-z0-9_]*)\1/i);
      return [await this.releaseSavepoint(statement, engine, m?.[2] ?? "")];
    }

    // DCL — users
    if (first === "CREATE" && /^\s*CREATE\s+USER\b/i.test(body)) return [this.createUser(statement, body)];
    if (first === "DROP" && /^\s*DROP\s+USER\b/i.test(body)) return [this.dropUser(statement, body)];
    if (first === "ALTER" && /^\s*ALTER\s+USER\b/i.test(body)) return [this.alterUser(statement, body)];
    if (first === "RENAME" && /^\s*RENAME\s+USER\b/i.test(body)) return [this.renameUser(statement, body)];
    if (first === "SET" && /^\s*SET\s+PASSWORD\b/i.test(body)) return [this.setPassword(statement, body)];

    // DCL — roles
    if (first === "CREATE" && /^\s*CREATE\s+ROLE\b/i.test(body)) return [this.createRole(statement, body)];
    if (first === "DROP" && /^\s*DROP\s+ROLE\b/i.test(body)) return [this.dropRole(statement, body)];
    if (first === "ALTER" && /^\s*ALTER\s+ROLE\b/i.test(body)) return [this.alterRole(statement, body)];

    // DCL — grants
    if (first === "GRANT") return [this.grant(statement, body)];
    if (first === "REVOKE") return [this.revoke(statement, body)];

    // Session helpers
    if (/^\s*(LOGIN|CONNECT)\b/i.test(body)) return [this.login(statement, body)];
    if (/^\s*(LOGOUT|DISCONNECT)\b/i.test(body)) return [this.logout(statement)];
    if (/^\s*(SELECT\s+)?CURRENT[_\s]USER\s*\(?\s*\)?\s*;?\s*$/i.test(body))
      return [grid(statement, ["current_user"], [[this.state.currentUser]])];

    // Administrative SHOW
    if (first === "SHOW") {
      const shown = this.handleShow(statement, body);
      if (shown) return [shown];
    }

    return "forward";
  }

  /* ---------------------------------------------------------------- */
  /*  Autocommit + transactions                                       */
  /* ---------------------------------------------------------------- */

  private setAutocommit(statement: string, value: string): QueryResult {
    const on = /^(ON|1|TRUE)$/i.test(value);
    this.state.autocommit = on;
    return ok(statement, `AUTOCOMMIT = ${on ? "ON" : "OFF"}`);
  }

  private async begin(statement: string, engine: SqlEngine): Promise<QueryResult> {
    if (this.state.txDepth > 0) return ok(statement, "NOTICE: transaction already active");
    try {
      await engine.exec("BEGIN");
    } catch {
      /* ignore */
    }
    this.state.txDepth = 1;
    return ok(statement, "Transaction started.");
  }

  private async commit(statement: string, engine: SqlEngine): Promise<QueryResult> {
    if (this.state.txDepth === 0) return ok(statement, "NOTICE: no active transaction — COMMIT ignored.");
    try {
      await engine.exec("COMMIT");
    } catch {
      /* ignore */
    }
    this.state.txDepth = 0;
    this.state.savepoints = [];
    return ok(statement, "Commit complete.");
  }

  private async rollback(statement: string, engine: SqlEngine): Promise<QueryResult> {
    if (this.state.txDepth === 0) return ok(statement, "ERROR: No active transaction.");
    try {
      await engine.exec("ROLLBACK");
    } catch {
      /* ignore */
    }
    this.state.txDepth = 0;
    this.state.savepoints = [];
    return ok(statement, "Rollback complete.");
  }

  private async savepoint(statement: string, engine: SqlEngine, name: string): Promise<QueryResult> {
    if (!name) return ok(statement, "ERROR: SAVEPOINT requires a name.");
    if (this.state.txDepth === 0) {
      try {
        await engine.exec("BEGIN");
      } catch {
        /* ignore */
      }
      this.state.txDepth = 1;
    }
    try {
      await engine.exec(`SAVEPOINT ${name}`);
    } catch {
      /* ignore */
    }
    this.state.savepoints.push(name);
    return ok(statement, `Savepoint '${name}' created.`);
  }

  private async releaseSavepoint(statement: string, engine: SqlEngine, name: string): Promise<QueryResult> {
    const idx = this.state.savepoints.lastIndexOf(name);
    if (idx === -1) return ok(statement, `ERROR: Savepoint '${name}' does not exist.`);
    try {
      await engine.exec(`RELEASE SAVEPOINT ${name}`);
    } catch {
      /* ignore */
    }
    this.state.savepoints.splice(idx, 1);
    return ok(statement, `Savepoint '${name}' released.`);
  }

  private async rollbackTo(statement: string, engine: SqlEngine, name: string): Promise<QueryResult> {
    const idx = this.state.savepoints.lastIndexOf(name);
    if (idx === -1) return ok(statement, `ERROR: Savepoint '${name}' does not exist.`);
    try {
      await engine.exec(`ROLLBACK TO SAVEPOINT ${name}`);
    } catch {
      /* ignore */
    }
    this.state.savepoints = this.state.savepoints.slice(0, idx + 1);
    return ok(statement, `Rolled back to savepoint '${name}'.`);
  }

  /* ---------------------------------------------------------------- */
  /*  Users                                                            */
  /* ---------------------------------------------------------------- */

  private createUser(statement: string, body: string): QueryResult {
    // CREATE USER [IF NOT EXISTS] name [IDENTIFIED BY 'pw'] [WITH PASSWORD 'pw']
    const m = body.match(
      /^\s*CREATE\s+USER\s+(IF\s+NOT\s+EXISTS\s+)?([`"']?)([A-Za-z_][A-Za-z0-9_]*)\2(?:\s+(?:IDENTIFIED\s+BY|WITH\s+PASSWORD|PASSWORD)\s+'([^']*)')?/i,
    );
    if (!m) return ok(statement, "ERROR: Could not parse CREATE USER statement.");
    const [, ifNot, , name, pw] = m;
    if (this.state.users.has(name)) {
      if (ifNot) return ok(statement, `User '${name}' already exists.`);
      return ok(statement, `ERROR: User '${name}' already exists.`);
    }
    this.state.users.set(name, {
      username: name,
      password: pw ?? "",
      role: "USER",
      status: "active",
      defaultSchema: "main",
      createdAt: new Date().toISOString(),
    });
    return ok(statement, `Query OK. 1 user created ('${name}').`);
  }

  private dropUser(statement: string, body: string): QueryResult {
    const m = body.match(/^\s*DROP\s+USER\s+(IF\s+EXISTS\s+)?([`"']?)([A-Za-z_][A-Za-z0-9_]*)\2/i);
    if (!m) return ok(statement, "ERROR: Could not parse DROP USER statement.");
    const [, ifExists, , name] = m;
    if (!this.state.users.has(name)) {
      if (ifExists) return ok(statement, `User '${name}' does not exist.`);
      return ok(statement, `ERROR: User '${name}' does not exist.`);
    }
    if (name === "root") return ok(statement, "ERROR: Cannot drop the 'root' user.");
    this.state.users.delete(name);
    this.state.grants = this.state.grants.filter((g) => g.grantee !== name);
    return ok(statement, `Query OK. 1 user dropped ('${name}').`);
  }

  private alterUser(statement: string, body: string): QueryResult {
    const m = body.match(
      /^\s*ALTER\s+USER\s+([`"']?)([A-Za-z_][A-Za-z0-9_]*)\1(?:\s+(?:IDENTIFIED\s+BY|WITH\s+PASSWORD|PASSWORD)\s+'([^']*)')?(?:\s+ACCOUNT\s+(LOCK|UNLOCK))?/i,
    );
    if (!m) return ok(statement, "ERROR: Could not parse ALTER USER statement.");
    const [, , name, pw, lock] = m;
    const u = this.state.users.get(name);
    if (!u) return ok(statement, `ERROR: User '${name}' does not exist.`);
    if (pw !== undefined) u.password = pw;
    if (lock) u.status = lock.toUpperCase() === "LOCK" ? "locked" : "active";
    return ok(statement, `Query OK. User '${name}' altered.`);
  }

  private renameUser(statement: string, body: string): QueryResult {
    const m = body.match(
      /^\s*RENAME\s+USER\s+([`"']?)([A-Za-z_][A-Za-z0-9_]*)\1\s+TO\s+([`"']?)([A-Za-z_][A-Za-z0-9_]*)\3/i,
    );
    if (!m) return ok(statement, "ERROR: Could not parse RENAME USER statement.");
    const [, , from, , to] = m;
    const u = this.state.users.get(from);
    if (!u) return ok(statement, `ERROR: User '${from}' does not exist.`);
    if (this.state.users.has(to)) return ok(statement, `ERROR: User '${to}' already exists.`);
    this.state.users.delete(from);
    u.username = to;
    this.state.users.set(to, u);
    for (const g of this.state.grants) if (g.grantee === from) g.grantee = to;
    return ok(statement, `Query OK. User renamed '${from}' → '${to}'.`);
  }

  private setPassword(statement: string, body: string): QueryResult {
    // SET PASSWORD [FOR user] = 'pw'  |  SET PASSWORD FOR user = PASSWORD('pw')
    const m = body.match(
      /^\s*SET\s+PASSWORD(?:\s+FOR\s+([`"']?)([A-Za-z_][A-Za-z0-9_]*)\1)?\s*=\s*(?:PASSWORD\s*\(\s*'([^']*)'\s*\)|'([^']*)')/i,
    );
    if (!m) return ok(statement, "ERROR: Could not parse SET PASSWORD statement.");
    const target = m[2] ?? this.state.currentUser;
    const pw = m[3] ?? m[4] ?? "";
    const u = this.state.users.get(target);
    if (!u) return ok(statement, `ERROR: User '${target}' does not exist.`);
    u.password = pw;
    return ok(statement, `Password updated for '${target}'.`);
  }

  /* ---------------------------------------------------------------- */
  /*  Roles                                                            */
  /* ---------------------------------------------------------------- */

  private createRole(statement: string, body: string): QueryResult {
    const m = body.match(/^\s*CREATE\s+ROLE\s+(IF\s+NOT\s+EXISTS\s+)?([`"']?)([A-Za-z_][A-Za-z0-9_]*)\2/i);
    if (!m) return ok(statement, "ERROR: Could not parse CREATE ROLE statement.");
    const [, ifNot, , name] = m;
    if (this.state.roles.has(name)) {
      if (ifNot) return ok(statement, `Role '${name}' already exists.`);
      return ok(statement, `ERROR: Role '${name}' already exists.`);
    }
    this.state.roles.set(name, { name, createdAt: new Date().toISOString() });
    return ok(statement, `Query OK. 1 role created ('${name}').`);
  }

  private dropRole(statement: string, body: string): QueryResult {
    const m = body.match(/^\s*DROP\s+ROLE\s+(IF\s+EXISTS\s+)?([`"']?)([A-Za-z_][A-Za-z0-9_]*)\2/i);
    if (!m) return ok(statement, "ERROR: Could not parse DROP ROLE statement.");
    const [, ifExists, , name] = m;
    if (!this.state.roles.has(name)) {
      if (ifExists) return ok(statement, `Role '${name}' does not exist.`);
      return ok(statement, `ERROR: Role '${name}' does not exist.`);
    }
    this.state.roles.delete(name);
    this.state.grants = this.state.grants.filter((g) => g.grantee !== name);
    return ok(statement, `Query OK. 1 role dropped ('${name}').`);
  }

  private alterRole(statement: string, body: string): QueryResult {
    const m = body.match(/^\s*ALTER\s+ROLE\s+([`"']?)([A-Za-z_][A-Za-z0-9_]*)\1/i);
    if (!m) return ok(statement, "ERROR: Could not parse ALTER ROLE statement.");
    const name = m[2];
    if (!this.state.roles.has(name)) return ok(statement, `ERROR: Role '${name}' does not exist.`);
    return ok(statement, `Query OK. Role '${name}' altered.`);
  }

  /* ---------------------------------------------------------------- */
  /*  Grants                                                           */
  /* ---------------------------------------------------------------- */

  private grant(statement: string, body: string): QueryResult {
    // GRANT priv[,priv] ON object TO grantee[,grantee]
    // GRANT ROLE r TO user
    const roleMatch = body.match(
      /^\s*GRANT\s+(?:ROLE\s+)?([`"']?)([A-Za-z_][A-Za-z0-9_]*)\1\s+TO\s+([`"']?)([A-Za-z_][A-Za-z0-9_]*)\3\s*;?\s*$/i,
    );
    if (roleMatch && this.state.roles.has(roleMatch[2])) {
      const role = roleMatch[2];
      const grantee = roleMatch[4];
      const u = this.state.users.get(grantee);
      if (u) u.role = role;
      this.state.grants.push({
        privilege: `ROLE ${role}`,
        object: "*",
        grantee,
        grantedAt: new Date().toISOString(),
      });
      return ok(statement, `Granted role '${role}' to '${grantee}'.`);
    }

    const m = body.match(
      /^\s*GRANT\s+([A-Za-z_,\s]+?)\s+ON\s+([`"']?)([A-Za-z_][A-Za-z0-9_.*]*)\2\s+TO\s+(.+?)\s*;?\s*$/i,
    );
    if (!m) return ok(statement, "ERROR: Could not parse GRANT statement.");
    const privs = m[1]
      .split(",")
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);
    const object = m[3];
    const grantees = m[4]
      .split(",")
      .map((g) => unquote(g.trim()))
      .filter(Boolean);
    let count = 0;
    for (const grantee of grantees) {
      if (!this.state.users.has(grantee) && !this.state.roles.has(grantee)) continue;
      for (const p of privs) {
        this.state.grants.push({
          privilege: p,
          object,
          grantee,
          grantedAt: new Date().toISOString(),
        });
        count++;
      }
    }
    if (count === 0) return ok(statement, "ERROR: No matching users or roles for GRANT.");
    return ok(statement, `Query OK. ${count} privilege${count === 1 ? "" : "s"} granted.`);
  }

  private revoke(statement: string, body: string): QueryResult {
    const m = body.match(
      /^\s*REVOKE\s+([A-Za-z_,\s]+?)\s+ON\s+([`"']?)([A-Za-z_][A-Za-z0-9_.*]*)\2\s+FROM\s+(.+?)\s*;?\s*$/i,
    );
    if (!m) return ok(statement, "ERROR: Could not parse REVOKE statement.");
    const privs = m[1]
      .split(",")
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);
    const object = m[3];
    const grantees = m[4]
      .split(",")
      .map((g) => unquote(g.trim()))
      .filter(Boolean);
    const before = this.state.grants.length;
    this.state.grants = this.state.grants.filter(
      (g) => !(grantees.includes(g.grantee) && privs.includes(g.privilege) && g.object === object),
    );
    const removed = before - this.state.grants.length;
    return ok(statement, `Query OK. ${removed} privilege${removed === 1 ? "" : "s"} revoked.`);
  }

  /* ---------------------------------------------------------------- */
  /*  Session                                                          */
  /* ---------------------------------------------------------------- */

  private login(statement: string, body: string): QueryResult {
    const m = body.match(
      /^\s*(?:LOGIN|CONNECT)\s+(?:AS\s+)?([`"']?)([A-Za-z_][A-Za-z0-9_]*)\1(?:\s+(?:IDENTIFIED\s+BY|WITH\s+PASSWORD)\s+'([^']*)')?/i,
    );
    if (!m) return ok(statement, "ERROR: Usage: LOGIN AS <user> [IDENTIFIED BY '<pw>']");
    const name = m[2];
    const pw = m[3] ?? "";
    const u = this.state.users.get(name);
    if (!u) return ok(statement, `ERROR: User '${name}' does not exist.`);
    if (u.status === "locked") return ok(statement, `ERROR: Account '${name}' is locked.`);
    if (u.password && u.password !== pw) return ok(statement, `ERROR: Invalid password for '${name}'.`);
    this.state.currentUser = name;
    return ok(statement, `Logged in as '${name}'.`);
  }

  private logout(statement: string): QueryResult {
    const prev = this.state.currentUser;
    this.state.currentUser = "root";
    return ok(statement, `Logged out '${prev}'. Session now 'root'.`);
  }

  /* ---------------------------------------------------------------- */
  /*  SHOW                                                             */
  /* ---------------------------------------------------------------- */

  private handleShow(statement: string, body: string): QueryResult | null {
    const target = body.replace(/^\s*SHOW\s+/i, "").replace(/;?\s*$/, "").trim().toUpperCase();
    if (target === "USERS")
      return grid(
        statement,
        ["username", "role", "status", "default_schema", "created_at"],
        Array.from(this.state.users.values()).map((u) => [
          u.username,
          u.role,
          u.status,
          u.defaultSchema,
          u.createdAt,
        ]),
      );
    if (target === "ROLES")
      return grid(
        statement,
        ["role", "created_at"],
        Array.from(this.state.roles.values()).map((r) => [r.name, r.createdAt]),
      );
    if (target === "GRANTS" || target.startsWith("GRANTS FOR")) {
      const forMatch = body.match(/FOR\s+([`"']?)([A-Za-z_][A-Za-z0-9_]*)\1/i);
      const grantee = forMatch?.[2];
      const rows = this.state.grants
        .filter((g) => (grantee ? g.grantee === grantee : true))
        .map((g) => [g.grantee, g.privilege, g.object, g.grantedAt]);
      return grid(statement, ["grantee", "privilege", "object", "granted_at"], rows);
    }
    if (target === "CURRENT_USER" || target === "CURRENT USER")
      return grid(statement, ["current_user"], [[this.state.currentUser]]);
    if (target === "AUTOCOMMIT")
      return grid(statement, ["autocommit"], [[this.state.autocommit ? "ON" : "OFF"]]);
    if (target === "TRANSACTION" || target === "TRANSACTIONS")
      return grid(
        statement,
        ["depth", "savepoints"],
        [[this.state.txDepth, this.state.savepoints.join(", ")]],
      );
    // SHOW DATABASES / TABLES → let the engine handle via a fallback query if it can.
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function isMutating(body: string): boolean {
  return /^(INSERT|UPDATE|DELETE|MERGE|REPLACE|CREATE|DROP|ALTER|TRUNCATE)\b/i.test(body);
}

/**
 * Turn low-level engine parser errors into friendlier messages that hint at
 * the compatibility layer's coverage.
 */
function friendlyError(msg: string, body: string): string {
  if (/near\s+"USER"/i.test(msg) || /near\s+"ROLE"/i.test(msg)) {
    return "User and role management is handled by the SQL Workbench metadata engine. Try SHOW USERS or SHOW ROLES.";
  }
  if (/cannot\s+rollback.*no\s+transaction/i.test(msg)) {
    return "ERROR: No active transaction.";
  }
  if (/cannot\s+commit.*no\s+transaction/i.test(msg)) {
    return "NOTICE: No active transaction to commit.";
  }
  if (/near\s+"SET"/i.test(msg) && /AUTOCOMMIT/i.test(body)) {
    return "AUTOCOMMIT is handled by the SQL Workbench. Use: SET AUTOCOMMIT = ON|OFF.";
  }
  return msg;
}
