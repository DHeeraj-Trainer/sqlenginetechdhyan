import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DOMAINS } from "./domains";
import { ChallengeCard } from "./ChallengeCard";
import type { Challenge, Difficulty } from "./types";

interface Props {
  challenges: Challenge[];
  solvedIds: string[];
  bookmarkedIds: string[];
  favoriteIds: string[];
  onOpen: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const DIFF_ORDER: Difficulty[] = ["Beginner", "Intermediate", "Advanced", "Interview"];

export function DomainBrowser({
  challenges,
  solvedIds,
  bookmarkedIds,
  favoriteIds,
  onOpen,
  onToggleBookmark,
  onToggleFavorite,
}: Props) {
  const byDomain = useMemo(() => {
    const m = new Map<string, Challenge[]>();
    for (const c of challenges) {
      const arr = m.get(c.domain) ?? [];
      arr.push(c);
      m.set(c.domain, arr);
    }
    return m;
  }, [challenges]);

  const openIds = DOMAINS.filter((d) => (byDomain.get(d.label)?.length ?? 0) > 0).map((d) => d.id);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <Accordion type="multiple" defaultValue={openIds} className="space-y-2">
        {DOMAINS.map((domain) => {
          const list = byDomain.get(domain.label);
          if (!list || list.length === 0) return null;
          const solved = list.filter((c) => solvedIds.includes(c.id)).length;
          return (
            <AccordionItem
              key={domain.id}
              value={domain.id}
              className="overflow-hidden rounded-lg border bg-card/30"
            >
              <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                <div className="flex flex-1 items-center justify-between pr-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="text-base">{domain.emoji}</span>
                    {domain.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {solved}/{list.length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 px-3 pb-3">
                {DIFF_ORDER.map((diff) => {
                  const tier = list.filter((c) => c.difficulty === diff);
                  if (tier.length === 0) return null;
                  return (
                    <div key={diff}>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {diff} · {tier.length}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {tier.map((c) => (
                          <ChallengeCard
                            key={c.id}
                            challenge={c}
                            solved={solvedIds.includes(c.id)}
                            bookmarked={bookmarkedIds.includes(c.id)}
                            favorite={favoriteIds.includes(c.id)}
                            onOpen={() => onOpen(c.id)}
                            onToggleBookmark={() => onToggleBookmark(c.id)}
                            onToggleFavorite={() => onToggleFavorite(c.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
