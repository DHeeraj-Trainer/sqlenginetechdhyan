import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLog, exportAuditLog } from "@/lib/admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditPage,
});

type Filters = { q?: string; action?: string; from?: string; to?: string };

function toIsoOrUndef(v: string) {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function AuditPage() {
  const listFn = useServerFn(listAuditLog);
  const exportFn = useServerFn(exportAuditLog);

  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<Filters>({});
  const [exporting, setExporting] = useState(false);

  const { data } = useSuspenseQuery({
    queryKey: ["admin", "audit", applied],
    queryFn: () =>
      listFn({
        data: {
          limit: 300,
          q: applied.q || undefined,
          action: applied.action || undefined,
          from: applied.from,
          to: applied.to,
        },
      }),
    staleTime: 5_000,
  });

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied({
      q: q.trim() || undefined,
      action: action.trim() || undefined,
      from: toIsoOrUndef(from),
      to: toIsoOrUndef(to),
    });
  };

  const clearAll = () => {
    setQ("");
    setAction("");
    setFrom("");
    setTo("");
    setApplied({});
  };

  const downloadCsv = async () => {
    setExporting(true);
    try {
      const res = await exportFn({
        data: {
          limit: 50_000,
          q: applied.q,
          action: applied.action,
          from: applied.from,
          to: applied.to,
        },
      });
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        `Exported ${res.rowCount.toLocaleString()} rows${res.truncated ? " (truncated at 50k)" : ""}`,
      );
    } catch (err) {
      toast.error("Export failed", { description: (err as Error).message });
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = Object.values(applied).some(Boolean);

  return (
    <div className="space-y-3">
      <form onSubmit={apply} className="flex flex-wrap items-end gap-2 rounded border bg-card p-3">
        <label className="flex flex-col text-xs">
          <span className="mb-1 text-muted-foreground">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="action, email, target…"
              className="w-56 rounded border bg-background py-1 pl-7 pr-2 text-sm"
            />
          </div>
        </label>
        <label className="flex flex-col text-xs">
          <span className="mb-1 text-muted-foreground">Action</span>
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. role.grant"
            className="w-40 rounded border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col text-xs">
          <span className="mb-1 text-muted-foreground">From</span>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col text-xs">
          <span className="mb-1 text-muted-foreground">To</span>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm"
          />
        </label>
        <div className="flex gap-2">
          <Button size="sm" type="submit">
            Apply
          </Button>
          {hasFilters && (
            <Button size="sm" variant="outline" type="button" onClick={clearAll}>
              Clear
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={downloadCsv}
            disabled={exporting}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </form>

      <div className="text-xs text-muted-foreground">
        {data.length.toLocaleString()} entr{data.length === 1 ? "y" : "ies"}
        {data.length === 300 && " (showing latest 300 — refine filters or export CSV for full range)"}
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-left uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Request</th>
              <th className="px-3 py-2">Diff</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r: any) => (
              <tr key={r.id} className="border-t align-top">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 font-mono">{r.action}</td>
                <td className="px-3 py-2 font-mono text-[11px]">
                  {r.actor_email ?? r.actor_id?.slice(0, 8) ?? "system"}
                </td>
                <td className="px-3 py-2 font-mono text-[11px]">
                  {r.target_type ? `${r.target_type}:${r.target_id?.slice(0, 8) ?? ""}` : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  <div>{r.request_id ?? "—"}</div>
                  <div>{r.ip ?? ""}</div>
                </td>
                <td className="px-3 py-2">
                  {r.before || r.after ? (
                    <details>
                      <summary className="cursor-pointer text-muted-foreground">view</summary>
                      <pre className="mt-1 max-w-md overflow-auto rounded bg-muted p-2">
                        {JSON.stringify({ before: r.before, after: r.after }, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No audit entries match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
