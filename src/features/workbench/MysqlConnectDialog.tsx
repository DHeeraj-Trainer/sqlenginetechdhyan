/**
 * "Connect MySQL server…" dialog.
 *
 * Lists the current user's saved live-MySQL connections and lets them
 * add / edit / delete / test / activate one. Selecting a connection sets
 * it on the live engine and switches the workbench to `mysql-live`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  listMysqlConnections,
  saveMysqlConnection,
  deleteMysqlConnection,
  testMysqlConnection,
  type StoredMysqlConnection,
} from "@/lib/mysql-live.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeConnectionId: string | null;
  onActivate: (conn: StoredMysqlConnection) => Promise<void> | void;
  onDisconnect: () => void;
}

interface FormState {
  id?: string;
  label: string;
  host: string;
  port: string;
  username: string;
  password: string;
  databaseName: string;
  useTls: boolean;
}

const EMPTY_FORM: FormState = {
  label: "",
  host: "",
  port: "3306",
  username: "",
  password: "",
  databaseName: "",
  useTls: true,
};

export function MysqlConnectDialog({ open, onOpenChange, activeConnectionId, onActivate, onDisconnect }: Props) {
  const [connections, setConnections] = useState<StoredMysqlConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listMysqlConnections();
      setConnections(list);
    } catch (e) {
      // Not signed in / auth missing — fall back to empty list.
      setConnections([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setError(null);
      void reload();
    }
  }, [open, reload]);

  const editing = form.id !== undefined;

  const validate = (): string | null => {
    if (!form.label.trim()) return "Label is required";
    if (!form.host.trim()) return "Host is required";
    const port = Number(form.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return "Port must be 1–65535";
    if (!form.username.trim()) return "Username is required";
    if (!form.password) return "Password is required";
    if (!form.databaseName.trim()) return "Database name is required";
    return null;
  };

  const buildInline = () => ({
    label: form.label.trim(),
    host: form.host.trim(),
    port: Number(form.port),
    username: form.username.trim(),
    password: form.password,
    databaseName: form.databaseName.trim(),
    useTls: form.useTls,
  });

  const handleTest = async () => {
    const err = validate();
    if (err) return setError(err);
    setError(null);
    setTesting(true);
    try {
      const res = await testMysqlConnection({ data: { inlineConfig: buildInline() } });
      toast.success(`Connected to ${res.database}`, {
        description: `MySQL ${res.serverVersion} · ${res.latencyMs} ms`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error("Connection failed", { description: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (activate: boolean) => {
    const err = validate();
    if (err) return setError(err);
    setError(null);
    setSaving(true);
    try {
      const payload = { ...buildInline(), id: form.id };
      const { id } = await saveMysqlConnection({ data: payload });
      toast.success(editing ? "Connection updated" : "Connection saved");
      await reload();
      if (activate) {
        const stored: StoredMysqlConnection = {
          id,
          label: payload.label,
          host: payload.host,
          port: payload.port,
          username: payload.username,
          databaseName: payload.databaseName,
          useTls: payload.useTls,
          updatedAt: new Date().toISOString(),
        };
        await onActivate(stored);
        onOpenChange(false);
      } else {
        setForm(EMPTY_FORM);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this saved connection? This does not affect the MySQL server itself.")) return;
    try {
      await deleteMysqlConnection({ data: { id } });
      toast.success("Connection deleted");
      if (activeConnectionId === id) onDisconnect();
      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Delete failed", { description: msg });
    }
  };

  const handleEdit = (c: StoredMysqlConnection) => {
    setForm({
      id: c.id,
      label: c.label,
      host: c.host,
      port: String(c.port),
      username: c.username,
      password: "", // never returned from server; require re-entry on edit
      databaseName: c.databaseName,
      useTls: c.useTls,
    });
    setError(null);
  };

  const handleConnect = async (c: StoredMysqlConnection) => {
    setTesting(true);
    try {
      await testMysqlConnection({ data: { connectionId: c.id } });
      await onActivate(c);
      toast.success(`Connected to ${c.label}`);
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Connection failed", { description: msg });
    } finally {
      setTesting(false);
    }
  };

  const savedList = useMemo(() => connections, [connections]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect MySQL server</DialogTitle>
          <DialogDescription>
            Queries run through Lovable's backend against your MySQL server over TCP + TLS. The
            host must be reachable from the public internet.
          </DialogDescription>
        </DialogHeader>

        {savedList.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saved connections
            </div>
            <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
              {savedList.map((c) => {
                const active = c.id === activeConnectionId;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-sm ${active ? "bg-primary/10" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {c.label} {active && <span className="text-xs text-primary">· active</span>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {c.username}@{c.host}:{c.port}/{c.databaseName} {c.useTls ? "· TLS" : ""}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(c)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void handleConnect(c)} disabled={testing}>
                      <Zap className="mr-1 h-3.5 w-3.5" />
                      Connect
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => void handleDelete(c.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {editing ? "Edit connection" : "New connection"}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="my-label">Label</Label>
              <Input
                id="my-label"
                placeholder="Production MySQL"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="my-host">Host</Label>
              <Input
                id="my-host"
                placeholder="db.example.com"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="my-port">Port</Label>
              <Input
                id="my-port"
                type="number"
                min={1}
                max={65535}
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="my-user">Username</Label>
              <Input
                id="my-user"
                autoComplete="off"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="my-pass">Password</Label>
              <Input
                id="my-pass"
                type="password"
                autoComplete="new-password"
                placeholder={editing ? "(unchanged if left blank — enter to update)" : ""}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="my-db">Database</Label>
              <Input
                id="my-db"
                value={form.databaseName}
                onChange={(e) => setForm({ ...form, databaseName: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="mb-0">Require TLS</Label>
                <div className="text-xs text-muted-foreground">
                  Encrypts the connection. Required by most managed MySQL providers.
                </div>
              </div>
              <Switch
                checked={form.useTls}
                onCheckedChange={(v) => setForm({ ...form, useTls: v })}
              />
            </div>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2">
            {editing && (
              <Button variant="ghost" onClick={() => setForm(EMPTY_FORM)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> New
              </Button>
            )}
            <Button variant="outline" onClick={() => void handleTest()} disabled={testing || saving}>
              {testing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Test connection
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave(false)} disabled={saving || testing} variant="outline">
              Save
            </Button>
            <Button onClick={() => void handleSave(true)} disabled={saving || testing}>
              {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Save & connect
            </Button>
          </div>
        </DialogFooter>

        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
