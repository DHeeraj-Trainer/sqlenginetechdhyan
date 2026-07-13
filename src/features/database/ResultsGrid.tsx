import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QueryResult } from "@/types/workbench";

interface Props {
  result: QueryResult;
}

const ROW_HEIGHT = 28;
const OVERSCAN = 12;

function csvEscape(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ResultsGrid({ result }: Props) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");
  const parentRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    if (!filter) return result.rows;
    const needle = filter.toLowerCase();
    return result.rows.filter((row) =>
      row.some((c) => String(c ?? "").toLowerCase().includes(needle)),
    );
  }, [result.rows, filter]);

  const sorted = useMemo(() => {
    if (sortCol === null) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortCol, sortDir]);

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const exportCsv = () => {
    const header = result.columns.map(csvEscape).join(",");
    const body = sorted.map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "result.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const data = sorted.map((r) =>
      Object.fromEntries(result.columns.map((c, i) => [c, r[i]])),
    );
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "result.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!result.columns.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {typeof result.rowsAffected === "number"
          ? `Statement executed. Rows affected: ${result.rowsAffected}.`
          : "Statement executed."}{" "}
        <span className="text-xs">({result.durationMs.toFixed(1)} ms)</span>
      </div>
    );
  }

  const gridTemplate = `48px repeat(${result.columns.length}, minmax(120px, 1fr))`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter rows…"
            className="h-8 w-56 pl-7 text-xs"
            aria-label="Filter result rows"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {sorted.length.toLocaleString()} row{sorted.length === 1 ? "" : "s"} ·{" "}
          {result.durationMs.toFixed(1)} ms
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8" onClick={exportCsv}>
            <Download className="mr-1 h-3.5 w-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={exportJson}>
            <Download className="mr-1 h-3.5 w-3.5" /> JSON
          </Button>
        </div>
      </div>

      {/* Sticky column header */}
      <div
        role="row"
        className="grid border-b bg-muted/60 text-xs font-semibold"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className="border-r px-2 py-1.5 text-right text-muted-foreground">#</div>
        {result.columns.map((c, idx) => (
          <button
            key={c + idx}
            type="button"
            className="flex items-center gap-1 border-r px-3 py-1.5 text-left hover:bg-muted"
            onClick={() => {
              if (sortCol === idx) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
              else {
                setSortCol(idx);
                setSortDir("asc");
              }
            }}
            aria-label={`Sort by ${c}`}
          >
            <span className="truncate">{c}</span>
            {sortCol === idx &&
              (sortDir === "asc" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              ))}
          </button>
        ))}
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto" role="grid" aria-rowcount={sorted.length}>
        {sorted.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No rows match the current filter.
          </div>
        ) : (
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = sorted[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  role="row"
                  className="absolute left-0 top-0 grid w-full border-b text-xs hover:bg-muted/40"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns: gridTemplate,
                  }}
                >
                  <div className="border-r px-2 py-1 text-right text-muted-foreground">
                    {virtualRow.index + 1}
                  </div>
                  {row.map((cell, c) => (
                    <div
                      key={c}
                      role="gridcell"
                      className="truncate border-r px-3 py-1 font-mono"
                      title={cell === null ? "NULL" : String(cell)}
                      onDoubleClick={() => {
                        if (cell !== null && cell !== undefined)
                          void navigator.clipboard.writeText(String(cell));
                      }}
                    >
                      {cell === null || cell === undefined ? (
                        <span className="italic text-muted-foreground">NULL</span>
                      ) : (
                        String(cell)
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
