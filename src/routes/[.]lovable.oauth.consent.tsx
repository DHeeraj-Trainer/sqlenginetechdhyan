import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

// Beta namespace typing shim — the installed @supabase/supabase-js exposes
// auth.oauth at runtime but the type surface lags behind.
type AuthorizationDetails = {
  client?: { name?: string; client_name?: string; redirect_uri?: string; redirect_uris?: string[] } | null;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type OauthAPI = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
};
const authOauth = (supabase.auth as unknown as { oauth: OauthAPI }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { redirect: next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await authOauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
      return data;
    }
    return data;
  },
  component: ConsentPage,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-6">
      <Card>
        <CardHeader>
          <CardTitle>Authorization error</CardTitle>
          <CardDescription>{String((error as Error)?.message ?? error)}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  ),
});

function ConsentPage() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.client_name ?? details?.client?.name ?? "an app";
  const redirectUri =
    details?.client?.redirect_uri ?? details?.client?.redirect_uris?.[0] ?? "";
  const scopes =
    details?.scopes ??
    (typeof details?.scope === "string" ? details.scope.split(/\s+/).filter(Boolean) : []);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error } = approve
      ? await authOauth.approveAuthorization(authorization_id)
      : await authOauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle>Connect {clientName} to SQL Workbench</CardTitle>
          <CardDescription>
            This lets {clientName} use SQL Workbench as you. It can call the app's enabled MCP tools
            while you're signed in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {redirectUri && (
            <div className="text-xs text-muted-foreground">
              Redirects to: <code className="rounded bg-muted px-1 py-0.5">{redirectUri}</code>
            </div>
          )}
          {scopes.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Requested permissions
              </div>
              <ul className="list-inside list-disc text-sm">
                {scopes.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            This does not bypass this app's permissions or backend policies. Tools act under
            Row-Level Security as your account.
          </p>
          {error && (
            <div role="alert" className="rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy !== null} onClick={() => decide(true)}>
              {busy === "approve" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={busy !== null}
              onClick={() => decide(false)}
            >
              {busy === "deny" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
