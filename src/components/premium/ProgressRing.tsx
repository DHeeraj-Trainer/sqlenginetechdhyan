import { cn } from "@/lib/utils";

interface Props {
  value: number; // 0..100
  size?: number;
  strokeWidth?: number;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  className?: string;
  color?: string; // css var or hex
  trackClassName?: string;
  animate?: boolean;
}

export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  label,
  sublabel,
  className,
  color = "var(--primary)",
  trackClassName = "text-muted",
  animate = true,
}: Props) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          className={cn("fill-none", trackClassName)}
          stroke="currentColor"
          opacity={0.25}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="fill-none"
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={animate ? offset : offset}
          style={{
            transition: animate ? "stroke-dashoffset 900ms cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
            filter: "drop-shadow(0 0 6px color-mix(in oklab, currentColor 30%, transparent))",
          }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {label ?? <span className="text-lg font-semibold font-display">{Math.round(v)}%</span>}
        {sublabel && <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
