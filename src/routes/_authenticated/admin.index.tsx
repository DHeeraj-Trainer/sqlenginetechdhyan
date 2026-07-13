import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminOverview } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: OverviewPage,
});

function OverviewPage() {
  const fn = useServerFn(getAdminOverview);
  const { data } = useSuspenseQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => fn({ data: undefined as any }),
    staleTime: 15_000,
  });

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Counts
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Users" value={data.counts.users} />
          <Stat label="Query tabs" value={data.counts.tabs} />
          <Stat label="Saved snippets" value={data.counts.snippets} />
          <Stat label="History rows" value={data.counts.historyRows} />
          <Stat label="Shared queries" value={data.counts.shares} />
          <Stat label="Audit entries" value={data.counts.auditRows} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent activity (last {data.recent.sampleSize} query executions)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Successful" value={data.recent.okCount} />
          <Stat label="Errored" value={data.recent.errCount} />
          <Stat
            label="Error rate"
            value={`${(data.recent.errorRate * 100).toFixed(1)}%`}
          />
          <Stat
            label="Avg duration"
            value={`${data.recent.avgDurationMs.toFixed(0)} ms`}
          />
        </div>
        <div className="mt-3 rounded border p-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">By engine</div>
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {Object.entries(data.recent.byEngine).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between rounded bg-muted/40 px-2 py-1">
                <span className="font-mono">{k}</span>
                <span className="font-semibold">{v}</span>
              </li>
            ))}
            {Object.keys(data.recent.byEngine).length === 0 && (
              <li className="text-muted-foreground">No recent executions.</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border bg-background p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
