import { useMemo, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  Bookmark,
  Building2,
  ChevronRight,
  Clock,
  Flame,
  GraduationCap,
  Layers,
  Moon,
  Search,
  Sparkles,
  Star,
  Sun,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/premium/PageHeader";
import { StatCard } from "@/components/premium/StatCard";
import { ProgressRing } from "@/components/premium/ProgressRing";
import { EmptyState } from "@/components/premium/EmptyState";
import { SkeletonCard, SkeletonStat } from "@/components/premium/SkeletonCard";
import { useContent } from "@/lib/content/registry";
import { loadState } from "@/features/challenges/storage";
import { computeProgress } from "@/features/challenges/progress";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Challenge } from "@/features/challenges/types";

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner: "text-emerald-600 bg-emerald-500/10",
  Intermediate: "text-amber-600 bg-amber-500/10",
  Advanced: "text-rose-600 bg-rose-500/10",
  Interview: "text-violet-600 bg-violet-500/10",
};

const RECENT_KEY = "sqlwb:recent-challenges:v1";

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function Dashboard() {
  const content = useContent();
  const { user } = useAuth();
  const [state, setState] = useState(() => loadState());
  const [recentIds, setRecentIds] = useState<string[]>(() => loadRecent());
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [domain, setDomain] = useState<string>("all");
  const [company, setCompany] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Sync theme with document
    const html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [theme]);

  useEffect(() => {
    // Refresh state if the workbench updates it in another tab.
    const onStorage = () => {
      setState(loadState());
      setRecentIds(loadRecent());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const progress = useMemo(
    () => computeProgress(state, content.challenges),
    [state, content.challenges],
  );

  const solvedSet = useMemo(() => new Set(state.solved), [state.solved]);
  const bookmarkedSet = useMemo(() => new Set(state.bookmarked), [state.bookmarked]);
  const favoriteSet = useMemo(() => new Set(state.favorite), [state.favorite]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return content.challenges.filter((c) => {
      if (q && !`${c.title} ${c.problem} ${c.concepts.join(" ")}`.toLowerCase().includes(q)) {
        return false;
      }
      if (difficulty !== "all" && c.difficulty !== difficulty) return false;
      if (domain !== "all" && c.domain !== domain) return false;
      if (company !== "all" && c.company !== company) return false;
      if (status === "solved" && !solvedSet.has(c.id)) return false;
      if (status === "unsolved" && solvedSet.has(c.id)) return false;
      if (status === "bookmarked" && !bookmarkedSet.has(c.id)) return false;
      if (status === "favorite" && !favoriteSet.has(c.id)) return false;
      return true;
    });
  }, [content.challenges, search, difficulty, domain, company, status, solvedSet, bookmarkedSet, favoriteSet]);

  const continueLearning = useMemo(() => {
    const recentSolved = state.records
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .map((r) => content.challengesById[r.id])
      .filter(Boolean);
    // Suggest next unsolved after last solved topic
    const nextUnsolved = content.challenges
      .filter((c) => !solvedSet.has(c.id))
      .slice(0, 5);
    return [...recentSolved.slice(0, 2), ...nextUnsolved].slice(0, 5);
  }, [state.records, content, solvedSet]);

  const recentViewed = useMemo(
    () => recentIds.map((id) => content.challengesById[id]).filter(Boolean).slice(0, 6),
    [recentIds, content.challengesById],
  );

  const bookmarks = useMemo(
    () => Array.from(bookmarkedSet).map((id) => content.challengesById[id]).filter(Boolean).slice(0, 6),
    [bookmarkedSet, content.challengesById],
  );

  const favorites = useMemo(
    () => Array.from(favoriteSet).map((id) => content.challengesById[id]).filter(Boolean).slice(0, 6),
    [favoriteSet, content.challengesById],
  );

  const domainStats = useMemo(() => {
    return content.domains.map((d) => {
      const list = content.challengesByDomain[d.label] || content.challengesByDomain[d.id] || [];
      const solved = list.filter((c) => solvedSet.has(c.id)).length;
      return {
        ...d,
        total: list.length,
        solved,
        pct: list.length ? Math.round((solved / list.length) * 100) : 0,
      };
    }).sort((a, b) => b.total - a.total);
  }, [content, solvedSet]);

  const companyStats = useMemo(() => {
    return content.companies.map((co) => {
      const list = content.challengesByCompany[co.id] || [];
      const solved = list.filter((c) => solvedSet.has(c.id)).length;
      return {
        ...co,
        total: list.length,
        solved,
        pct: list.length ? Math.round((solved / list.length) * 100) : 0,
      };
    }).filter((co) => co.total > 0);
  }, [content, solvedSet]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-white shadow-md">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-gradient">SQL Academy</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            <Link to="/dashboard" className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent">Dashboard</Link>
            <Link to="/" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">Workbench</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search challenges…"
                className="h-9 w-64 pl-8 text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
              className="h-9 w-9"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {user ? (
              <Badge variant="secondary" className="hidden sm:inline-flex">{progress.rank}</Badge>
            ) : (
              <Link to="/auth">
                <Button size="sm">Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:py-10">
        {/* Hero */}
        <div className="animate-fade-in">
          <PageHeader
            crumbs={[{ label: "Dashboard" }]}
            icon={<Sparkles className="h-6 w-6" />}
            title={
              <>
                Welcome back{user?.user_metadata?.full_name ? `, ${String(user.user_metadata.full_name).split(" ")[0]}` : ""}
                <span className="text-gradient"> ✨</span>
              </>
            }
            description={`You're ${progress.completed} of ${progress.total} challenges in. Keep the streak alive — you're currently a ${progress.rank}.`}
            actions={
              <>
                <Link to="/">
                  <Button size="sm" className="gap-1">
                    <Zap className="h-3.5 w-3.5" /> Open Workbench
                  </Button>
                </Link>
              </>
            }
          />
        </div>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          ) : (
            <>
              <StatCard
                label="Solved"
                value={`${progress.completed}/${progress.total}`}
                icon={<Trophy className="h-5 w-5" />}
                hint={`${progress.remaining} to go`}
                accent="primary"
              >
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-primary transition-all duration-700"
                    style={{ width: `${Math.round((progress.completed / Math.max(1, progress.total)) * 100)}%` }}
                  />
                </div>
              </StatCard>
              <StatCard
                label="Current Streak"
                value={`${progress.streak} day${progress.streak === 1 ? "" : "s"}`}
                icon={<Flame className="h-5 w-5" />}
                hint={progress.streak > 0 ? "Keep it going!" : "Solve one today to start"}
                accent="warning"
              />
              <StatCard
                label="XP Earned"
                value={progress.xp.toLocaleString()}
                icon={<Zap className="h-5 w-5" />}
                hint={progress.rank}
                accent="info"
              />
              <StatCard
                label="Accuracy"
                value={`${progress.accuracyPct}%`}
                icon={<Target className="h-5 w-5" />}
                hint={progress.avgSolveSeconds > 0 ? `Avg ${progress.avgSolveSeconds}s` : "No solves yet"}
                accent="success"
              />
            </>
          )}
        </section>

        {/* Filters */}
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search challenges, concepts, tags…"
                className="h-9 pl-9"
              />
            </div>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
                <SelectItem value="Interview">Interview</SelectItem>
              </SelectContent>
            </Select>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Domain" /></SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="all">All domains</SelectItem>
                {content.domains.map((d) => (
                  <SelectItem key={d.id} value={d.label}>{d.emoji} {d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Company" /></SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="all">All companies</SelectItem>
                {content.companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="solved">Solved</SelectItem>
                <SelectItem value="unsolved">Unsolved</SelectItem>
                <SelectItem value="bookmarked">Bookmarked</SelectItem>
                <SelectItem value="favorite">Favorite</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="ml-auto">{filtered.length} results</Badge>
          </div>
        </section>

        {/* Continue Learning */}
        <ChallengeRail
          title="Continue Learning"
          icon={<Sparkles className="h-4 w-4" />}
          challenges={continueLearning}
          solvedSet={solvedSet}
          loading={loading}
        />

        {/* Recently viewed */}
        {recentViewed.length > 0 && (
          <ChallengeRail
            title="Recently Viewed"
            icon={<Clock className="h-4 w-4" />}
            challenges={recentViewed}
            solvedSet={solvedSet}
            loading={false}
          />
        )}

        {/* Bookmarks + Favorites */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RailPanel
            title="Bookmarks"
            icon={<Bookmark className="h-4 w-4" />}
            challenges={bookmarks}
            solvedSet={solvedSet}
            emptyLabel="No bookmarks yet"
          />
          <RailPanel
            title="Favorites"
            icon={<Star className="h-4 w-4" />}
            challenges={favorites}
            solvedSet={solvedSet}
            emptyLabel="No favorites yet"
          />
        </div>

        {/* Domain grid */}
        <section>
          <SectionHeader icon={<Layers className="h-4 w-4" />} title="Domains" subtitle="Practice by industry vertical" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
              : domainStats.map((d) => (
                <div
                  key={d.id}
                  className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-3xl leading-none">{d.emoji}</div>
                    <ProgressRing value={d.pct} size={44} strokeWidth={4} label={<span className="text-[10px] font-bold">{d.pct}%</span>} />
                  </div>
                  <h3 className="mt-3 truncate text-sm font-semibold" title={d.label}>{d.label}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {d.solved}/{d.total} solved
                  </p>
                </div>
              ))}
          </div>
        </section>

        {/* Company grid */}
        {companyStats.length > 0 && (
          <section>
            <SectionHeader icon={<Building2 className="h-4 w-4" />} title="Companies" subtitle="Interview prep by employer" />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {companyStats.map((c) => (
                <div
                  key={c.id}
                  className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-bold text-white shadow-sm"
                      style={{ background: c.color }}
                    >
                      {c.emoji || c.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold" title={c.name}>{c.name}</h3>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.tier}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{c.solved}/{c.total} solved</span>
                    <span className="font-semibold text-primary">{c.pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-primary transition-all" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Achievements teaser */}
        {state.achievements.length > 0 && (
          <section className="rounded-2xl border bg-gradient-mesh p-6">
            <SectionHeader icon={<Award className="h-4 w-4" />} title="Achievements" subtitle={`${state.achievements.length} unlocked`} />
            <div className="mt-4 flex flex-wrap gap-2">
              {state.achievements.map((a) => (
                <Badge key={a} variant="secondary" className="animate-scale-in gap-1">
                  <Award className="h-3 w-3" /> {a}
                </Badge>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {icon} {title}
        </div>
        {subtitle && <h2 className="text-lg font-bold font-display md:text-xl">{subtitle}</h2>}
      </div>
    </div>
  );
}

function ChallengeRail({
  title,
  icon,
  challenges,
  solvedSet,
  loading,
}: {
  title: string;
  icon: React.ReactNode;
  challenges: Challenge[];
  solvedSet: Set<string>;
  loading: boolean;
}) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <SectionHeader icon={icon} title={title} />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : challenges.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-5">
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="Nothing yet"
              description="Start solving to see personalized suggestions here."
            />
          </div>
        ) : (
          challenges.map((c) => <ChallengeMiniCard key={c.id} challenge={c} solved={solvedSet.has(c.id)} />)
        )}
      </div>
    </section>
  );
}

function RailPanel({
  title,
  icon,
  challenges,
  solvedSet,
  emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  challenges: Challenge[];
  solvedSet: Set<string>;
  emptyLabel: string;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <SectionHeader icon={icon} title={title} />
      <div className="mt-3 space-y-2">
        {challenges.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          challenges.map((c) => (
            <div key={c.id} className="group flex items-center gap-2 rounded-lg border bg-background/60 p-2 transition-colors hover:bg-accent">
              <div className={cn("grid h-6 w-6 shrink-0 place-items-center rounded font-mono text-[10px] font-bold", solvedSet.has(c.id) ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
                {c.number}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={c.title}>{c.title}</p>
                <p className="truncate text-[10px] text-muted-foreground">{c.domain} · {c.topic}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold", DIFFICULTY_COLOR[c.difficulty] ?? "bg-muted")}>{c.difficulty}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ChallengeMiniCard({ challenge, solved }: { challenge: Challenge; solved: boolean }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", DIFFICULTY_COLOR[challenge.difficulty] ?? "bg-muted")}>
          {challenge.difficulty}
        </span>
        {solved && (
          <Badge variant="outline" className="border-emerald-500/40 text-[9px] text-emerald-600">
            Solved
          </Badge>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold" title={challenge.title}>
        #{challenge.number} · {challenge.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{challenge.problem}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {challenge.concepts.slice(0, 2).map((c) => (
          <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
            {c}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{challenge.domain}</span>
        <span className="inline-flex items-center gap-0.5"><Zap className="h-2.5 w-2.5" /> {challenge.xp} XP</span>
      </div>
    </div>
  );
}
