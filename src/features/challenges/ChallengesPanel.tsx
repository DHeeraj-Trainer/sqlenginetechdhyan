import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CHALLENGES } from "./index";
import { TOPICS } from "./topics";
import type { Challenge, Difficulty } from "./types";
import { ChallengeCard } from "./ChallengeCard";
import { ChallengeDetail } from "./ChallengeDetail";
import { FiltersBar, DEFAULT_FILTERS, type Filters } from "./FiltersBar";
import { COMPANIES, COMPANY_MAP } from "./companies";
import { loadState, saveState, toggle, recordSolve, type ChallengeState } from "./storage";
import { unlockedAchievements, newlyUnlocked, ACHIEVEMENTS } from "./achievements";
import { computeProgress } from "./progress";
import { ProgressDashboard } from "./ProgressDashboard";
import { AchievementsPanel } from "./AchievementsPanel";
import { DomainBrowser } from "./DomainBrowser";
import { CompanyBrowser } from "./CompanyBrowser";
import { toast } from "sonner";

const DIFF_ORDER: Record<Difficulty, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Interview: 4,
};

interface Props {
  onOpenInEditor: (sql: string, filename?: string) => void;
}

export function ChallengesPanel({ onOpenInEditor }: Props) {
  const [state, setState] = useState<ChallengeState>(() => loadState());
  const [filters, setFilters] = useState<Filters>(() => ({ ...DEFAULT_FILTERS }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<"topics" | "domains" | "companies" | "interview" | "progress" | "achievements">("topics");

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Auto-award achievements whenever the underlying state changes.
  useEffect(() => {
    const next = unlockedAchievements(state, CHALLENGES);
    const newly = newlyUnlocked(state.achievements, next);
    if (newly.length === 0 && next.length === state.achievements.length) return;
    if (newly.length > 0) {
      for (const a of newly) toast.success(`Achievement unlocked · ${a.icon} ${a.label}`, { description: a.description });
    }
    setState((s) => ({ ...s, achievements: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.solved.length, state.dailyStreakDays, state.xp]);

  const domains = useMemo(
    () => Array.from(new Set(CHALLENGES.map((c) => c.domain))).sort(),
    [],
  );

  const companyNames = useMemo(
    () =>
      Array.from(
        new Set(CHALLENGES.map((c) => c.company).filter((x): x is string => !!x)),
      ).sort(),
    [],
  );

  const conceptOptions = useMemo(() => {
    const s = new Set<string>();
    for (const c of CHALLENGES) for (const k of c.concepts) s.add(k);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, []);

  const tierByCompanyName = useMemo(() => {
    const m = new Map<string, string>();
    for (const co of COMPANIES) m.set(co.name, co.tier);
    return m;
  }, []);

  const filteredAll = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const conceptQ = filters.concept === "all" ? null : filters.concept.toLowerCase();
    let list: Challenge[] = CHALLENGES.filter((c) => {
      if (filters.difficulty !== "all" && c.difficulty !== filters.difficulty) return false;
      if (filters.domain !== "all" && c.domain !== filters.domain) return false;
      if (filters.company !== "all" && c.company !== filters.company) return false;
      if (filters.tier !== "all") {
        if (!c.company) return false;
        if (tierByCompanyName.get(c.company) !== filters.tier) return false;
      }
      if (conceptQ) {
        const hit = c.concepts.some((k) => k.toLowerCase() === conceptQ);
        if (!hit) return false;
      }
      if (filters.status === "solved" && !state.solved.includes(c.id)) return false;
      if (filters.status === "unsolved" && state.solved.includes(c.id)) return false;
      if (filters.status === "bookmarked" && !state.bookmarked.includes(c.id)) return false;
      if (filters.status === "favorite" && !state.favorite.includes(c.id)) return false;
      if (q) {
        const hay = [c.title, ...c.concepts, ...c.tags, c.domain, c.company ?? "", c.topic].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (filters.sort === "difficulty") {
      list = [...list].sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    } else if (filters.sort === "xp-desc") {
      list = [...list].sort((a, b) => b.xp - a.xp);
    } else if (filters.sort === "time-asc") {
      list = [...list].sort((a, b) => a.estMinutes - b.estMinutes);
    }
    return list;
  }, [filters, state, tierByCompanyName]);

  const filteredForTopics = filteredAll;

  const byTopic = useMemo(() => {
    const map = new Map<string, Challenge[]>();
    for (const c of filteredForTopics) {
      const arr = map.get(c.topic) ?? [];
      arr.push(c);
      map.set(c.topic, arr);
    }
    return map;
  }, [filteredForTopics]);

  const interviewChallenges = useMemo(
    () => filteredAll.filter((c) => c.difficulty === "Interview" || !!c.company),
    [filteredAll],
  );

  const active = activeId ? CHALLENGES.find((c) => c.id === activeId) ?? null : null;
  const openTopics = useMemo(
    () => TOPICS.filter((t) => (byTopic.get(t.id)?.length ?? 0) > 0).map((t) => t.id),
    [byTopic],
  );

  const stats = useMemo(() => computeProgress(state, CHALLENGES), [state]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        domains={domains}
        companies={companyNames}
        concepts={conceptOptions}
        totalChallenges={CHALLENGES.length}
        totalSolved={state.solved.length}
        totalXP={state.xp}
        matchCount={filteredAll.length}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-2 grid h-8 w-auto grid-cols-6 text-[11px]">
          <TabsTrigger value="topics" className="text-[11px]">Topics</TabsTrigger>
          <TabsTrigger value="domains" className="text-[11px]">Domains</TabsTrigger>
          <TabsTrigger value="companies" className="text-[11px]">Companies</TabsTrigger>
          <TabsTrigger value="interview" className="text-[11px]">Interview</TabsTrigger>
          <TabsTrigger value="progress" className="text-[11px]">Progress</TabsTrigger>
          <TabsTrigger value="achievements" className="text-[11px]">Badges</TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="min-h-0 flex-1 overflow-y-auto p-3">
          {filteredForTopics.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No challenges match your filters.
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={openTopics} className="space-y-2">
              {TOPICS.map((topic) => {
                const list = byTopic.get(topic.id);
                if (!list || list.length === 0) return null;
                return (
                  <AccordionItem
                    key={topic.id}
                    value={topic.id}
                    className="overflow-hidden rounded-lg border bg-card/30"
                  >
                    <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                      <div className="flex flex-1 items-center justify-between pr-2">
                        <span className="font-semibold">{topic.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {list.filter((c) => state.solved.includes(c.id)).length}/{list.length}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        {list.map((c) => (
                          <ChallengeCard
                            key={c.id}
                            challenge={c}
                            solved={state.solved.includes(c.id)}
                            bookmarked={state.bookmarked.includes(c.id)}
                            favorite={state.favorite.includes(c.id)}
                            onOpen={() => setActiveId(c.id)}
                            onToggleBookmark={() =>
                              setState((s) => ({ ...s, bookmarked: toggle(s.bookmarked, c.id) }))
                            }
                            onToggleFavorite={() =>
                              setState((s) => ({ ...s, favorite: toggle(s.favorite, c.id) }))
                            }
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="domains" className="min-h-0 flex-1 overflow-y-auto">
          <DomainBrowser
            challenges={filteredAll}
            solvedIds={state.solved}
            bookmarkedIds={state.bookmarked}
            favoriteIds={state.favorite}
            onOpen={(id) => setActiveId(id)}
            onToggleBookmark={(id) =>
              setState((s) => ({ ...s, bookmarked: toggle(s.bookmarked, id) }))
            }
            onToggleFavorite={(id) =>
              setState((s) => ({ ...s, favorite: toggle(s.favorite, id) }))
            }
          />
        </TabsContent>

        <TabsContent value="companies" className="min-h-0 flex-1 overflow-y-auto">
          <CompanyBrowser
            challenges={filteredAll}
            solvedIds={state.solved}
            bookmarkedIds={state.bookmarked}
            favoriteIds={state.favorite}
            onOpen={(id) => setActiveId(id)}
            onToggleBookmark={(id) =>
              setState((s) => ({ ...s, bookmarked: toggle(s.bookmarked, id) }))
            }
            onToggleFavorite={(id) =>
              setState((s) => ({ ...s, favorite: toggle(s.favorite, id) }))
            }
          />
        </TabsContent>

        <TabsContent value="interview" className="min-h-0 flex-1 overflow-y-auto p-3">
          {interviewChallenges.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No interview challenges match your filters.
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {interviewChallenges.map((c) => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  solved={state.solved.includes(c.id)}
                  bookmarked={state.bookmarked.includes(c.id)}
                  favorite={state.favorite.includes(c.id)}
                  onOpen={() => setActiveId(c.id)}
                  onToggleBookmark={() =>
                    setState((s) => ({ ...s, bookmarked: toggle(s.bookmarked, c.id) }))
                  }
                  onToggleFavorite={() =>
                    setState((s) => ({ ...s, favorite: toggle(s.favorite, c.id) }))
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="min-h-0 flex-1 overflow-y-auto">
          <ProgressDashboard stats={stats} />
        </TabsContent>

        <TabsContent value="achievements" className="min-h-0 flex-1 overflow-y-auto">
          <AchievementsPanel unlockedIds={state.achievements.length > 0 ? state.achievements : unlockedAchievements(state, CHALLENGES)} />
          <div className="px-3 pb-4 text-[10px] text-muted-foreground">
            {ACHIEVEMENTS.length} total badges available.
          </div>
        </TabsContent>
      </Tabs>

      <ChallengeDetail
        challenge={active}
        open={!!active}
        solved={active ? state.solved.includes(active.id) : false}
        onClose={() => setActiveId(null)}
        onSubmitSolved={() => {
          if (!active) return;
          setState((s) => recordSolve(s, active.id, active.xp));
        }}
        onOpenInEditor={onOpenInEditor}
      />
    </div>
  );
}
