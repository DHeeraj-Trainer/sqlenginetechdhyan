import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, ExternalLink, Loader2, Lock, ShieldCheck } from "lucide-react";

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

// Plain-language descriptions for each MCP scope. Keep in sync with
// src/lib/mcp/tools/*.ts — anything new should get a friendly line here so
// end users understand what they're granting.
const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "read:profile": "See your name and email in this app",
  "read:snippets": "View your saved SQL snippets",
  "write:snippets": "Create, edit, and delete your saved SQL snippets",
  "read:history": "View your query execution history",
  "read:shared": "View publicly shared queries in this workspace",
  "mcp:invoke": "Call this app's MCP tools on your behalf",
  openid: "Confirm your identity",
  email: "See your email address",
  profile: "See your basic profile info",
  offline_access: "Stay connected until you sign out or revoke access",
};

function describeScope(s: string): string {
  return SCOPE_DESCRIPTIONS[s] ?? `Access ${s.replace(/[:_]/g, " ")}`;
}

function scopeIcon(s: string) {
  if (s.startsWith("write:") || s.includes("admin")) return Lock;
  return ShieldCheck;
}

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
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const clientName = details?.client?.client_name ?? details?.client?.name ?? "an external app";
  const redirectUri =
    details?.client?.redirect_uri ?? details?.client?.redirect_uris?.[0] ?? "";
  const redirectHost = (() => {
    try {
      return redirectUri ? new URL(redirectUri).host : "";
    } catch {
      return "";
    }
  })();
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
      // Deny with no redirect: land on home with an explicit denial message.
      if (!approve) {
        window.location.href = "/?oauth=denied";
        return;
      }
      setBusy(null);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  async function switchAccount() {
    // Sign out on this browser, then send the user back to /auth preserving
    // this consent page as the post-login redirect.
    const next = `/.lovable/oauth/consent?authorization_id=${encodeURIComponent(authorization_id)}`;
    await supabase.auth.signOut();
    window.location.href = `/auth?redirect=${encodeURIComponent(next)}`;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Database className="h-5 w-5" />
            </div>
            <span className="text-xs text-muted-foreground">↔</span>
            <div className="grid h-10 w-10 place-items-center rounded-lg border-2 border-dashed border-muted-foreground/40 text-muted-foreground">
              <ExternalLink className="h-5 w-5" />
            </div>
          </div>
          <CardTitle className="text-lg">
            Connect <span className="text-primary">{clientName}</span> to SQL Workbench
          </CardTitle>
          <CardDescription>
            {clientName} is requesting permission to act as you in SQL Workbench through the
            Model Context Protocol.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {email && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
              <div className="text-muted-foreground">Signed in as</div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{email}</span>
                <button
                  type="button"
                  onClick={switchAccount}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Switch account
                </button>
              </div>
            </div>
          )}

          {redirectHost && (
            <div className="text-xs text-muted-foreground">
              After you decide, you'll be sent back to{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-medium text-foreground">
                {redirectHost}
              </code>
            </div>
          )}

          {scopes.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                This will let {clientName}:
              </div>
              <ul className="space-y-1.5">
                {scopes.map((s: string) => {
                  const Icon = scopeIcon(s);
                  return (
                    <li key={s} className="flex items-start gap-2 rounded-md border bg-card p-2">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <div className="text-sm">{describeScope(s)}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{s}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="rounded border border-dashed p-3 text-xs text-muted-foreground">
              No specific scopes were requested. The app will use default MCP tool access.
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            <ShieldCheck className="mr-1 inline h-3 w-3 text-primary" />
            Row-Level Security is always enforced — tools can only see and change data that
            your account is already allowed to access. You can revoke this connection at any
            time from your account settings.
          </p>

          {error && (
            <div
              role="alert"
              className="rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              disabled={busy !== null}
              onClick={() => decide(false)}
            >
              {busy === "deny" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deny
            </Button>
            <Button className="flex-1" disabled={busy !== null} onClick={() => decide(true)}>
              {busy === "approve" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Allow access
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

