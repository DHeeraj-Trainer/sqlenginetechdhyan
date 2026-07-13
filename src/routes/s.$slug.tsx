import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "sql-formatter";
import { Copy, Database, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSharedQuery } from "@/lib/workbench.functions";

const sharedQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["shared-query", slug],
    queryFn: async () => {
      const row = await getSharedQuery({ data: { slug } });
      if (!row) throw notFound();
      return row;
    },
    staleTime: 60_000,
  });

export const Route = createFileRoute("/s/$slug")({
  loader: async ({ params, context }) => {
    // SSR caching: shared queries are effectively immutable content. Emit
    // CDN-friendly Cache-Control so bursts of concurrent viewers hit the
    // edge cache instead of hammering the database.
    //   - s-maxage: 5 min at the CDN
    //   - stale-while-revalidate: 1 hour serve-stale while refreshing
    // Cache-invalidation: admin actions that change a share (make_private,
    // delete) bump the row, and the next miss refetches; for an explicit
    // purge, delete the share from the admin panel.
    const { setPublicCacheHeaders } = await import("@/lib/ssr-cache.server");
    await setPublicCacheHeaders();
    return context.queryClient.ensureQueryData(sharedQueryOptions(params.slug));
  },
  head: ({ loaderData }) => {
    const title = loaderData?.title ?? "Shared query";
    const desc =
      loaderData?.description ??
      `A ${loaderData?.engine ?? "SQL"} query shared from the SQL Workbench.`;
    return {
      meta: [
        { title: `${title} · SQL Workbench` },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: SharedQueryPage,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold">Query not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This shared link no longer exists or was made private.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open workbench
        </Link>
      </div>
    </div>
  ),
});

function SharedQueryPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(sharedQueryOptions(slug));

  const pretty = (() => {
    try {
      return format(data.sql, { language: "sql", keywordCase: "upper" });
    } catch {
      return data.sql;
    }
  })();

  const copy = async () => {
    await navigator.clipboard.writeText(data.sql);
    toast.success("SQL copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Database className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{data.title}</h1>
            <p className="text-xs text-muted-foreground">
              Engine: {data.engine.toUpperCase()} · {data.view_count.toLocaleString()} view
              {data.view_count === 1 ? "" : "s"}
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Open in Workbench</span>
            <span className="sm:hidden">Open</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {data.description && (
          <p className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            {data.description}
          </p>
        )}
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">SQL</span>
            <Button size="sm" variant="ghost" className="h-7" onClick={copy}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
            <code>{pretty}</code>
          </pre>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Shared via the SQL Online Training Portal ·{" "}
          <Link to="/" className="underline hover:text-foreground">
            Try it yourself
          </Link>
        </p>
      </main>
    </div>
  );
}
