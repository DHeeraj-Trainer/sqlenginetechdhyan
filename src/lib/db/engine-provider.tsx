import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { EngineId, QueryResult, SqlEngine, TableInfo } from "@/types/workbench";
import { SqliteEngine } from "@/lib/db/engines/sqlite";
import { PostgresEngine } from "@/lib/db/engines/postgres";
import { AlaSqlEngine } from "@/lib/db/engines/alasql";
import { MysqlEmulationEngine } from "@/lib/db/engines/mysql";
import { buildScript } from "@/lib/db/sample-builder";
import { sampleDatabases } from "@/lib/db/sample-databases";
import {
  emptyCatalog,
  isDataChanging,
  isSchemaChanging,
  loadCatalog,
  type CatalogSnapshot,
} from "@/lib/db/catalog";
import { SqlSession, type RouterState } from "@/lib/db/sql-router";



interface EngineContextValue {
  engineId: EngineId;
  engine: SqlEngine | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  tables: TableInfo[];
  catalog: CatalogSnapshot;
  currentSampleId: string;
  session: SqlSession;
  routerState: RouterState;
  switchEngine: (id: EngineId) => Promise<void>;
  loadSample: (sampleId: string) => Promise<void>;
  refreshTables: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  runQuery: (sql: string) => Promise<{ results: QueryResult[] | null; error: string | null; durationMs: number }>;
}



const EngineContext = createContext<EngineContextValue | null>(null);

const engineFactories: Record<EngineId, () => SqlEngine> = {
  sqlite: () => new SqliteEngine(),
  postgres: () => new PostgresEngine(),
  alasql: () => new AlaSqlEngine(),
  mysql: () => new MysqlEmulationEngine(),
};

export function EngineProvider({ children }: { children: ReactNode }) {
  const [engineId, setEngineId] = useState<EngineId>("sqlite");
  const [engine, setEngine] = useState<SqlEngine | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [catalog, setCatalog] = useState<CatalogSnapshot>(() => emptyCatalog("sqlite"));
  const [currentSampleId, setCurrentSampleId] = useState<string>(sampleDatabases[0].id);
  const engineRef = useRef<SqlEngine | null>(null);
  const sessionRef = useRef<SqlSession>(new SqlSession());
  const [routerState, setRouterState] = useState<RouterState>(() => sessionRef.current.snapshot() as RouterState);

  useEffect(() => {
    const unsub = sessionRef.current.subscribe((s) => setRouterState({ ...s }));
    return () => { unsub(); };
  }, []);


  const refreshCatalog = useCallback(async () => {
    if (!engineRef.current) return;
    try {
      const snap = await loadCatalog(engineRef.current);
      setCatalog(snap);
      // Keep the flat tables list in sync for legacy consumers.
      const flat: TableInfo[] = [];
      for (const s of snap.schemas) {
        for (const t of [...s.tables, ...s.views, ...s.materializedViews]) {
          flat.push({ name: t.name, kind: t.kind === "view" ? "view" : "table", columns: t.columns });
        }
      }
      setTables(flat);
    } catch (e) {
      console.error("refreshCatalog failed", e);
    }
  }, []);

  const refreshTables = refreshCatalog;


  const loadSample = useCallback(
    async (sampleId: string) => {
      const inst = engineRef.current;
      if (!inst) return;
      const sample = sampleDatabases.find((s) => s.id === sampleId);
      if (!sample) return;
      await inst.reset();
      const script = buildScript(sample, inst.id);
      await inst.loadScript(script);
      setCurrentSampleId(sampleId);
      await refreshTables();
      toast.success(`Loaded ${sample.name}`);
    },
    [refreshTables],
  );

  const bootEngine = useCallback(
    async (id: EngineId) => {
      setStatus("loading");
      setError(null);
      try {
        if (id === "mysql") {
          throw new Error(
            "MySQL requires a server connection. Add a MySQL connection secret to enable this engine.",
          );
        }
        const factory = engineFactories[id as Exclude<EngineId, "mysql">];
        const inst = factory();
        await inst.init();
        engineRef.current = inst;
        setEngine(inst);
        setEngineId(id);
        const sample = sampleDatabases.find((s) => s.id === currentSampleId) ?? sampleDatabases[0];
        await inst.loadScript(buildScript(sample, inst.id));
        setCurrentSampleId(sample.id);
        await refreshCatalog();
        setStatus("ready");

      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    },
    [currentSampleId, refreshCatalog],

  );

  useEffect(() => {
    void bootEngine("sqlite");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchEngine = useCallback(
    async (id: EngineId) => {
      if (id === engineId && status === "ready") return;
      await bootEngine(id);
    },
    [bootEngine, engineId, status],
  );

  // Debounce catalog refreshes triggered by DML: bulk INSERT/UPDATE scripts
  // would otherwise re-introspect the whole database after every statement.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useCallback(
    (immediate: boolean) => {
      if (immediate) {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
        void refreshCatalog();
        return;
      }
      if (refreshTimer.current) return; // trailing debounce
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        void refreshCatalog();
      }, 250);
    },
    [refreshCatalog],
  );

  useEffect(() => () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  }, []);

  const runQuery = useCallback(
    async (sql: string) => {
      const inst = engineRef.current;
      if (!inst) return { results: null, error: "Engine not ready", durationMs: 0 };
      const out = await sessionRef.current.execute(sql, inst);
      if (isSchemaChanging(sql)) scheduleRefresh(true);
      else if (isDataChanging(sql)) scheduleRefresh(false);
      return out.error
        ? { results: null, error: out.error, durationMs: out.durationMs }
        : { results: out.results, error: null, durationMs: out.durationMs };
    },
    [scheduleRefresh],
  );

  const value = useMemo<EngineContextValue>(
    () => ({
      engineId,
      engine,
      status,
      error,
      tables,
      catalog,
      currentSampleId,
      session: sessionRef.current,
      routerState,
      switchEngine,
      loadSample,
      refreshTables,
      refreshCatalog,
      runQuery,
    }),
    [engineId, engine, status, error, tables, catalog, currentSampleId, routerState, switchEngine, loadSample, refreshTables, refreshCatalog, runQuery],
  );



  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine() {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error("useEngine must be used inside <EngineProvider>");
  return ctx;
}
