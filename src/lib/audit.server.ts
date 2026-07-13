// Server-only audit log helpers. Never import from client code.
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEntry = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAudit(supabase: SupabaseClient, entry: AuditEntry) {
  try {
    await supabase.from("audit_log").insert({
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      request_id: entry.requestId ?? null,
      ip: entry.ip ?? null,
      user_agent: entry.userAgent ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    // Never let audit failure break the caller.
    console.error("audit_log write failed", err);
  }
}
