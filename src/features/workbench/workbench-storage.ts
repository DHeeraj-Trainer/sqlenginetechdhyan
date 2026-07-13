import { useCallback } from "react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import type { EditorTab, QueryHistoryEntry, SavedSnippet } from "@/types/workbench";

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_TABS: EditorTab[] = [
  {
    id: "welcome",
    name: "welcome.sql",
    content: `-- Welcome to the SQL Workbench.
-- The Chinook Lite sample database is loaded by default.
-- Press Ctrl/Cmd + Enter to run.

SELECT ar.name AS artist, al.title AS album, COUNT(t.track_id) AS tracks
FROM artists ar
JOIN albums al ON al.artist_id = ar.artist_id
JOIN tracks t  ON t.album_id  = al.album_id
GROUP BY ar.name, al.title
ORDER BY tracks DESC;
`,
  },
];

export function useEditorTabs() {
  const [tabs, setTabs] = usePersistedState<EditorTab[]>("wb.tabs.v1", DEFAULT_TABS);
  const [activeId, setActiveId] = usePersistedState<string>("wb.tabs.active.v1", DEFAULT_TABS[0].id);

  const openNewTab = useCallback(
    (content = "-- new query\n") => {
      const id = uid();
      const name = `query-${new Date().toISOString().slice(11, 19)}.sql`;
      setTabs((prev) => [...prev, { id, name, content }]);
      setActiveId(id);
    },
    [setTabs, setActiveId],
  );

  const updateContent = useCallback(
    (id: string, content: string) => {
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)));
    },
    [setTabs],
  );

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (!next.length) {
          const fresh = { id: uid(), name: "query.sql", content: "-- new query\n" };
          setActiveId(fresh.id);
          return [fresh];
        }
        setActiveId((a) => (a === id ? next[0].id : a));
        return next;
      });
    },
    [setTabs, setActiveId],
  );

  const renameTab = useCallback(
    (id: string, name: string) => {
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
    },
    [setTabs],
  );

  return { tabs, activeId, setActiveId, openNewTab, updateContent, closeTab, renameTab };
}

export function useQueryHistory() {
  const [history, setHistory] = usePersistedState<QueryHistoryEntry[]>("wb.history.v1", []);
  const push = useCallback(
    (entry: Omit<QueryHistoryEntry, "id" | "timestamp">) => {
      setHistory((prev) => [{ ...entry, id: uid(), timestamp: Date.now() }, ...prev].slice(0, 200));
    },
    [setHistory],
  );
  const clear = useCallback(() => setHistory([]), [setHistory]);
  return { history, push, clear };
}

export function useSavedSnippets() {
  const [snippets, setSnippets] = usePersistedState<SavedSnippet[]>("wb.snippets.v1", []);
  const save = useCallback(
    (input: Omit<SavedSnippet, "id" | "createdAt">) => {
      setSnippets((prev) => [{ ...input, id: uid(), createdAt: Date.now() }, ...prev]);
    },
    [setSnippets],
  );
  const remove = useCallback(
    (id: string) => setSnippets((prev) => prev.filter((s) => s.id !== id)),
    [setSnippets],
  );
  return { snippets, save, remove };
}
