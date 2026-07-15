import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup", "reset"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign In — SQL Workbench" },
      { name: "description", content: "Sign in or create an account to save your SQL queries, snippets, and history." },
    ],
  }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, mode } = useSearch({ from: "/auth" });
  const [tab, setTab] = useState<"signin" | "signup" | "reset">(mode ?? "signin");

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect || "/" });
    });
  }, [navigate, redirect]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Database className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SQL Workbench</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to sync tabs, snippets, and history</p>
        </div>

        <Card>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
                <TabsTrigger value="reset">Reset</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="signin" className="mt-0">
                <SignInForm redirectTo={redirect} />
              </TabsContent>
              <TabsContent value="signup" className="mt-0">
                <SignUpForm redirectTo={redirect} />
              </TabsContent>
              <TabsContent value="reset" className="mt-0">
                <ResetForm />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">
            ← Continue without signing in
          </Link>
        </div>
      </div>
    </div>
  );
}

function GoogleButton({ redirectTo }: { redirectTo?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if (redirectTo) sessionStorage.setItem("wb.postAuthRedirect", redirectTo);
          // Return to the caller's intended path (e.g. OAuth consent) after Google sign-in.
          const returnUrl =
            redirectTo && redirectTo.startsWith("/")
              ? window.location.origin + redirectTo
              : window.location.origin;
          const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: returnUrl });
          if (res.error) {
            toast.error("Google sign-in failed", { description: res.error.message });
            setBusy(false);
          }
        } catch (e) {
          toast.error("Google sign-in failed", { description: (e as Error).message });
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.4 14.7 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
      )}
      Continue with Google
    </Button>
  );
}

function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) {
          toast.error("Sign in failed", { description: error.message });
        } else {
          toast.success("Welcome back");
          navigate({ to: redirectTo || "/" });
        }
      }}
    >
      <GoogleButton redirectTo={redirectTo} />
      <Separator label="or with email" />
      <div className="space-y-2">
        <Label htmlFor="si-email">Email</Label>
        <Input id="si-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="si-pw">Password</Label>
        <Input id="si-pw" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm({ redirectTo }: { redirectTo?: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        setBusy(false);
        if (error) {
          toast.error("Sign up failed", { description: error.message });
        } else if (data.session) {
          toast.success("Account created");
          navigate({ to: redirectTo || "/" });
        } else {
          toast.success("Check your email to confirm your account");
        }
      }}
    >
      <GoogleButton redirectTo={redirectTo} />
      <Separator label="or with email" />
      <div className="space-y-2">
        <Label htmlFor="su-name">Display name</Label>
        <Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-pw">Password</Label>
        <Input id="su-pw" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}

function ResetForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        setBusy(false);
        if (error) toast.error("Could not send reset email", { description: error.message });
        else toast.success("Password reset email sent");
      }}
    >
      <CardDescription>Enter your email — we'll send a reset link.</CardDescription>
      <div className="space-y-2">
        <Label htmlFor="rs-email">Email</Label>
        <Input id="rs-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send reset link
      </Button>
    </form>
  );
}

function Separator({ label }: { label: string }) {
  return (
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

// Placeholder title binding for Card in this route (some ide typechecks reference CardTitle)
export const _CardTitle = CardTitle;
