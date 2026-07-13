
-- Add moderator role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';

-- Audit log: append-only trail of admin/user actions
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  request_id text,
  ip text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_actor ON public.audit_log (actor_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log (action, created_at DESC);
CREATE INDEX idx_audit_log_target ON public.audit_log (target_type, target_id);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins may read audit rows. Writes only through server (service role).
CREATE POLICY "Admins read audit log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Helpful indexes on existing tables for admin analytics performance
CREATE INDEX IF NOT EXISTS idx_workbench_history_executed_at ON public.workbench_history (executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_workbench_history_user_executed ON public.workbench_history (user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_queries_created_at ON public.shared_queries (created_at DESC);
