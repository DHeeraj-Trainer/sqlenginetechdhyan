import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { EngineId } from "@/types/workbench";

interface ShareRow {
  id: string;
  slug: string;
  title: string | null;
  engine: string;
  visibility: string;
  view_count: number | null;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
}

type TTL = "never" | "1h" | "24h" | "7d" | "30d";
const TTL_HOURS: Record<TTL, number | undefined> = {
  never: undefined,
  "1h": 1,
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTitle: string;
  sql: string;
  engineId: EngineId;
}

function shareUrl(slug: string) {
  return `${window.location.origin}/s/${slug}`;
}

function status(row: ShareRow): { label: string; tone: "ok" | "warn" | "bad" } {
  if (row.revoked) return { label: "Revoked", tone: "bad" };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now())
    return { label: "Expired", tone: "bad" };
  if (row.expires_at) {
    const days = Math.max(
      0,
      Math.round((new Date(row.expires_at).getTime() - Date.now()) / 86_400_000),
    );
    return { label: days > 0 ? `Expires in ${days}d` : "Expires soon", tone: "warn" };
  }
  return { label: "Active", tone: "ok" };
}

export function ShareDialog({ open, onOpenChange, defaultTitle, sql, engineId }: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [ttl, setTtl] = useState<TTL>("7d");
  const [creating, setCreating] = useState(false);
  const [shares, setShares] = useState<ShareRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (open) setTitle(defaultTitle);
  }, [open, defaultTitle]);

  const load = useCallback(async () => {
    try {
      const { listMyShares } = await import("@/lib/workbench.functions");
      const rows = (await listMyShares()) as ShareRow[];
      setShares(rows);
    } catch (err) {
      toast.error("Could not load your shares", { description: (err as Error).message });
      setShares([]);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const create = async () => {
    if (!sql.trim()) {
      toast.error("Nothing to share — the active tab is empty.");
      return;
    }
    setCreating(true);
    try {
      const { createShare } = await import("@/lib/workbench.functions");
      const res = (await createShare({
        data: {
          title: title || "Shared query",
          sql,
          engine: engineId,
          visibility: "public" as const,
          ttlHours: TTL_HOURS[ttl],
        },
      })) as { slug: string };
      const url = shareUrl(res.slug);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Share link created & copied", { description: url });
      await load();
    } catch (err) {
      toast.error("Could not create share link", { description: (err as Error).message });
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (row: ShareRow) => {
    setBusyId(row.id);
    try {
      const { revokeShare } = await import("@/lib/workbench.functions");
      await revokeShare({ data: { id: row.id } });
      toast.success("Share link revoked");
      await load();
    } catch (err) {
      toast.error("Could not revoke", { description: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (slug: string) => {
    const url = shareUrl(slug);
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Copied", { description: url });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Share query
          </DialogTitle>
          <DialogDescription>
            Create a public link to the current tab. Links can be revoked at any time.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="share-title" className="text-xs">
                Title
              </Label>
              <Input
                id="share-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Shared query"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expires</Label>
              <Select value={ttl} onValueChange={(v) => setTtl(v as TTL)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="24h">24 hours</SelectItem>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={create} disabled={creating} className="w-full">
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
              </>
            ) : (
              "Create share link"
            )}
          </Button>
        </section>

        <Separator />

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your share links
            </h3>
            {shares && (
              <span className="text-[11px] text-muted-foreground">{shares.length} total</span>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto rounded border">
            {shares === null ? (
              <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading…
              </div>
            ) : shares.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No share links yet.
              </div>
            ) : (
              <ul className="divide-y">
                {shares.map((r) => {
                  const st = status(r);
                  const tone =
                    st.tone === "ok"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : st.tone === "warn"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-rose-500/15 text-rose-400";
                  return (
                    <li key={r.id} className="flex items-center gap-2 p-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">
                            {r.title || "Untitled share"}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${tone}`}>
                            {st.label}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-mono">/s/{r.slug}</span>
                          <span>·</span>
                          <span>{r.engine}</span>
                          <span>·</span>
                          <span>{r.view_count ?? 0} views</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => copy(r.slug)}
                        aria-label="Copy link"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        asChild
                        aria-label="Open link"
                      >
                        <a href={shareUrl(r.slug)} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-rose-400 hover:text-rose-300"
                        disabled={r.revoked || busyId === r.id}
                        onClick={() => revoke(r)}
                        aria-label="Revoke link"
                      >
                        {busyId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
