import { Lock } from "lucide-react";
import { ACHIEVEMENTS } from "./achievements";

interface Props {
  unlockedIds: string[];
}

export function AchievementsPanel({ unlockedIds }: Props) {
  const unlockedSet = new Set(unlockedIds);
  return (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between text-xs">
        <h3 className="font-semibold uppercase tracking-wide text-muted-foreground">Achievements</h3>
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{unlockedIds.length}</span>/{ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const on = unlockedSet.has(a.id);
          return (
            <div
              key={a.id}
              className={`rounded-lg border p-2.5 ${
                on ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card/30 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-2xl leading-none">{on ? a.icon : <Lock className="h-4 w-4 text-muted-foreground" />}</div>
                {on && <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-400">Unlocked</span>}
              </div>
              <div className="mt-1.5 text-xs font-semibold">{a.label}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{a.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
