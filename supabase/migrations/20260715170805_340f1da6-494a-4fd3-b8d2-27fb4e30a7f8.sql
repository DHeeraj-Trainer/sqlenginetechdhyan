
CREATE TABLE public.mysql_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 3306,
  username TEXT NOT NULL,
  database_name TEXT NOT NULL,
  use_tls BOOLEAN NOT NULL DEFAULT true,
  password_ciphertext TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mysql_connections TO authenticated;
GRANT ALL ON public.mysql_connections TO service_role;

ALTER TABLE public.mysql_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own MySQL connections"
  ON public.mysql_connections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own MySQL connections"
  ON public.mysql_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own MySQL connections"
  ON public.mysql_connections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own MySQL connections"
  ON public.mysql_connections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER mysql_connections_set_updated_at
  BEFORE UPDATE ON public.mysql_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX mysql_connections_user_id_idx ON public.mysql_connections (user_id);
