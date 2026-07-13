import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QueryResult } from "@/types/workbench";

interface Props {
  result: QueryResult;
}

const PAGE_SIZE = 50;

function csvEscape(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ResultsGrid({ result }: Props) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!filter) return result.rows;
    const needle = filter.toLowerCase();
    return result.rows.filter((row) => row.some((c) => String(c ?? "").toLowerCase().includes(needle)));
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
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortCol, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
    const data = sorted.map((r) => Object.fromEntries(result.columns.map((c, i) => [c, r[i]])));
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            placeholder="Filter rows…"
            className="h-8 w-56 pl-7 text-xs"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {sorted.length} row{sorted.length === 1 ? "" : "s"} · {result.durationMs.toFixed(1)} ms
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
      <div className="flex-1 overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 bg-muted/60 text-left">
            <tr>
              <th className="w-10 border-b px-2 py-1.5 text-right text-muted-foreground">#</th>
              {result.columns.map((c, idx) => (
                <th
                  key={c + idx}
                  className="cursor-pointer select-none border-b px-3 py-1.5 font-semibold hover:bg-muted"
                  onClick={() => {
                    if (sortCol === idx) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    else {
                      setSortCol(idx);
                      setSortDir("asc");
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>{c}</span>
                    {sortCol === idx &&
                      (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, r) => (
              <tr key={r} className="hover:bg-muted/40">
                <td className="border-b px-2 py-1 text-right text-muted-foreground">
                  {page * PAGE_SIZE + r + 1}
                </td>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="max-w-[420px] truncate border-b px-3 py-1 font-mono"
                    title={cell === null ? "NULL" : String(cell)}
                    onDoubleClick={() => {
                      if (cell !== null && cell !== undefined)
                        void navigator.clipboard.writeText(String(cell));
                    }}
                  >
                    {cell === null || cell === undefined ? (
                      <span className="text-muted-foreground italic">NULL</span>
                    ) : (
                      String(cell)
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {!pageRows.length && (
              <tr>
                <td colSpan={result.columns.length + 1} className="p-6 text-center text-muted-foreground">
                  No rows match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-3 py-1.5 text-xs">
          <Button size="sm" variant="ghost" className="h-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span>
            Page {page + 1} / {pageCount}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
