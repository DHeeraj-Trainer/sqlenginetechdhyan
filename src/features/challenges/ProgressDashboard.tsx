import { Flame, Trophy, Zap, Target, Clock, Award, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ProgressStats } from "./progress";

interface Props {
  stats: ProgressStats;
}

export function ProgressDashboard({ stats }: Props) {
  return (
    <div className="space-y-4 p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={<Trophy className="h-4 w-4" />} label="Solved" value={`${stats.completed}/${stats.total}`} tone="emerald" />
        <Stat icon={<Zap className="h-4 w-4" />} label="XP" value={stats.xp.toLocaleString()} tone="amber" />
        <Stat icon={<Flame className="h-4 w-4" />} label="Streak" value={`${stats.streak}d`} tone="rose" />
        <Stat icon={<Target className="h-4 w-4" />} label="Accuracy" value={`${stats.accuracyPct}%`} tone="sky" />
        <Stat icon={<Clock className="h-4 w-4" />} label="Avg time" value={fmtSeconds(stats.avgSolveSeconds)} tone="violet" />
        <Stat icon={<Award className="h-4 w-4" />} label="Rank" value={stats.rank} tone="cyan" />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Remaining" value={String(stats.remaining)} tone="slate" />
        <Stat icon={<Trophy className="h-4 w-4" />} label="Overall" value={`${pct(stats.completed, stats.total)}%`} tone="emerald" />
      </div>

      <Section title="Difficulty">
        {stats.byDifficulty.map((d) => (
          <Bar key={d.difficulty} label={d.difficulty} solved={d.solved} total={d.total} pct={d.pct} />
        ))}
      </Section>

      <Section title="Topics">
        <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {stats.byTopic.map((t) => (
            <Bar key={t.id} label={t.label} solved={t.solved} total={t.total} pct={t.pct} />
          ))}
        </div>
      </Section>

      <Section title="Domains">
        <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {stats.byDomain.map((d) => (
            <Bar key={d.id} label={d.label} solved={d.solved} total={d.total} pct={d.pct} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  const bg: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    rose: "bg-rose-500/10 text-rose-400",
    sky: "bg-sky-500/10 text-sky-400",
    violet: "bg-violet-500/10 text-violet-400",
    cyan: "bg-cyan-500/10 text-cyan-400",
    slate: "bg-slate-500/10 text-slate-300",
  };
  return (
    <div className="rounded-lg border bg-card/40 p-2.5">
      <div className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${bg[tone] ?? bg.slate}`}>
        {icon} {label}
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function Bar({
  label,
  solved,
  total,
  pct,
}: {
  label: string;
  solved: number;
  total: number;
  pct: number;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[11px]">
        <span className="truncate">{label}</span>
        <span className="text-muted-foreground">
          {solved}/{total} · {pct}%
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function fmtSeconds(s: number): string {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}
