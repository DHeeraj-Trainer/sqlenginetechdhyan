
ALTER TABLE public.shared_queries
  ADD COLUMN IF NOT EXISTS token text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked boolean NOT NULL DEFAULT false;

-- Backfill tokens for existing rows.
UPDATE public.shared_queries
SET token = encode(gen_random_bytes(24), 'hex')
WHERE token IS NULL;

ALTER TABLE public.shared_queries
  ALTER COLUMN token SET NOT NULL,
  ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS shared_queries_token_key
  ON public.shared_queries(token);

CREATE INDEX IF NOT EXISTS shared_queries_active_token_idx
  ON public.shared_queries(token)
  WHERE revoked = false;

-- Refresh the public read policy to enforce revoke + expiry.
DROP POLICY IF EXISTS "Public can view public shared queries" ON public.shared_queries;
CREATE POLICY "Public can view active public shared queries"
  ON public.shared_queries
  FOR SELECT
  TO anon, authenticated
  USING (
    visibility = 'public'
    AND revoked = false
    AND (expires_at IS NULL OR expires_at > now())
  );
