import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Difficulty, CompanyDef } from "./types";

export type StatusFilter = "all" | "solved" | "unsolved" | "bookmarked" | "favorite";
export type SortKey = "default" | "difficulty" | "xp-desc" | "time-asc";
export type Tier = CompanyDef["tier"];

export interface Filters {
  q: string;
  difficulty: Difficulty | "all";
  status: StatusFilter;
  domain: string | "all";
  company: string | "all";
  tier: Tier | "all";
  concept: string | "all";
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  q: "",
  difficulty: "all",
  status: "all",
  domain: "all",
  company: "all",
  tier: "all",
  concept: "all",
  sort: "default",
};

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  domains: string[];
  companies: string[];
  concepts: string[];
  totalSolved: number;
  totalChallenges: number;
  totalXP: number;
  matchCount?: number;
}

const TIERS: Tier[] = ["FAANG", "Big Tech", "Fintech", "Consumer", "Enterprise"];

export function FiltersBar({
  filters,
  onChange,
  domains,
  companies,
  concepts,
  totalSolved,
  totalChallenges,
  totalXP,
  matchCount,
}: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const reset = () => onChange(DEFAULT_FILTERS);

  const activeCount = [
    filters.q ? 1 : 0,
    filters.difficulty !== "all" ? 1 : 0,
    filters.status !== "all" ? 1 : 0,
    filters.domain !== "all" ? 1 : 0,
    filters.company !== "all" ? 1 : 0,
    filters.tier !== "all" ? 1 : 0,
    filters.concept !== "all" ? 1 : 0,
    filters.sort !== "default" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="sticky top-0 z-10 space-y-2 border-b bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Search by title, concept, tag, company, domain…"
          className="h-8 pl-8 pr-8 text-xs"
        />
        {filters.q && (
          <button
            onClick={() => set("q", "")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Select value={filters.difficulty} onValueChange={(v) => set("difficulty", v as Filters["difficulty"])}>
          <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="Beginner">🟢 Beginner</SelectItem>
            <SelectItem value="Intermediate">🟡 Intermediate</SelectItem>
            <SelectItem value="Advanced">🟠 Advanced</SelectItem>
            <SelectItem value="Interview">🔴 Interview</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.tier} onValueChange={(v) => set("tier", v as Filters["tier"])}>
          <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            {TIERS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.domain} onValueChange={(v) => set("domain", v)}>
          <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs">
            <SelectValue placeholder="Domain" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All domains</SelectItem>
            {domains.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.company} onValueChange={(v) => set("company", v)}>
          <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.concept} onValueChange={(v) => set("concept", v)}>
          <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs">
            <SelectValue placeholder="Concept" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All concepts</SelectItem>
            {concepts.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => set("status", v as StatusFilter)}>
          <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="solved">Solved</SelectItem>
            <SelectItem value="unsolved">Unsolved</SelectItem>
            <SelectItem value="bookmarked">Bookmarked</SelectItem>
            <SelectItem value="favorite">Favorite</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.sort} onValueChange={(v) => set("sort", v as SortKey)}>
          <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="difficulty">Difficulty ↑</SelectItem>
            <SelectItem value="xp-desc">XP ↓</SelectItem>
            <SelectItem value="time-asc">Time ↑</SelectItem>
          </SelectContent>
        </Select>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={reset}>
            Reset ({activeCount})
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {typeof matchCount === "number" && activeCount > 0 ? (
            <>
              <span className="font-semibold text-foreground">{matchCount}</span> match
              {matchCount === 1 ? "" : "es"} ·{" "}
            </>
          ) : null}
          <span className="font-semibold text-foreground">{totalSolved}</span>/{totalChallenges} solved
        </span>
        <span>
          <span className="font-semibold text-amber-400">{totalXP}</span> XP earned
        </span>
      </div>
    </div>
  );
}
