import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, setUserBan, setUserRole } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const list = useServerFn(listUsers);
  const roleFn = useServerFn(setUserRole);
  const banFn = useServerFn(setUserBan);
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data } = useSuspenseQuery({
    queryKey: ["admin", "users", page],
    queryFn: () => list({ data: { page, perPage: 50 } }),
    staleTime: 10_000,
  });

  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "moderator" | "user"; grant: boolean }) =>
      roleFn({ data: v }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const banMut = useMutation({
    mutationFn: (v: { userId: string; ban: boolean }) => banFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.ban ? "User banned" : "User unbanned");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {data.users.length} shown · page {page}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Prev
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Last sign-in</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u: any) => {
              const has = (r: string) => u.roles.includes(r);
              const banned = !!u.banned_until && new Date(u.banned_until) > new Date();
              return (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{u.display_name || u.email || u.id.slice(0, 8)}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      {u.roles.map((r: string) => (
                        <span key={r} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "never"}
                  </td>
                  <td className="px-3 py-2">
                    {banned ? (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] text-destructive">
                        banned
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">active</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      {(["admin", "moderator"] as const).map((r) => (
                        <Button
                          key={r}
                          size="sm"
                          variant={has(r) ? "default" : "outline"}
                          disabled={roleMut.isPending}
                          onClick={() =>
                            roleMut.mutate({ userId: u.id, role: r, grant: !has(r) })
                          }
                        >
                          {has(r) ? `− ${r}` : `+ ${r}`}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant={banned ? "outline" : "destructive"}
                        disabled={banMut.isPending}
                        onClick={() => banMut.mutate({ userId: u.id, ban: !banned })}
                      >
                        {banned ? "Unban" : "Ban"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
