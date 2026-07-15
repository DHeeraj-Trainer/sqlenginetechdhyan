import type { Difficulty } from "./types";
import { cn } from "@/lib/utils";

const styles: Record<Difficulty, string> = {
  Beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Intermediate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Advanced: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Interview: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        styles[difficulty],
        className,
      )}
    >
      {difficulty}
    </span>
  );
}
