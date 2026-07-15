import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EngineId } from "@/types/workbench";

/* ------------------------------------------------------------------ */
/*  Tabs                                                              */
/* ------------------------------------------------------------------ */

const upsertTabInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(120),
  sql: z.string().max(200_000),
  engine: z.enum(["sqlite", "postgres", "alasql", "mysql"]),
  sortOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(false),
});

export const listTabs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workbench_tabs")
      .select("id,title,sql,engine,sort_order,is_active,updated_at")
      .eq("user_id", context.userId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertTab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertTabInput.parse(d))
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      title: data.title,
      sql: data.sql,
      engine: data.engine,
      sort_order: data.sortOrder,
      is_active: data.isActive,
      ...(data.id ? { id: data.id } : {}),
    };
    const { data: saved, error } = await context.supabase
      .from("workbench_tabs")
      .upsert(row, { onConflict: "id" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return saved;
  });

export const deleteTab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workbench_tabs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/*  History                                                           */
/* ------------------------------------------------------------------ */

const historyInput = z.object({
  sql: z.string().max(200_000),
  engine: z.enum(["sqlite", "postgres", "alasql", "mysql"]),
  status: z.enum(["ok", "error"]),
  durationMs: z.number().int().nonnegative().default(0),
  errorMessage: z.string().optional(),
});

export const listHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workbench_history")
      .select("id,sql,engine,status,duration_ms,error_message,executed_at")
      .eq("user_id", context.userId)
      .order("executed_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const pushHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => historyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("workbench_history").insert({
      user_id: context.userId,
      sql: data.sql,
      engine: data.engine,
      status: data.status,
      duration_ms: data.durationMs,
      error_message: data.errorMessage ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("workbench_history")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/*  Snippets                                                          */
/* ------------------------------------------------------------------ */

const snippetInput = z.object({
  name: z.string().min(1).max(120),
  sql: z.string().max(200_000),
  engine: z.enum(["sqlite", "postgres", "alasql", "mysql"]),
  tags: z.array(z.string().max(40)).max(20).default([]),
});

export const listSnippets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workbench_snippets")
      .select("id,name,sql,engine,tags,created_at,updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveSnippet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => snippetInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("workbench_snippets")
      .insert({
        user_id: context.userId,
        name: data.name,
        sql: data.sql,
        engine: data.engine,
        tags: data.tags,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSnippet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workbench_snippets")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/*  Shared queries (Phase 3)                                          */
/* ------------------------------------------------------------------ */

function slugify(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
}

const shareInput = z.object({
  title: z.string().min(1).max(120).default("Shared query"),
  description: z.string().max(1000).optional(),
  sql: z.string().min(1).max(200_000),
  engine: z.enum(["sqlite", "postgres", "alasql", "mysql"]),
  visibility: z.enum(["public", "workspace"]).default("public"),
  // TTL in hours; null / undefined = never expires.
  ttlHours: z.number().int().positive().max(24 * 365).optional(),
});

export const createShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => shareInput.parse(d))
  .handler(async ({ data, context }) => {
    const slug = slugify();
    const expiresAt = data.ttlHours
      ? new Date(Date.now() + data.ttlHours * 3_600_000).toISOString()
      : null;
    const { data: row, error } = await context.supabase
      .from("shared_queries")
      .insert({
        owner_id: context.userId,
        slug,
        title: data.title,
        description: data.description ?? null,
        sql: data.sql,
        engine: data.engine,
        visibility: data.visibility,
        expires_at: expiresAt,
      })
      .select("slug,token,expires_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const revokeShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shared_queries")
      .update({ revoked: true })
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyShares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shared_queries")
      .select("id,slug,title,engine,visibility,view_count,expires_at,revoked,created_at")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSharedQuery = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(4).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...input, headers: h } as RequestInit);
        },
      },
    });
    // The refreshed RLS policy already filters revoked/expired rows,
    // but we filter here too so this handler is defensive against
    // policy changes and returns a clean 404 shape.
    const { data: row, error } = await client
      .from("shared_queries")
      .select("slug,title,description,sql,engine,visibility,view_count,expires_at,created_at")
      .eq("slug", data.slug)
      .eq("visibility", "public")
      .eq("revoked", false)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;
    void client.from("shared_queries").update({ view_count: (row as any).view_count + 1 || 1 }).eq("slug", data.slug);
    return row;
  });

export type WbEngineId = EngineId;

