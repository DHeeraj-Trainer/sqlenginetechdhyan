import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSharedForAdmin, moderateShared } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentPage,
});

function ContentPage() {
  const list = useServerFn(listSharedForAdmin);
  const mod = useServerFn(moderateShared);
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["admin", "content"],
    queryFn: () => list({ data: { limit: 100 } }),
    staleTime: 10_000,
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; action: "make_private" | "make_public" | "delete" }) =>
      mod({ data: v }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin", "content"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Slug</th>
            <th className="px-3 py-2">Engine</th>
            <th className="px-3 py-2">Visibility</th>
            <th className="px-3 py-2">Views</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((s: any) => (
            <tr key={s.id} className="border-t">
              <td className="px-3 py-2 font-medium">{s.title}</td>
              <td className="px-3 py-2 font-mono text-[11px]">{s.slug}</td>
              <td className="px-3 py-2">{s.engine}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] ${
                    s.visibility === "public"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.visibility}
                </span>
              </td>
              <td className="px-3 py-2">{s.view_count}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {new Date(s.created_at).toLocaleString()}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap justify-end gap-1">
                  {s.visibility === "public" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mut.mutate({ id: s.id, action: "make_private" })}
                    >
                      Make private
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mut.mutate({ id: s.id, action: "make_public" })}
                    >
                      Make public
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Delete share "${s.title}"?`)) {
                        mut.mutate({ id: s.id, action: "delete" });
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                No shared queries yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
