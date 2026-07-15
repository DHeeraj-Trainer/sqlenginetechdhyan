import { cn } from "@/lib/utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-2xl border bg-card p-5", className)}>
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-9 w-9 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-2.5 w-16" />
        </div>
      </div>
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-4/5" />
      <div className="flex gap-2 pt-1">
        <SkeletonBlock className="h-6 w-16 rounded-full" />
        <SkeletonBlock className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5", className)}>
      <SkeletonBlock className="h-2.5 w-16" />
      <SkeletonBlock className="mt-3 h-7 w-24" />
      <SkeletonBlock className="mt-2 h-2.5 w-32" />
    </div>
  );
}
