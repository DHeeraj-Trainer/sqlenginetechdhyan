import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CHALLENGES } from "./catalog";
import { TOPICS } from "./topics";
import type { Challenge, Difficulty } from "./types";
import { ChallengeCard } from "./ChallengeCard";
import { ChallengeDetail } from "./ChallengeDetail";
import { FiltersBar, type Filters } from "./FiltersBar";
import { loadState, saveState, toggle, type ChallengeState } from "./storage";

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
  const [filters, setFilters] = useState<Filters>({
    q: "",
    difficulty: "all",
    status: "all",
    domain: "all",
    sort: "default",
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const domains = useMemo(
    () => Array.from(new Set(CHALLENGES.map((c) => c.domain))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    let list: Challenge[] = CHALLENGES.filter((c) => {
      if (filters.difficulty !== "all" && c.difficulty !== filters.difficulty) return false;
      if (filters.domain !== "all" && c.domain !== filters.domain) return false;
      if (filters.status === "solved" && !state.solved.includes(c.id)) return false;
      if (filters.status === "unsolved" && state.solved.includes(c.id)) return false;
      if (filters.status === "bookmarked" && !state.bookmarked.includes(c.id)) return false;
      if (filters.status === "favorite" && !state.favorite.includes(c.id)) return false;
      if (q) {
        const hay = [c.title, ...c.concepts, ...c.tags, c.domain].join(" ").toLowerCase();
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
  }, [filters, state]);

  const byTopic = useMemo(() => {
    const map = new Map<string, Challenge[]>();
    for (const c of filtered) {
      const arr = map.get(c.topic) ?? [];
      arr.push(c);
      map.set(c.topic, arr);
    }
    return map;
  }, [filtered]);

  const active = activeId ? CHALLENGES.find((c) => c.id === activeId) ?? null : null;
  const openTopics = useMemo(
    () => TOPICS.filter((t) => (byTopic.get(t.id)?.length ?? 0) > 0).map((t) => t.id),
    [byTopic],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        domains={domains}
        totalChallenges={CHALLENGES.length}
        totalSolved={state.solved.length}
        totalXP={state.xp}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
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
      </div>

      <ChallengeDetail
        challenge={active}
        open={!!active}
        solved={active ? state.solved.includes(active.id) : false}
        onClose={() => setActiveId(null)}
        onSubmitSolved={() => {
          if (!active) return;
          setState((s) => {
            if (s.solved.includes(active.id)) return s;
            return { ...s, solved: [...s.solved, active.id], xp: s.xp + active.xp };
          });
        }}
        onOpenInEditor={onOpenInEditor}
      />
    </div>
  );
}
