import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import {
  Bookmark,
  Clock,
  Database,
  GraduationCap,
  History,
  Layers,
  LogIn,
  LogOut,
  Play,
  Plus,
  Save,
  Sparkles,
  Sun,
  Moon,
  Upload,
  User as UserIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "sql-formatter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EngineProvider, useEngine } from "@/lib/db/engine-provider";
import { MonacoSqlEditor } from "@/features/sql-editor/MonacoSqlEditor";
import { ResultsGrid } from "@/features/database/ResultsGrid";
import { DatabaseExplorer } from "@/features/database/DatabaseExplorer";
import { AiTutorPanel } from "@/features/ai/AiTutorPanel";
import { LearnPanel } from "@/features/tutorials/LearnPanel";
import {
  useEditorTabs,
  useQueryHistory,
  useSavedSnippets,
} from "@/features/workbench/workbench-storage";
import type { EngineId, QueryResult } from "@/types/workbench";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAuth, signOut } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";


type SidebarSection = "database" | "history" | "snippets" | "learn";

const SIDEBAR_LABEL: Record<SidebarSection, string> = {
  database: "Database explorer",
  history: "Query history",
  snippets: "Saved snippets",
  learn: "Learn",
};

export function Workbench() {
  return (
    <EngineProvider>
      <WorkbenchInner />
    </EngineProvider>
  );
}

function WorkbenchInner() {
  const { engineId, switchEngine, status, error, tables } = useEngine();
  const [theme, setTheme] = usePersistedState<"light" | "dark">("wb.theme.v1", "light");
  const [sidebar, setSidebar] = useState<SidebarSection>("database");
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = usePersistedState<boolean>("wb.sidebar.open.v1", true);
  const [editorHidden, setEditorHidden] = usePersistedState<boolean>("wb.editor.hidden.v1", false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [results, setResults] = useState<QueryResult[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [activeResultIdx, setActiveResultIdx] = useState(0);
  const [lastQuery, setLastQuery] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);

  const { tabs, activeId, setActiveId, openNewTab, updateContent, closeTab } = useEditorTabs();
  const { history, push: pushHistory, clear: clearHistory } = useQueryHistory();
  const { snippets, save: saveSnippet, remove: removeSnippet } = useSavedSnippets();

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  // Sync theme class on <html> so shadcn dark variants apply.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Expose schema words for Monaco autocomplete.
  useEffect(() => {
    const words: string[] = [];
    for (const t of tables) {
      words.push(t.name);
      for (const c of t.columns) words.push(c.name);
    }
    (window as unknown as { __wb_schema_words?: string[] }).__wb_schema_words = Array.from(new Set(words));
  }, [tables]);

  const runActive = useCallback(async () => {
    if (!activeTab) return;
    const sql = activeTab.content;
    setLastQuery(sql);
    const { runQuery } = getEngineCtx();
    const res = await runQuery(sql);
    if (res.error) {
      setResults(null);
      setRunError(res.error);
      pushHistory({ sql, engine: engineId, ok: false, durationMs: res.durationMs, error: res.error });
      toast.error("Query failed", { description: res.error.slice(0, 200) });
    } else {
      setResults(res.results);
      setRunError(null);
      setActiveResultIdx(0);
      pushHistory({ sql, engine: engineId, ok: true, durationMs: res.durationMs });
      toast.success(`Ran in ${res.durationMs.toFixed(0)} ms`);
    }
  }, [activeTab, engineId, pushHistory]);

  // Trick to access engine ctx inside a callback captured for buttons/shortcuts.
  const engineCtxRef = useRef(useEngine());
  engineCtxRef.current = useEngine();
  function getEngineCtx() {
    return engineCtxRef.current;
  }

  const insertAtEditor = useCallback(
    (sql: string, newTab = false) => {
      if (newTab) openNewTab(sql);
      else if (activeTab) updateContent(activeTab.id, sql);
    },
    [activeTab, openNewTab, updateContent],
  );

  const applyTutorSql = useCallback(
    (sql: string) => {
      insertAtEditor(sql);
      toast.success("Query applied to editor");
    },
    [insertAtEditor],
  );

  const formatActive = () => {
    if (!activeTab) return;
    try {
      const out = format(activeTab.content, { language: "sql", keywordCase: "upper" });
      updateContent(activeTab.id, out);
    } catch (e) {
      toast.error("Formatting failed", { description: (e as Error).message });
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sql,.txt";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      openNewTab(text);
      toast.success(`Imported ${file.name}`);
    };
    input.click();
  };

  const handleExport = () => {
    if (!activeTab) return;
    const blob = new Blob([activeTab.content], { type: "text/sql;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeTab.name.endsWith(".sql") ? activeTab.name : `${activeTab.name}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeResult = results?.[activeResultIdx];

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopBar
        engineId={engineId}
        onSwitchEngine={switchEngine}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onOpenTutor={() => setTutorOpen(true)}
        onImport={handleImport}
        onExport={handleExport}
        onFormat={formatActive}
        onShare={async () => {
          if (!activeTab?.content.trim()) {
            toast.error("Nothing to share — tab is empty.");
            return;
          }
          try {
            const { createShare } = await import("@/lib/workbench.functions");
            const res = await createShare({
              data: {
                title: activeTab.name || "Shared query",
                sql: activeTab.content,
                engine: engineId,
                visibility: "public" as const,
              },
            });
            const url = `${window.location.origin}/s/${res.slug}`;
            await navigator.clipboard.writeText(url);
            toast.success("Share link copied to clipboard", { description: url });
          } catch (err) {
            toast.error("Could not create share link", {
              description: (err as Error).message,
            });
          }
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <SidebarRail
          active={sidebar}
          onSelect={(s) => {
            setSidebar(s);
            if (isMobile) setMobileSidebarOpen(true);
            else if (!sidebarOpen) setSidebarOpen(true);
          }}
          collapsed={isMobile ? false : !sidebarOpen}
          onToggleCollapse={
            isMobile
              ? () => setMobileSidebarOpen((v) => !v)
              : () => setSidebarOpen((v) => !v)
          }
        />

        <PanelGroup orientation="horizontal" className="flex-1">
          {!isMobile && sidebarOpen && (
            <>
              <Panel
                defaultSize="280px"
                minSize="240px"
                maxSize="480px"
                collapsible
              >
                <aside
                  role="region"
                  aria-label={SIDEBAR_LABEL[sidebar]}
                  id={`sidebar-panel-${sidebar}`}
                  className="flex h-full min-w-0 flex-col border-r bg-card"
                >
                  <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/40 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span className="truncate">{SIDEBAR_LABEL[sidebar]}</span>
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(false)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label="Collapse sidebar"
                    >
                      <PanelLeftClose className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <SidebarBody
                      section={sidebar}
                      history={history}
                      snippets={snippets}
                      onInsert={(sql) => insertAtEditor(sql)}
                      onLoadNewTab={(sql) => insertAtEditor(sql, true)}
                      onClearHistory={clearHistory}
                      onDeleteSnippet={removeSnippet}
                      onOpenLearn={(sql) => openNewTab(sql)}
                    />
                  </div>
                </aside>
              </Panel>
              <PanelResizeHandle
                className="w-1.5 bg-border/60 outline-none transition-colors hover:bg-primary/50 focus-visible:bg-primary"
                aria-label="Resize sidebar"
              />
            </>
          )}

          <Panel minSize={30}>
            <PanelGroup orientation="vertical">
              <Panel defaultSize={55} minSize={20}>
                <section
                  role="region"
                  aria-label="SQL editor"
                  className="flex h-full flex-col"
                  ref={editorRef}
                >
                  <EditorTabs
                    tabs={tabs}
                    activeId={activeTab?.id ?? ""}
                    onSelect={setActiveId}
                    onClose={closeTab}
                    onNew={() => openNewTab()}
                  />
                  <EditorToolbar
                    onRun={runActive}
                    onFormat={formatActive}
                    onSave={() => {
                      if (!activeTab) return;
                      saveSnippet({ name: activeTab.name, sql: activeTab.content, engine: engineId });
                      toast.success("Snippet saved");
                    }}
                    engineStatus={status}
                  />
                  <div className="min-h-0 flex-1">
                    {activeTab && (
                      <MonacoSqlEditor
                        theme={theme}
                        value={activeTab.content}
                        onChange={(v) => updateContent(activeTab.id, v)}
                        onRun={runActive}
                      />
                    )}
                  </div>
                </section>
              </Panel>
              <PanelResizeHandle
                className="h-1.5 bg-border/60 outline-none transition-colors hover:bg-primary/50 focus-visible:bg-primary"
                aria-label="Resize results"
              />
              <Panel defaultSize={45} minSize={15}>
                <section role="region" aria-label="Query results" className="flex h-full flex-col">
                  <ResultsHeader
                    results={results}
                    activeIdx={activeResultIdx}
                    onSelect={setActiveResultIdx}
                    error={runError}
                    engineError={status === "error" ? error : null}
                  />
                  <div className="min-h-0 flex-1">
                    {runError ? (
                      <ErrorPanel
                        message={runError}
                        onAskTutor={() => setTutorOpen(true)}
                      />
                    ) : activeResult ? (
                      <ResultsGrid result={activeResult} />
                    ) : (
                      <EmptyResults status={status} engineError={error} />
                    )}
                  </div>
                </section>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {/* Mobile drawer sidebar */}
      <Sheet open={isMobile && mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[min(88vw,340px)] p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-sm">{SIDEBAR_LABEL[sidebar]}</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-3.25rem)] overflow-hidden">
            <SidebarBody
              section={sidebar}
              history={history}
              snippets={snippets}
              onInsert={(sql) => {
                insertAtEditor(sql);
                setMobileSidebarOpen(false);
              }}
              onLoadNewTab={(sql) => {
                insertAtEditor(sql, true);
                setMobileSidebarOpen(false);
              }}
              onClearHistory={clearHistory}
              onDeleteSnippet={removeSnippet}
              onOpenLearn={(sql) => {
                openNewTab(sql);
                setMobileSidebarOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AiTutorPanel
        isOpen={tutorOpen}
        onClose={() => setTutorOpen(false)}
        lastQuery={lastQuery}
        lastError={runError}
        onApplyQuery={applyTutorSql}
      />
    </div>
  );
}

function TopBar({
  engineId,
  onSwitchEngine,
  theme,
  onToggleTheme,
  onOpenTutor,
  onImport,
  onExport,
  onFormat,
  onShare,
}: {
  engineId: EngineId;
  onSwitchEngine: (id: EngineId) => Promise<void>;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenTutor: () => void;
  onImport: () => void;
  onExport: () => void;
  onFormat: () => void;
  onShare: () => void | Promise<void>;
}) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b bg-muted/30 px-3">
      <div className="flex items-center gap-2 font-semibold">
        <Database className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">SQL Workbench</span>
      </div>
      <div className="mx-2 h-4 w-px bg-border" />
      <EngineSwitcher engineId={engineId} onSwitch={onSwitchEngine} />
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="ghost" className="h-8" onClick={onFormat}>
          Format
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={onImport}>
          <Upload className="mr-1 h-3.5 w-3.5" /> Import SQL
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={onExport}>
          Export
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => void onShare()} aria-label="Share query">
          Share
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button size="sm" onClick={onOpenTutor}>
          <Sparkles className="mr-1 h-3.5 w-3.5" /> AI Tutor
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <UserMenu />
      </div>
    </header>
  );
}

function UserMenu() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />;
  }

  if (!user) {
    return (
      <Button size="sm" variant="outline" className="h-8" asChild>
        <Link to="/auth">
          <LogIn className="mr-1 h-3.5 w-3.5" />
          Sign in
        </Link>
      </Button>
    );
  }

  const initials = (user.user_metadata?.full_name || user.email || "?")
    .split(/\s+/)
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted"
          aria-label="Account menu"
        >
          <Avatar className="h-7 w-7">
            {user.user_metadata?.avatar_url && (
              <AvatarImage src={user.user_metadata.avatar_url} alt="" />
            )}
            <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-xs font-medium">
            {user.user_metadata?.full_name || "Signed in"}
          </span>
          <span className="text-[11px] font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            toast.success("Signed out");
          }}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EngineSwitcher({ engineId, onSwitch }: { engineId: EngineId; onSwitch: (id: EngineId) => Promise<void> }) {
  const labels: Record<EngineId, string> = {
    sqlite: "SQLite (sql.js)",
    postgres: "PostgreSQL (PGlite)",
    alasql: "AlaSQL",
    mysql: "MySQL (server)",
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <Layers className="mr-1 h-3.5 w-3.5" />
          {labels[engineId]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>SQL engine</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(["sqlite", "postgres", "alasql"] as EngineId[]).map((id) => (
          <DropdownMenuItem key={id} onClick={() => void onSwitch(id)}>
            {labels[id]} {engineId === id && "✓"}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onClick={() =>
            toast.info("MySQL requires a server connection", {
              description: "Provision a MySQL host and add its connection string as a project secret to enable.",
            })
          }
        >
          {labels.mysql} (configure)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarRail({
  active,
  onSelect,
  collapsed,
  onToggleCollapse,
}: {
  active: SidebarSection;
  onSelect: (s: SidebarSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const items: { id: SidebarSection; label: string; icon: React.ReactNode }[] = [
    { id: "database", label: "Database", icon: <Database className="h-4 w-4" /> },
    { id: "history", label: "History", icon: <History className="h-4 w-4" /> },
    { id: "snippets", label: "Snippets", icon: <Bookmark className="h-4 w-4" /> },
    { id: "learn", label: "Learn", icon: <GraduationCap className="h-4 w-4" /> },
  ];
  return (
    <nav
      aria-label="Workbench sections"
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r bg-muted/40 py-2"
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
        aria-expanded={!collapsed}
        aria-controls={`sidebar-panel-${active}`}
        className="mb-1 flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
      <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-1">
        {items.map((i) => {
          const selected = active === i.id;
          return (
            <button
              key={i.id}
              role="tab"
              type="button"
              onClick={() => onSelect(i.id)}
              title={i.label}
              aria-selected={selected}
              aria-controls={`sidebar-panel-${i.id}`}
              tabIndex={selected ? 0 : -1}
              className={`flex h-10 w-10 items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {i.icon}
              <span className="sr-only">{i.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SidebarBody({
  section,
  history,
  snippets,
  onInsert,
  onLoadNewTab,
  onClearHistory,
  onDeleteSnippet,
  onOpenLearn,
}: {
  section: SidebarSection;
  history: ReturnType<typeof useQueryHistory>["history"];
  snippets: ReturnType<typeof useSavedSnippets>["snippets"];
  onInsert: (sql: string) => void;
  onLoadNewTab: (sql: string) => void;
  onClearHistory: () => void;
  onDeleteSnippet: (id: string) => void;
  onOpenLearn: (sql: string) => void;
}) {
  return (
    <div
      role="tabpanel"
      id={`sidebar-panel-${section}`}
      aria-label={SIDEBAR_LABEL[section]}
      className="h-full"
    >
      {section === "database" && <DatabaseExplorer onInsertQuery={onInsert} />}
      {section === "history" && (
        <HistoryList history={history} onLoad={onLoadNewTab} onClear={onClearHistory} />
      )}
      {section === "snippets" && (
        <SnippetsList snippets={snippets} onLoad={onLoadNewTab} onDelete={onDeleteSnippet} />
      )}
      {section === "learn" && <LearnPanel onOpenInEditor={(sql) => onOpenLearn(sql)} />}
    </div>
  );
}

function EditorTabs({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
}: {
  tabs: ReturnType<typeof useEditorTabs>["tabs"];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex items-center gap-0 border-b bg-muted/20 pr-2">
      <div role="tablist" aria-label="Query tabs" className="flex overflow-x-auto">
        {tabs.map((t) => {
          const selected = activeId === t.id;
          return (
            <div
              key={t.id}
              className={`group flex items-center gap-1 border-r px-3 py-1.5 text-xs ${
                selected ? "bg-background font-semibold" : "hover:bg-muted/40"
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelect(t.id)}
                className="whitespace-nowrap font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.name}
              </button>
              <button
                type="button"
                onClick={() => onClose(t.id)}
                className="rounded p-0.5 opacity-70 hover:bg-muted focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 sm:opacity-0"
                aria-label={`Close ${t.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={onNew}
        title="New query"
        className="ml-1 rounded p-1 hover:bg-muted"
        aria-label="New query"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function EditorToolbar({
  onRun,
  onFormat,
  onSave,
  engineStatus,
}: {
  onRun: () => void;
  onFormat: () => void;
  onSave: () => void;
  engineStatus: "idle" | "loading" | "ready" | "error";
}) {
  return (
    <div className="flex items-center gap-1 border-b bg-muted/10 px-2 py-1">
      <Button size="sm" onClick={onRun} disabled={engineStatus !== "ready"} className="h-7">
        <Play className="mr-1 h-3.5 w-3.5" /> Run
      </Button>
      <Button size="sm" variant="outline" onClick={onFormat} className="h-7">
        Format
      </Button>
      <Button size="sm" variant="outline" onClick={onSave} className="h-7">
        <Save className="mr-1 h-3.5 w-3.5" /> Save snippet
      </Button>
      <span className="ml-auto text-[11px] text-muted-foreground">
        Ctrl/Cmd + Enter · Shift + Alt + F
      </span>
    </div>
  );
}

function ResultsHeader({
  results,
  activeIdx,
  onSelect,
  error,
  engineError,
}: {
  results: QueryResult[] | null;
  activeIdx: number;
  onSelect: (i: number) => void;
  error: string | null;
  engineError: string | null;
}) {
  return (
    <div className="flex items-center gap-2 border-b bg-muted/20 px-2 py-1 text-xs">
      <span className="font-semibold uppercase tracking-wide text-muted-foreground">Results</span>
      {results && results.length > 0 && (
        <ul className="flex gap-1">
          {results.map((_, i) => (
            <li key={i}>
              <button
                onClick={() => onSelect(i)}
                className={`rounded px-2 py-0.5 text-[11px] ${
                  activeIdx === i ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                }`}
              >
                #{i + 1}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <span className="text-destructive">{error.slice(0, 100)}</span>}
      {engineError && <span className="text-destructive">Engine: {engineError}</span>}
    </div>
  );
}

function EmptyResults({
  status,
  engineError,
}: {
  status: "idle" | "loading" | "ready" | "error";
  engineError: string | null;
}) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
      {status === "loading" && "Booting engine…"}
      {status === "error" && (
        <span className="text-destructive">Engine failed to load: {engineError}</span>
      )}
      {status === "ready" && "Run a query to see results here."}
    </div>
  );
}

function ErrorPanel({ message, onAskTutor }: { message: string; onAskTutor: () => void }) {
  return (
    <div className="flex h-full flex-col items-start gap-3 p-4">
      <div className="w-full rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <div className="mb-1 font-semibold">Query failed</div>
        <pre className="whitespace-pre-wrap break-words font-mono text-xs">{message}</pre>
      </div>
      <Button onClick={onAskTutor} size="sm">
        <Sparkles className="mr-1 h-3.5 w-3.5" /> Ask the AI Tutor
      </Button>
    </div>
  );
}

function HistoryList({
  history,
  onLoad,
  onClear,
}: {
  history: ReturnType<typeof useQueryHistory>["history"];
  onLoad: (sql: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> History
        </span>
        <button onClick={onClear} className="text-[10px] hover:underline">
          clear
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto text-xs">
        {history.map((h) => (
          <li key={h.id} className="border-b">
            <button
              onClick={() => onLoad(h.sql)}
              className="block w-full px-3 py-2 text-left hover:bg-muted"
            >
              <div
                className={`text-[10px] font-semibold ${h.ok ? "text-emerald-600" : "text-destructive"}`}
              >
                {h.ok ? "OK" : "FAIL"} · {new Date(h.timestamp).toLocaleTimeString()} · {h.engine}
              </div>
              <div className="line-clamp-2 font-mono text-[11px]">{h.sql.trim()}</div>
            </button>
          </li>
        ))}
        {!history.length && (
          <li className="p-4 text-muted-foreground">No queries yet. Run one to populate history.</li>
        )}
      </ul>
    </div>
  );
}

function SnippetsList({
  snippets,
  onLoad,
  onDelete,
}: {
  snippets: ReturnType<typeof useSavedSnippets>["snippets"];
  onLoad: (sql: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Saved snippets
      </div>
      <ul className="flex-1 overflow-y-auto text-xs">
        {snippets.map((s) => (
          <li key={s.id} className="border-b">
            <div className="flex items-start justify-between px-3 py-2">
              <button onClick={() => onLoad(s.sql)} className="flex-1 text-left hover:underline">
                <div className="font-semibold">{s.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {s.engine} · {new Date(s.createdAt).toLocaleString()}
                </div>
              </button>
              <button
                onClick={() => onDelete(s.id)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Delete snippet"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </li>
        ))}
        {!snippets.length && (
          <li className="p-4 text-muted-foreground">No snippets saved yet.</li>
        )}
      </ul>
    </div>
  );
}

// Silences unused import warnings when features toggle off.
export const _keep = { EngineProvider, useMemo };
