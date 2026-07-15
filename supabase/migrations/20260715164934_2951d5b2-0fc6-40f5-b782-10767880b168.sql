
-- ============================================================================
-- user_progress
-- ============================================================================
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'attempted' CHECK (status IN ('attempted','solved','skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  best_time_ms INTEGER,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  solved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own progress select" ON public.user_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own progress insert" ON public.user_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own progress update" ON public.user_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own progress delete" ON public.user_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_challenge ON public.user_progress(challenge_id);

-- ============================================================================
-- user_notes
-- ============================================================================
CREATE TABLE public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notes TO authenticated;
GRANT ALL ON public.user_notes TO service_role;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notes select" ON public.user_notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notes insert" ON public.user_notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notes update" ON public.user_notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notes delete" ON public.user_notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_notes_user ON public.user_notes(user_id);

-- ============================================================================
-- user_bookmarks
-- ============================================================================
CREATE TABLE public.user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('bookmark','favorite','recent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, kind)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bookmarks TO authenticated;
GRANT ALL ON public.user_bookmarks TO service_role;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bookmarks select" ON public.user_bookmarks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own bookmarks insert" ON public.user_bookmarks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bookmarks update" ON public.user_bookmarks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bookmarks delete" ON public.user_bookmarks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_bookmarks_user_kind ON public.user_bookmarks(user_id, kind);

-- ============================================================================
-- challenge_discussions
-- ============================================================================
CREATE TABLE public.challenge_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  parent_id UUID REFERENCES public.challenge_discussions(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_discussions TO authenticated;
GRANT ALL ON public.challenge_discussions TO service_role;
ALTER TABLE public.challenge_discussions ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read all discussions
CREATE POLICY "discussions select all" ON public.challenge_discussions FOR SELECT
  TO authenticated USING (true);
-- Only the author can insert as themselves
CREATE POLICY "discussions insert own" ON public.challenge_discussions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
-- Only the author can edit/delete their own posts
CREATE POLICY "discussions update own" ON public.challenge_discussions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "discussions delete own" ON public.challenge_discussions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_discussions_challenge ON public.challenge_discussions(challenge_id, created_at DESC);
CREATE INDEX idx_discussions_parent ON public.challenge_discussions(parent_id);

-- ============================================================================
-- updated_at triggers (reuse existing set_updated_at() function)
-- ============================================================================
CREATE TRIGGER trg_user_progress_updated
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_user_notes_updated
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_user_bookmarks_updated
  BEFORE UPDATE ON public.user_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_discussions_updated
  BEFORE UPDATE ON public.challenge_discussions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
