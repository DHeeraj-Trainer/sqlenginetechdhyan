import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

interface Props {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  delta?: number; // percentage change
  trend?: "up" | "down" | "neutral";
  accent?: "primary" | "success" | "warning" | "danger" | "info";
  className?: string;
  children?: React.ReactNode;
}

const ACCENT: Record<NonNullable<Props["accent"]>, string> = {
  primary: "from-primary/15 to-primary/5 text-primary",
  success: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  warning: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
  danger: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400",
  info: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400",
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  delta,
  trend,
  accent = "primary",
  className,
  children,
}: Props) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        className,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60", ACCENT[accent])} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="mt-1.5 text-2xl font-bold font-display leading-tight">{value}</div>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          {delta != null && (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                trend === "up"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : trend === "down"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {trend === "up" ? <ArrowUp className="h-3 w-3" /> : trend === "down" ? <ArrowDown className="h-3 w-3" /> : null}
              {Math.abs(delta)}%
            </div>
          )}
        </div>
        {icon && (
          <div className={cn("shrink-0 rounded-xl bg-background/60 p-2.5 shadow-sm ring-1 ring-inset ring-border/50", ACCENT[accent].split(" ").pop())}>
            {icon}
          </div>
        )}
      </div>
      {children && <div className="relative mt-3">{children}</div>}
    </div>
  );
}
