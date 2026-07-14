import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { EngineId, QueryResult, SqlEngine, TableInfo } from "@/types/workbench";
import { SqliteEngine } from "@/lib/db/engines/sqlite";
import { PostgresEngine } from "@/lib/db/engines/postgres";
import { AlaSqlEngine } from "@/lib/db/engines/alasql";
import { buildScript } from "@/lib/db/sample-builder";
import { sampleDatabases } from "@/lib/db/sample-databases";
import {
  emptyCatalog,
  isDataChanging,
  isSchemaChanging,
  loadCatalog,
  type CatalogSnapshot,
} from "@/lib/db/catalog";


interface EngineContextValue {
  engineId: EngineId;
  engine: SqlEngine | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  tables: TableInfo[];
  catalog: CatalogSnapshot;
  currentSampleId: string;
  switchEngine: (id: EngineId) => Promise<void>;
  loadSample: (sampleId: string) => Promise<void>;
  refreshTables: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  runQuery: (sql: string) => Promise<{ results: QueryResult[] | null; error: string | null; durationMs: number }>;
}


const EngineContext = createContext<EngineContextValue | null>(null);

const engineFactories: Record<Exclude<EngineId, "mysql">, () => SqlEngine> = {
  sqlite: () => new SqliteEngine(),
  postgres: () => new PostgresEngine(),
  alasql: () => new AlaSqlEngine(),
};

export function EngineProvider({ children }: { children: ReactNode }) {
  const [engineId, setEngineId] = useState<EngineId>("sqlite");
  const [engine, setEngine] = useState<SqlEngine | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [currentSampleId, setCurrentSampleId] = useState<string>(sampleDatabases[0].id);
  const engineRef = useRef<SqlEngine | null>(null);

  const refreshTables = useCallback(async () => {
    if (!engineRef.current) return;
    try {
      const t = await engineRef.current.listTables();
      setTables(t);
    } catch (e) {
      console.error("listTables failed", e);
    }
  }, []);

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
        const t = await inst.listTables();
        setTables(t);
        setStatus("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    },
    [currentSampleId],
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

  const runQuery = useCallback(
    async (sql: string) => {
      const inst = engineRef.current;
      if (!inst) return { results: null, error: "Engine not ready", durationMs: 0 };
      const start = performance.now();
      try {
        const results = await inst.exec(sql);
        const durationMs = performance.now() - start;
        // Refresh schema if statement likely mutated it.
        if (/\b(create|drop|alter|insert|update|delete|truncate)\b/i.test(sql)) {
          void refreshTables();
        }
        return { results, error: null, durationMs };
      } catch (e) {
        const durationMs = performance.now() - start;
        return {
          results: null,
          error: e instanceof Error ? e.message : String(e),
          durationMs,
        };
      }
    },
    [refreshTables],
  );

  const value = useMemo<EngineContextValue>(
    () => ({
      engineId,
      engine,
      status,
      error,
      tables,
      currentSampleId,
      switchEngine,
      loadSample,
      refreshTables,
      runQuery,
    }),
    [engineId, engine, status, error, tables, currentSampleId, switchEngine, loadSample, refreshTables, runQuery],
  );

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine() {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error("useEngine must be used inside <EngineProvider>");
  return ctx;
}
