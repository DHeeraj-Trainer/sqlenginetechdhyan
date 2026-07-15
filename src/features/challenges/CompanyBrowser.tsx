import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { COMPANIES } from "./companies";
import { ChallengeCard } from "./ChallengeCard";
import type { Challenge } from "./types";

interface Props {
  challenges: Challenge[];
  solvedIds: string[];
  bookmarkedIds: string[];
  favoriteIds: string[];
  onOpen: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function CompanyBrowser({
  challenges,
  solvedIds,
  bookmarkedIds,
  favoriteIds,
  onOpen,
  onToggleBookmark,
  onToggleFavorite,
}: Props) {
  const byCompany = useMemo(() => {
    const m = new Map<string, Challenge[]>();
    for (const c of challenges) {
      if (!c.company) continue;
      const arr = m.get(c.company) ?? [];
      arr.push(c);
      m.set(c.company, arr);
    }
    return m;
  }, [challenges]);

  const openIds = COMPANIES.filter((c) => (byCompany.get(c.name)?.length ?? 0) > 0).map((c) => c.id);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <Accordion type="multiple" defaultValue={openIds} className="space-y-2">
        {COMPANIES.map((company) => {
          const list = byCompany.get(company.name);
          if (!list || list.length === 0) return null;
          const solved = list.filter((c) => solvedIds.includes(c.id)).length;
          const byDiff = groupByDifficultyLabel(list);
          return (
            <AccordionItem
              key={company.id}
              value={company.id}
              className="overflow-hidden rounded-lg border bg-card/30"
            >
              <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                <div className="flex flex-1 items-center justify-between pr-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-xs"
                      style={{ backgroundColor: `${company.color}22`, color: company.color }}
                    >
                      {company.emoji}
                    </span>
                    {company.name}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {company.tier}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {solved}/{list.length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 px-3 pb-3">
                {(["Easy", "Medium", "Hard"] as const).map((tier) => {
                  const tierList = byDiff[tier];
                  if (!tierList || tierList.length === 0) return null;
                  return (
                    <div key={tier}>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {tier} · {tierList.length}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {tierList.map((c) => (
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

function groupByDifficultyLabel(list: Challenge[]): Record<"Easy" | "Medium" | "Hard", Challenge[]> {
  const out: Record<"Easy" | "Medium" | "Hard", Challenge[]> = { Easy: [], Medium: [], Hard: [] };
  for (const c of list) {
    // Company challenges use tags to record their sub-difficulty.
    if (c.tags.includes("beginner")) out.Easy.push(c);
    else if (c.tags.includes("intermediate")) out.Medium.push(c);
    else if (c.tags.includes("advanced")) out.Hard.push(c);
    else out.Medium.push(c);
  }
  return out;
}
