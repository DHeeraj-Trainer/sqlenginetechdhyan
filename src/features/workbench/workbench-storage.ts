import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { EditorTab, EngineId, QueryHistoryEntry, SavedSnippet } from "@/types/workbench";
import { useAuth } from "@/hooks/use-auth";
import {
  listTabs,
  upsertTab,
  deleteTab,
  listHistory,
  pushHistory as pushHistoryFn,
  clearHistory as clearHistoryFn,
  listSnippets,
  saveSnippet as saveSnippetFn,
  deleteSnippet as deleteSnippetFn,
  createShare,
} from "@/lib/workbench.functions";
import { usePersistedState } from "@/hooks/use-persisted-state";

/* ------------------------------------------------------------------ */
/*  Tabs                                                              */
/* ------------------------------------------------------------------ */

const DEFAULT_TAB_CONTENT = `-- Welcome to the SQL Workbench.
-- The Chinook Lite sample database is loaded by default.
-- Press Ctrl/Cmd + Enter to run.

SELECT ar.name AS artist, al.title AS album, COUNT(t.track_id) AS tracks
FROM artists ar
JOIN albums al ON al.artist_id = ar.artist_id
JOIN tracks t  ON t.album_id  = al.album_id
GROUP BY ar.name, al.title
ORDER BY tracks DESC;
`;

const uid = () => Math.random().toString(36).slice(2, 10);

function makeDefaultTab(): EditorTab {
  return { id: `local-${uid()}`, name: "welcome.sql", content: DEFAULT_TAB_CONTENT };
}

/**
 * Hybrid tabs: signed-in users sync with Lovable Cloud, guests keep localStorage.
 * The API is unchanged from the previous localStorage-only version so the
 * workbench shell does not need to know which mode is active.
 */
export function useEditorTabs() {
  const { user } = useAuth();
  const signedIn = !!user;
  const qc = useQueryClient();

  // Local fallback (guest mode)
  const [localTabs, setLocalTabs] = usePersistedState<EditorTab[]>("wb.tabs.v1", [makeDefaultTab()]);
  const [localActive, setLocalActive] = usePersistedState<string>("wb.tabs.active.v1", localTabs[0]?.id ?? "local");

  const remote = useQuery({
    queryKey: ["wb", "tabs"],
    queryFn: () => listTabs(),
    enabled: signedIn,
    staleTime: 30_000,
  });

  const upsertFn = useServerFn(upsertTab);
  const deleteFn = useServerFn(deleteTab);

  const remoteTabs: EditorTab[] = useMemo(() => {
    if (!signedIn) return [];
    const rows = remote.data ?? [];
    if (!rows.length) return [];
    return rows.map((r) => ({ id: r.id, name: r.title, content: r.sql }));
  }, [remote.data, signedIn]);

  const activeRemoteId = useMemo(() => {
    const rows = remote.data ?? [];
    return rows.find((r) => r.is_active)?.id ?? rows[0]?.id ?? null;
  }, [remote.data]);

  // Seed a default remote tab on first login
  useEffect(() => {
    if (!signedIn || remote.isLoading || remote.error) return;
    if ((remote.data ?? []).length === 0) {
      void upsertFn({
        data: {
          title: "welcome.sql",
          sql: DEFAULT_TAB_CONTENT,
          engine: "sqlite",
          sortOrder: 0,
          isActive: true,
        },
      }).then(() => qc.invalidateQueries({ queryKey: ["wb", "tabs"] }));
    }
  }, [signedIn, remote.isLoading, remote.error, remote.data, upsertFn, qc]);

  const tabs = signedIn ? remoteTabs : localTabs;
  const activeId = signedIn ? activeRemoteId ?? tabs[0]?.id ?? "" : localActive;

  const setActiveId = useCallback(
    (id: string) => {
      if (!signedIn) {
        setLocalActive(id);
        return;
      }
      // Optimistic
      qc.setQueryData<Array<{ id: string; is_active: boolean }>>(["wb", "tabs"], (prev) =>
        (prev ?? []).map((t) => ({ ...t, is_active: t.id === id })),
      );
      const tab = (remote.data ?? []).find((r) => r.id === id);
      if (!tab) return;
      void upsertFn({
        data: {
          id: tab.id,
          title: tab.title,
          sql: tab.sql,
          engine: tab.engine as EngineId,
          sortOrder: tab.sort_order,
          isActive: true,
        },
      });
    },
    [signedIn, setLocalActive, qc, upsertFn, remote.data],
  );

  const openNewTab = useCallback(
    (content = "-- new query\n") => {
      const name = `query-${new Date().toISOString().slice(11, 19)}.sql`;
      if (!signedIn) {
        const id = `local-${uid()}`;
        setLocalTabs((prev) => [...prev, { id, name, content }]);
        setLocalActive(id);
        return;
      }
      const order = (remote.data ?? []).length;
      void upsertFn({
        data: { title: name, sql: content, engine: "sqlite", sortOrder: order, isActive: true },
      }).then(() => qc.invalidateQueries({ queryKey: ["wb", "tabs"] }));
    },
    [signedIn, setLocalTabs, setLocalActive, upsertFn, qc, remote.data],
  );

  const updateContent = useCallback(
    (id: string, content: string) => {
      if (!signedIn) {
        setLocalTabs((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)));
        return;
      }
      const tab = (remote.data ?? []).find((r) => r.id === id);
      if (!tab) return;
      qc.setQueryData<Array<{ id: string; sql: string }>>(["wb", "tabs"], (prev) =>
        (prev ?? []).map((t) => (t.id === id ? { ...t, sql: content } : t)),
      );
      void upsertFn({
        data: {
          id: tab.id,
          title: tab.title,
          sql: content,
          engine: tab.engine as EngineId,
          sortOrder: tab.sort_order,
          isActive: tab.is_active,
        },
      });
    },
    [signedIn, setLocalTabs, remote.data, qc, upsertFn],
  );

  const closeTab = useCallback(
    (id: string) => {
      if (!signedIn) {
        setLocalTabs((prev) => {
          const next = prev.filter((t) => t.id !== id);
          if (!next.length) {
            const fresh = makeDefaultTab();
            setLocalActive(fresh.id);
            return [fresh];
          }
          setLocalActive((a) => (a === id ? next[0].id : a));
          return next;
        });
        return;
      }
      void deleteFn({ data: { id } }).then(() => qc.invalidateQueries({ queryKey: ["wb", "tabs"] }));
    },
    [signedIn, setLocalTabs, setLocalActive, deleteFn, qc],
  );

  const renameTab = useCallback(
    (id: string, name: string) => {
      if (!signedIn) {
        setLocalTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
        return;
      }
      const tab = (remote.data ?? []).find((r) => r.id === id);
      if (!tab) return;
      void upsertFn({
        data: {
          id: tab.id,
          title: name,
          sql: tab.sql,
          engine: tab.engine as EngineId,
          sortOrder: tab.sort_order,
          isActive: tab.is_active,
        },
      }).then(() => qc.invalidateQueries({ queryKey: ["wb", "tabs"] }));
    },
    [signedIn, setLocalTabs, remote.data, upsertFn, qc],
  );

  return { tabs, activeId, setActiveId, openNewTab, updateContent, closeTab, renameTab };
}

/* ------------------------------------------------------------------ */
/*  History                                                           */
/* ------------------------------------------------------------------ */

export function useQueryHistory() {
  const { user } = useAuth();
  const signedIn = !!user;
  const qc = useQueryClient();

  const [localHistory, setLocalHistory] = usePersistedState<QueryHistoryEntry[]>("wb.history.v1", []);
  const remote = useQuery({
    queryKey: ["wb", "history"],
    queryFn: () => listHistory(),
    enabled: signedIn,
    staleTime: 15_000,
  });

  const pushFn = useServerFn(pushHistoryFn);
  const clearFn = useServerFn(clearHistoryFn);

  const remoteHistory: QueryHistoryEntry[] = useMemo(() => {
    if (!signedIn) return [];
    return (remote.data ?? []).map((r) => ({
      id: r.id,
      sql: r.sql,
      engine: r.engine as EngineId,
      timestamp: new Date(r.executed_at).getTime(),
      ok: r.status === "ok",
      durationMs: r.duration_ms,
      error: r.error_message ?? undefined,
    }));
  }, [remote.data, signedIn]);

  const push = useCallback(
    (entry: Omit<QueryHistoryEntry, "id" | "timestamp">) => {
      if (!signedIn) {
        setLocalHistory((prev) =>
          [{ ...entry, id: uid(), timestamp: Date.now() }, ...prev].slice(0, 200),
        );
        return;
      }
      void pushFn({
        data: {
          sql: entry.sql,
          engine: entry.engine,
          status: entry.ok ? "ok" : "error",
          durationMs: Math.max(0, Math.floor(entry.durationMs)),
          errorMessage: entry.error,
        },
      }).then(() => qc.invalidateQueries({ queryKey: ["wb", "history"] }));
    },
    [signedIn, setLocalHistory, pushFn, qc],
  );

  const clear = useCallback(() => {
    if (!signedIn) {
      setLocalHistory([]);
      return;
    }
    void clearFn().then(() => qc.invalidateQueries({ queryKey: ["wb", "history"] }));
  }, [signedIn, setLocalHistory, clearFn, qc]);

  return { history: signedIn ? remoteHistory : localHistory, push, clear };
}

/* ------------------------------------------------------------------ */
/*  Snippets                                                          */
/* ------------------------------------------------------------------ */

export function useSavedSnippets() {
  const { user } = useAuth();
  const signedIn = !!user;
  const qc = useQueryClient();

  const [localSnippets, setLocalSnippets] = usePersistedState<SavedSnippet[]>("wb.snippets.v1", []);
  const remote = useQuery({
    queryKey: ["wb", "snippets"],
    queryFn: () => listSnippets(),
    enabled: signedIn,
    staleTime: 30_000,
  });

  const saveFn = useServerFn(saveSnippetFn);
  const removeFn = useServerFn(deleteSnippetFn);

  const remoteSnippets: SavedSnippet[] = useMemo(() => {
    if (!signedIn) return [];
    return (remote.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      sql: r.sql,
      engine: r.engine as EngineId,
      createdAt: new Date(r.created_at).getTime(),
    }));
  }, [remote.data, signedIn]);

  const save = useCallback(
    (input: Omit<SavedSnippet, "id" | "createdAt">) => {
      if (!signedIn) {
        setLocalSnippets((prev) => [{ ...input, id: uid(), createdAt: Date.now() }, ...prev]);
        return;
      }
      void saveFn({
        data: { name: input.name, sql: input.sql, engine: input.engine, tags: [] },
      }).then(() => qc.invalidateQueries({ queryKey: ["wb", "snippets"] }));
    },
    [signedIn, setLocalSnippets, saveFn, qc],
  );

  const remove = useCallback(
    (id: string) => {
      if (!signedIn) {
        setLocalSnippets((prev) => prev.filter((s) => s.id !== id));
        return;
      }
      void removeFn({ data: { id } }).then(() => qc.invalidateQueries({ queryKey: ["wb", "snippets"] }));
    },
    [signedIn, setLocalSnippets, removeFn, qc],
  );

  return { snippets: signedIn ? remoteSnippets : localSnippets, save, remove };
}

/* ------------------------------------------------------------------ */
/*  Share (Phase 3)                                                   */
/* ------------------------------------------------------------------ */

export function useShareQuery() {
  const { createShare } = require("@/lib/workbench.functions") as typeof import("@/lib/workbench.functions");
  const shareFn = useServerFn(createShare);
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      sql: string;
      engine: EngineId;
    }) => {
      return shareFn({ data: { ...input, visibility: "public" as const } });
    },
  });
}
