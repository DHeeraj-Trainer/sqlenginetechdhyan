import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAdminStatus } from "@/lib/admin.functions";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const check = useServerFn(getMyAdminStatus);
  const { data } = useSuspenseQuery({
    queryKey: ["admin", "status"],
    queryFn: () => check({ data: undefined as any }),
    staleTime: 30_000,
  });

  if (!data.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need the admin role to access this area.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to workbench
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <h1 className="text-lg font-bold">Admin</h1>
          <nav className="flex flex-wrap gap-1 text-sm">
            <AdminTab to="/_authenticated/admin" exact>
              Overview
            </AdminTab>
            <AdminTab to="/_authenticated/admin/users">Users</AdminTab>
            <AdminTab to="/_authenticated/admin/content">Content</AdminTab>
            <AdminTab to="/_authenticated/admin/audit">Audit log</AdminTab>
          </nav>
          <Link
            to="/"
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  );
}

function AdminTab({
  to,
  children,
  exact,
}: {
  to: string;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const linkPath = to.replace("/_authenticated", "");
  const active = exact ? pathname === linkPath : pathname.startsWith(linkPath);
  return (
    <Link
      to={linkPath as any}
      className={`rounded-md px-3 py-1.5 text-sm ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      }`}
    >
      {children}
    </Link>
  );
}

export function AdminLoading() {
  return (
    <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}
