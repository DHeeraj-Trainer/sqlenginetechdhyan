import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLog } from "@/lib/admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditPage,
});

function AuditPage() {
  const fn = useServerFn(listAuditLog);
  const [action, setAction] = useState("");
  const [applied, setApplied] = useState<{ action?: string }>({});

  const { data } = useSuspenseQuery({
    queryKey: ["admin", "audit", applied],
    queryFn: () => fn({ data: { limit: 200, action: applied.action || undefined } }),
    staleTime: 5_000,
  });

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ action });
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Filter by action (e.g. role.grant)"
          className="rounded border bg-background px-2 py-1 text-sm"
        />
        <Button size="sm" type="submit">
          Filter
        </Button>
        {applied.action && (
          <Button size="sm" variant="outline" type="button" onClick={() => { setAction(""); setApplied({}); }}>
            Clear
          </Button>
        )}
      </form>

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
                  No audit entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
