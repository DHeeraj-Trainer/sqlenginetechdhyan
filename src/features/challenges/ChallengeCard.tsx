import { Star, Bookmark, CheckCircle2, Clock, Zap } from "lucide-react";
import type { Challenge } from "./types";
import { DifficultyBadge } from "./DifficultyBadge";
import { TOPIC_MAP } from "./topics";
import { cn } from "@/lib/utils";

interface Props {
  challenge: Challenge;
  solved: boolean;
  bookmarked: boolean;
  favorite: boolean;
  onOpen: () => void;
  onToggleBookmark: () => void;
  onToggleFavorite: () => void;
}

export function ChallengeCard({
  challenge,
  solved,
  bookmarked,
  favorite,
  onOpen,
  onToggleBookmark,
  onToggleFavorite,
}: Props) {
  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card/60 p-3 transition-all",
        "hover:border-primary/40 hover:bg-card hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]",
        solved && "border-l-2 border-l-emerald-500",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button onClick={onOpen} className="flex-1 text-left">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">#{challenge.number}</span>
            <DifficultyBadge difficulty={challenge.difficulty} />
            {solved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
          </div>
          <div className="mt-1 font-medium leading-tight group-hover:text-primary">
            {challenge.title}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {challenge.estMinutes}m
            </span>
            <span className="inline-flex items-center gap-1">
              <Zap className="h-3 w-3" /> {challenge.xp} XP
            </span>
            <span>{TOPIC_MAP[challenge.topic]?.label}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {challenge.concepts.slice(0, 4).map((c) => (
              <span
                key={c}
                className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        </button>
        <div className="flex flex-col gap-1">
          <button
            onClick={onToggleFavorite}
            aria-label="Favorite"
            className={cn(
              "rounded p-1 transition-colors hover:bg-muted",
              favorite ? "text-amber-400" : "text-muted-foreground",
            )}
          >
            <Star className={cn("h-4 w-4", favorite && "fill-current")} />
          </button>
          <button
            onClick={onToggleBookmark}
            aria-label="Bookmark"
            className={cn(
              "rounded p-1 transition-colors hover:bg-muted",
              bookmarked ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
          </button>
        </div>
      </div>
    </div>
  );
}
