
-- ============ profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ roles ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ auto-create profile + default role on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ workbench_tabs ============
CREATE TABLE public.workbench_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Query',
  sql TEXT NOT NULL DEFAULT '',
  engine TEXT NOT NULL DEFAULT 'sqlite',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wb_tabs_user ON public.workbench_tabs(user_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workbench_tabs TO authenticated;
GRANT ALL ON public.workbench_tabs TO service_role;
ALTER TABLE public.workbench_tabs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tabs" ON public.workbench_tabs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_wb_tabs_updated_at BEFORE UPDATE ON public.workbench_tabs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ workbench_history ============
CREATE TABLE public.workbench_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sql TEXT NOT NULL,
  engine TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error')),
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wb_history_user_time ON public.workbench_history(user_id, executed_at DESC);
GRANT SELECT, INSERT, DELETE ON public.workbench_history TO authenticated;
GRANT ALL ON public.workbench_history TO service_role;
ALTER TABLE public.workbench_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own history" ON public.workbench_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ workbench_snippets ============
CREATE TABLE public.workbench_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sql TEXT NOT NULL,
  engine TEXT NOT NULL DEFAULT 'sqlite',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wb_snippets_user ON public.workbench_snippets(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workbench_snippets TO authenticated;
GRANT ALL ON public.workbench_snippets TO service_role;
ALTER TABLE public.workbench_snippets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own snippets" ON public.workbench_snippets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_wb_snippets_updated_at BEFORE UPDATE ON public.workbench_snippets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ shared_queries ============
CREATE TABLE public.shared_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'Shared query',
  description TEXT,
  sql TEXT NOT NULL,
  engine TEXT NOT NULL DEFAULT 'sqlite',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shared_queries_owner ON public.shared_queries(owner_id);
CREATE INDEX idx_shared_queries_slug ON public.shared_queries(slug);
GRANT SELECT ON public.shared_queries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_queries TO authenticated;
GRANT ALL ON public.shared_queries TO service_role;
ALTER TABLE public.shared_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views public shares" ON public.shared_queries FOR SELECT TO anon USING (visibility = 'public');
CREATE POLICY "Authenticated views public or own shares" ON public.shared_queries FOR SELECT TO authenticated
  USING (visibility = 'public' OR owner_id = auth.uid());
CREATE POLICY "Users create own shares" ON public.shared_queries FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users update own shares" ON public.shared_queries FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users delete own shares" ON public.shared_queries FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
CREATE TRIGGER trg_shared_queries_updated_at BEFORE UPDATE ON public.shared_queries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
