import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin server functions. Every function verifies the caller has the `admin`
 * role via has_role() before touching data or the Auth Admin API, and writes
 * an audit_log entry for every mutation.
 *
 * Server-only imports (supabaseAdmin, audit helper) are loaded lazily inside
 * the .handler() body so this module stays client-reachable-safe.
 */

async function assertAdmin(context: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

// ---------- Overview / analytics ----------

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profiles, tabs, snippets, history, shares, audit, recent] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("workbench_tabs").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("workbench_snippets").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("workbench_history").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("shared_queries").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("audit_log").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("workbench_history")
        .select("engine,status,executed_at,duration_ms")
        .order("executed_at", { ascending: false })
        .limit(500),
    ]);

    const rows = recent.data ?? [];
    const byEngine: Record<string, number> = {};
    let ok = 0;
    let err = 0;
    let totalMs = 0;
    for (const r of rows as { engine: string; status: string; duration_ms: number }[]) {
      byEngine[r.engine] = (byEngine[r.engine] ?? 0) + 1;
      if (r.status === "ok" || r.status === "success") ok++;
      else err++;
      totalMs += r.duration_ms ?? 0;
    }

    return {
      counts: {
        users: profiles.count ?? 0,
        tabs: tabs.count ?? 0,
        snippets: snippets.count ?? 0,
        historyRows: history.count ?? 0,
        shares: shares.count ?? 0,
        auditRows: audit.count ?? 0,
      },
      recent: {
        sampleSize: rows.length,
        byEngine,
        okCount: ok,
        errCount: err,
        errorRate: rows.length ? err / rows.length : 0,
        avgDurationMs: rows.length ? totalMs / rows.length : 0,
      },
    };
  });

// ---------- Users & roles ----------

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ page: z.number().int().min(1).default(1), perPage: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
      page: data.page,
      perPage: data.perPage,
    });
    if (error) throw new Error(error.message);

    const ids = users.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,display_name,avatar_url").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin.from("user_roles").select("user_id,role").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const rolesMap = new Map<string, string[]>();
    for (const r of (roles ?? []) as { user_id: string; role: string }[]) {
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesMap.set(r.user_id, arr);
    }

    return {
      users: users.users.map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        banned_until: (u as any).banned_until ?? null,
        display_name: (profileMap.get(u.id) as any)?.display_name ?? null,
        roles: rolesMap.get(u.id) ?? [],
      })),
      total: users.total ?? users.users.length,
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "moderator", "user"]),
        grant: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { writeAudit } = await import("@/lib/audit.server");
    const { getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");

    // Safety rail: don't let an admin drop their own admin role — prevents lockout.
    if (data.userId === context.userId && data.role === "admin" && !data.grant) {
      throw new Error("You cannot remove your own admin role.");
    }

    const { data: before } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);

    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }

    const { data: after } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);

    await writeAudit(supabaseAdmin, {
      actorId: context.userId,
      actorEmail: context.claims?.email ?? null,
      action: data.grant ? "role.grant" : "role.revoke",
      targetType: "user",
      targetId: data.userId,
      before: { roles: (before ?? []).map((r: any) => r.role) },
      after: { roles: (after ?? []).map((r: any) => r.role) },
      requestId: getRequestHeader("x-request-id") ?? null,
      ip: getRequestIP({ xForwardedFor: true }) ?? null,
      userAgent: getRequestHeader("user-agent") ?? null,
      metadata: { role: data.role },
    });

    return { ok: true };
  });

export const setUserBan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), ban: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot ban yourself.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { writeAudit } = await import("@/lib/audit.server");
    const { getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.ban ? "8760h" : "none",
    } as any);
    if (error) throw new Error(error.message);

    await writeAudit(supabaseAdmin, {
      actorId: context.userId,
      action: data.ban ? "user.ban" : "user.unban",
      targetType: "user",
      targetId: data.userId,
      requestId: getRequestHeader("x-request-id") ?? null,
      ip: getRequestIP({ xForwardedFor: true }) ?? null,
      userAgent: getRequestHeader("user-agent") ?? null,
    });
    return { ok: true };
  });

// ---------- Content moderation (shared queries) ----------

export const listSharedForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).default(100) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("shared_queries")
      .select("id,slug,title,description,engine,visibility,view_count,owner_id,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const moderateShared = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["make_private", "make_public", "delete"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { writeAudit } = await import("@/lib/audit.server");
    const { getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");

    const { data: before } = await supabaseAdmin
      .from("shared_queries")
      .select("id,slug,title,visibility,owner_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("Share not found");

    if (data.action === "delete") {
      const { error } = await supabaseAdmin.from("shared_queries").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const visibility = data.action === "make_public" ? "public" : "private";
      const { error } = await supabaseAdmin
        .from("shared_queries")
        .update({ visibility })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    }

    await writeAudit(supabaseAdmin, {
      actorId: context.userId,
      action: `share.${data.action}`,
      targetType: "shared_query",
      targetId: data.id,
      before,
      after: data.action === "delete" ? null : { ...before, visibility: data.action === "make_public" ? "public" : "private" },
      requestId: getRequestHeader("x-request-id") ?? null,
      ip: getRequestIP({ xForwardedFor: true }) ?? null,
      userAgent: getRequestHeader("user-agent") ?? null,
    });
    return { ok: true };
  });

// ---------- Audit log ----------

const auditFiltersSchema = z
  .object({
    limit: z.number().int().min(1).max(500).default(100),
    action: z.string().max(120).optional(),
    actorId: z.string().uuid().optional(),
    q: z.string().max(200).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .default({ limit: 100 });

function buildAuditQuery(client: any, f: z.infer<typeof auditFiltersSchema>, limit: number) {
  let q = client
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (f.action) q = q.ilike("action", `%${f.action}%`);
  if (f.actorId) q = q.eq("actor_id", f.actorId);
  if (f.from) q = q.gte("created_at", f.from);
  if (f.to) q = q.lte("created_at", f.to);
  if (f.q) {
    // Postgres OR filter across action, actor_email, target_type, target_id.
    const like = f.q.replace(/[%,]/g, "");
    q = q.or(
      `action.ilike.%${like}%,actor_email.ilike.%${like}%,target_type.ilike.%${like}%,target_id.ilike.%${like}%`,
    );
  }
  return q;
}

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => auditFiltersSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await buildAuditQuery(supabaseAdmin, data, data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const CSV_MAX_ROWS = 50_000;
function csvCell(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const exportAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    auditFiltersSchema.extend({ limit: z.number().int().min(1).max(CSV_MAX_ROWS).default(CSV_MAX_ROWS) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await buildAuditQuery(supabaseAdmin, data, data.limit);
    if (error) throw new Error(error.message);
    const columns = [
      "created_at",
      "action",
      "actor_id",
      "actor_email",
      "target_type",
      "target_id",
      "request_id",
      "ip",
      "user_agent",
      "before",
      "after",
      "metadata",
    ] as const;
    const header = columns.join(",");
    const body = (rows ?? [])
      .map((r: any) => columns.map((c) => csvCell(r[c])).join(","))
      .join("\n");
    return {
      csv: `${header}\n${body}`,
      rowCount: rows?.length ?? 0,
      truncated: (rows?.length ?? 0) >= data.limit,
    };
  });


// ---------- Self ----------

export const getMyAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data, userId: context.userId };
  });
