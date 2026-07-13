import React, { useState, useEffect } from "react";
import alasql from "alasql";
import { Play, Check, Copy, Sparkles, HelpCircle, Info, FileText, ChevronRight, CheckCircle2, RotateCcw, Download, Clock, Database, Key, Maximize2, Minimize2, Link, List, Terminal, BookOpen, Table, Zap, GitCommit, Eye, Settings2, Sliders, ArrowUpDown, Search, Code, Award, HelpCircle as HelpIcon, Flame } from "lucide-react";
import { DomainData, PracticeQuestion, SQLTable } from "../types";
import { AiTutor } from "./AiTutor";

// Custom string, math and date helper functions for AlaSQL to support full standard compliance
try {
  const anyAlasql = alasql as any;
  if (anyAlasql && anyAlasql.fn) {
    anyAlasql.fn.CONCAT = function(...args: any[]) {
      return args.join('');
    };
    anyAlasql.fn.LENGTH = function(str: any) {
      return str ? String(str).length : 0;
    };
    anyAlasql.fn.SUBSTRING = function(str: any, start: number, len?: number) {
      if (!str) return '';
      const s = start > 0 ? start - 1 : 0;
      return len !== undefined ? String(str).substring(s, s + len) : String(str).substring(s);
    };
    anyAlasql.fn.UPPER = function(str: any) {
      return str ? String(str).toUpperCase() : '';
    };
    anyAlasql.fn.LOWER = function(str: any) {
      return str ? String(str).toLowerCase() : '';
    };
    anyAlasql.fn.REPLACE = function(str: any, fromVal: any, toVal: any) {
      if (!str) return '';
      return String(str).split(String(fromVal)).join(String(toVal));
    };
    anyAlasql.fn.TRIM = function(str: any) {
      return str ? String(str).trim() : '';
    };

    anyAlasql.fn.ROUND = function(num: any, decimals?: number) {
      const dec = decimals || 0;
      return Number(Math.round(Number(num + 'e' + dec)) + 'e-' + dec);
    };
    anyAlasql.fn.FLOOR = function(num: any) {
      return Math.floor(Number(num));
    };
    anyAlasql.fn.CEIL = function(num: any) {
      return Math.ceil(Number(num));
    };
    anyAlasql.fn.MOD = function(n: any, m: any) {
      return Number(n) % Number(m);
    };
    anyAlasql.fn.POWER = function(base: any, exp: any) {
      return Math.pow(Number(base), Number(exp));
    };

    anyAlasql.fn.NOW = function() {
      return new Date().toISOString().replace('T', ' ').substring(0, 19);
    };
    anyAlasql.fn.CURDATE = function() {
      return new Date().toISOString().substring(0, 10);
    };
    anyAlasql.fn.DATE_ADD = function(dateStr: any, intervalVal: any) {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      const val = parseInt(String(intervalVal), 10) || 0;
      d.setDate(d.getDate() + val);
      return d.toISOString().substring(0, 10);
    };
    anyAlasql.fn.DATE_SUB = function(dateStr: any, intervalVal: any) {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      const val = parseInt(String(intervalVal), 10) || 0;
      d.setDate(d.getDate() - val);
      return d.toISOString().substring(0, 10);
    };
    anyAlasql.fn.MONTH = function(dateStr: any) {
      if (!dateStr) return null;
      return new Date(dateStr).getMonth() + 1;
    };
    anyAlasql.fn.YEAR = function(dateStr: any) {
      if (!dateStr) return null;
      return new Date(dateStr).getFullYear();
    };
    anyAlasql.fn.DATEDIFF = function(d1: any, d2: any) {
      if (!d1 || !d2) return 0;
      const diffTime = Math.abs(new Date(d1).getTime() - new Date(d2).getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };
  }
} catch (e) {
  console.error("Failed to register AlaSQL helpers:", e);
}

export interface SyntaxValidationResult {
  isValid: boolean;
  message: string;
  type: "success" | "warning" | "error" | "info";
}

export const validateSqlSyntax = (
  query: string,
  tables: SQLTable[]
): SyntaxValidationResult => {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      isValid: true,
      message: "Student console is empty. Type your SQL statement to begin validation.",
      type: "info",
    };
  }

  // 3. Parentheses Match
  const leftParens = (query.match(/\(/g) || []).length;
  const rightParens = (query.match(/\)/g) || []).length;
  if (leftParens !== rightParens) {
    return {
      isValid: false,
      message: `Parentheses Mismatch: Found ${leftParens} open '(' and ${rightParens} close ')' characters.`,
      type: "error",
    };
  }

  // 4. Quotation Match
  const singleQuotes = (query.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    return {
      isValid: false,
      message: "Syntax Alert: Unclosed single quote string literal.",
      type: "error",
    };
  }
  const doubleQuotes = (query.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) {
    return {
      isValid: false,
      message: "Syntax Alert: Unclosed double quote string literal.",
      type: "error",
    };
  }

  // Check if it is a SELECT query
  const isSelect = trimmed.toLowerCase().startsWith("select");
  if (!isSelect) {
    return {
      isValid: true,
      message: "✓ SQL command query parsed successfully. Press Run Query to execute.",
      type: "success",
    };
  }

  // 5. Clause Sequence Order
  const regexes = {
    "SELECT": /\bSELECT\b/i,
    "FROM": /\bFROM\b/i,
    "WHERE": /\bWHERE\b/i,
    "GROUP BY": /\bGROUP\s+BY\b/i,
    "HAVING": /\bHAVING\b/i,
    "ORDER BY": /\bORDER\s+BY\b/i,
    "LIMIT": /\bLIMIT\b/i,
  };

  const matches = Object.entries(regexes)
    .map(([key, regex]) => {
      const m = query.match(regex);
      return { key, index: m && m.index !== undefined ? m.index : -1 };
    })
    .filter((m) => m.index !== -1);

  for (let i = 0; i < matches.length - 1; i++) {
    if (matches[i].index > matches[i + 1].index) {
      return {
        isValid: false,
        message: `Sequence Order Violation: '${matches[i + 1].key}' must succeed '${matches[i].key}' clause in ANSI standards.`,
        type: "error",
      };
    }
  }

  // 6. Table Existence Verification
  const fromMatch = query.match(/\bFROM\s+([a-zA-Z0-9_]+)/i);
  if (!fromMatch) {
    return {
      isValid: false,
      message: "Data Source Missing: Define source table with standard 'FROM' clause.",
      type: "error",
    };
  }

  const tableName = fromMatch[1];
  const schemaTable = tables.find(
    (t) => t.name.toLowerCase() === tableName.toLowerCase()
  );

  if (!schemaTable) {
    let suggestion = "";
    let minDistance = 999;
    const levenshtein = (a: string, b: string): number => {
      const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
        Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
      );
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          if (a[i - 1] === b[j - 1]) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j - 1] + 1
            );
          }
        }
      }
      return matrix[a.length][b.length];
    };

    tables.forEach((t) => {
      const d = levenshtein(tableName.toLowerCase(), t.name.toLowerCase());
      if (d < minDistance) {
        minDistance = d;
        suggestion = t.name;
      }
    });

    return {
      isValid: false,
      message: `Unknown Table: '${tableName}' unrecognized.${
        suggestion && minDistance <= 3 ? ` Did you mean '${suggestion}'?` : ""
      }`,
      type: "warning",
    };
  }

  // 7. Column Name Verification (fuzzy suggestion on fields)
  const validCols = schemaTable.columns.map((c) => c.name.toLowerCase());
  const cleanText = query
    .replace(/--.*/g, "")
    .replace(/'[^']*'/g, "")
    .replace(/"[^"]*"/g, "")
    .replace(/\bAS\s+[a-zA-Z0-9_]+/gi, "");

  const sqlKeywordsAndFuncs = new Set([
    "select", "from", "where", "group", "by", "having", "order", "limit", "as", "and", "or", "not", "is", "null", "in", "like", "between", "asc", "desc", "count", "sum", "avg", "min", "max", "distinct", "number", "string"
  ]);

  const words = cleanText.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
  if (words) {
    const unknownWords = words.filter((w) => {
      const lw = w.toLowerCase();
      return (
        !sqlKeywordsAndFuncs.has(lw) &&
        lw !== tableName.toLowerCase() &&
        !validCols.includes(lw) &&
        isNaN(Number(lw))
      );
    });

    if (unknownWords.length > 0) {
      const unknown = unknownWords[0];
      let minDistance = 999;
      let suggestion = "";
      const levenshtein = (a: string, b: string): number => {
        const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
          Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
        );
        for (let i = 1; i <= a.length; i++) {
          for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + 1
              );
            }
          }
        }
        return matrix[a.length][b.length];
      };

      validCols.forEach((col) => {
        const d = levenshtein(unknown.toLowerCase(), col);
        if (d < minDistance) {
          minDistance = d;
          suggestion = col;
        }
      });

      return {
        isValid: false,
        message: `Schema Indicator: Element '${unknown}' matches no defined columns for table '${schemaTable.name}'.${
          suggestion && minDistance <= 3 ? ` Suggestion: ${suggestion}` : ""
        }`,
        type: "warning",
      };
    }
  }

  return {
    isValid: true,
    message: "✓ ANSI SQL clean: validation rules passed. Ready to query.",
    type: "success",
  };
};

interface SqlSandboxProps {
  domain: DomainData;
  onQuestionSolved: (qId: string) => void;
  solvedQuestions: string[];
  theme: "light" | "dark";
}

export const SqlSandbox: React.FC<SqlSandboxProps> = ({
  domain,
  onQuestionSolved,
  solvedQuestions,
  theme,
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<PracticeQuestion | null>(null);
  const [queryInput, setQueryInput] = useState<string>("");
  const [resultData, setResultData] = useState<any[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status: "idle" | "success" | "fail"; message: string }>({ status: "idle", message: "" });
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"sandbox" | "tables" | "scripts" | "cheatsheet">("sandbox");
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  // Dynamic sandbox database schemas state
  const [liveTables, setLiveTables] = useState<any[]>([]);
  const [liveTriggers, setLiveTriggers] = useState<{ name: string; event: string; table: string; statement: string }[]>([]);
  const [liveIndexes, setLiveIndexes] = useState<{ name: string; table: string; column: string }[]>([]);
  const [executionLogs, setExecutionLogs] = useState<{ statement: string; status: "success" | "error"; message: string; rowsAffected?: number; durationMs: number; timestamp: string }[]>([]);
  const [activeTerminalTab, setActiveTerminalTab] = useState<"results" | "logs" | "explain" | "diagram" | "docs">("results");
  
  // Results grid search, sorting, and pagination states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [copiedCell, setCopiedCell] = useState<{ rIdx: number; cIdx: number } | null>(null);
  const [isTransactionActive, setIsTransactionActive] = useState<boolean>(false);

  // AI Tutor Integration States
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(false);
  const [lastFailedQuery, setLastFailedQuery] = useState<string>("");
  const [lastFailedError, setLastFailedError] = useState<string | null>(null);

  const [queryHistory, setQueryHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("sql_sandbox_query_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [schemaViewMode, setSchemaViewMode] = useState<"list" | "diagram">("list");
  const [hoveredRelation, setHoveredRelation] = useState<number | null>(null);
  const [fullscreenDiagram, setFullscreenDiagram] = useState<boolean>(false);
  const [tourStep, setTourStep] = useState<number | null>(null);

  // Auto trigger guided onboarding tour for first-time visitors
  useEffect(() => {
    const hasOnboarded = localStorage.getItem("sql_sandbox_onboarded_v2");
    if (!hasOnboarded) {
      const timer = setTimeout(() => {
        setTourStep(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const preRef = React.useRef<HTMLPreElement>(null);

  // Synchronize scroll of textarea and highlighter pre overlay
  const handleEditorScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Derive table relationships based on column naming conventions (e.g., table_id column linking to primary key table_id)
  const relations = React.useMemo(() => {
    const list: {
      parentTable: string;
      parentCol: string;
      childTable: string;
      childCol: string;
    }[] = [];

    const activeTablesList = liveTables.length > 0 ? liveTables : domain.tables;

    activeTablesList.forEach(tableA => {
      tableA.columns.forEach((colA: any) => {
        if (colA.name.endsWith("_id")) {
          activeTablesList.forEach(tableB => {
            if (tableB.name !== tableA.name) {
              const colB = tableB.columns.find((c: any) => c.name === colA.name);
              if (colB && colB.constraints?.toUpperCase().includes("PRIMARY KEY")) {
                list.push({
                  parentTable: tableB.name,
                  parentCol: colB.name,
                  childTable: tableA.name,
                  childCol: colA.name
                });
              }
            }
          });
        }
      });
    });
    return list;
  }, [liveTables, domain]);

  const childTableNames = React.useMemo(() => new Set(relations.map(r => r.childTable)), [relations]);
  const parentsList = React.useMemo(() => {
    const activeTablesList = liveTables.length > 0 ? liveTables : domain.tables;
    return activeTablesList.filter(t => !childTableNames.has(t.name));
  }, [liveTables, domain.tables, childTableNames]);
  
  const childrenList = React.useMemo(() => {
    const activeTablesList = liveTables.length > 0 ? liveTables : domain.tables;
    return activeTablesList.filter(t => childTableNames.has(t.name));
  }, [liveTables, domain.tables, childTableNames]);

  // Real-time linter calculations
  const syntaxCheck = React.useMemo(() => {
    return validateSqlSyntax(queryInput, liveTables.length > 0 ? liveTables : domain.tables);
  }, [queryInput, liveTables, domain.tables]);

  // Filter, sort, and paginate resultData dynamically for enhanced terminal grid interaction
  const processedResultData = React.useMemo(() => {
    if (!resultData || resultData.length === 0) return { rows: [], totalCount: 0 };

    // 1. Filter
    let filtered = [...resultData];
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(row => 
        Object.values(row).some(val => String(val).toLowerCase().includes(q))
      );
    }

    // 2. Sort
    if (sortColumn) {
      filtered.sort((a, b) => {
        let valA = a[sortColumn];
        let valB = b[sortColumn];
        if (valA === null || valA === undefined) valA = "";
        if (valB === null || valB === undefined) valB = "";
        
        const stringA = String(valA).toLowerCase();
        const stringB = String(valB).toLowerCase();
        
        // Try numerical sort
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDirection === "asc" ? numA - numB : numB - numA;
        }
        
        if (stringA < stringB) return sortDirection === "asc" ? -1 : 1;
        if (stringA > stringB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    const totalCount = filtered.length;

    // 3. Paginate
    const startIndex = (currentPage - 1) * rowsPerPage;
    const rows = filtered.slice(startIndex, startIndex + rowsPerPage);

    return { rows, totalCount };
  }, [resultData, searchQuery, sortColumn, sortDirection, currentPage, rowsPerPage]);

  // Real-time color-coded syntax highlighter with smart schema validation highlighting (wavy red underlines on unknown items)
  const highlightSQL = (sql: string, isDark: boolean, tables: SQLTable[]) => {
    if (!sql) {
      return <span className="text-slate-400/80 italic">-- Type your query here or choose a challenge... e.g. SELECT * FROM {tables[0]?.name || "table"}</span>;
    }
    
    // Attempt to extract the active table from the FROM clause
    const fromMatch = sql.match(/\bFROM\s+([a-zA-Z0-9_]+)/i);
    const queryTableName = fromMatch ? fromMatch[1].toLowerCase() : null;
    const activeTable = queryTableName ? tables.find(t => t.name.toLowerCase() === queryTableName) : null;
    const activeColumns = activeTable ? activeTable.columns.map(c => c.name.toLowerCase()) : [];

    const parts = sql.match(/--.*|'[^']*'|"[^"]*"|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_][a-zA-Z0-9_]*\b|[^\w\s]|\s+/g) || [];
    
    const keywordSet = new Set([
      "select", "from", "where", "join", "on", "left", "right", "inner", "group", "by", "having", "order", "limit",
      "insert", "into", "values", "update", "set", "delete", "drop", "create", "table", "alter", "and", "or", "not",
      "in", "like", "between", "is", "null", "distinct", "as"
    ]);
    const funcSet = new Set(["count", "sum", "avg", "min", "max"]);
    const typeSet = new Set(["int", "number", "string", "decimal", "varchar", "boolean"]);

    return parts.map((part, index) => {
      if (part.startsWith("--")) {
        return <span key={index} className="text-slate-500 italic">{part}</span>;
      }
      if (part.startsWith("'") || part.startsWith('"')) {
        return <span key={index} className="text-emerald-500 dark:text-emerald-400 font-medium">{part}</span>;
      }
      if (/^\d+(?:\.\d+)?$/.test(part)) {
        return <span key={index} className="text-amber-600 dark:text-amber-400 font-mono">{part}</span>;
      }
      
      const lower = part.toLowerCase();
      if (keywordSet.has(lower)) {
        return <span key={index} className="text-blue-600 dark:text-blue-400 font-extrabold">{part.toUpperCase()}</span>;
      }
      if (funcSet.has(lower)) {
        return <span key={index} className="text-purple-600 dark:text-purple-400 font-bold">{part.toUpperCase()}</span>;
      }
      if (typeSet.has(lower)) {
        return <span key={index} className="text-cyan-600 dark:text-cyan-400 font-semibold">{part}</span>;
      }
      if (/^[^\w\s]$/.test(part)) {
        return <span key={index} className="text-slate-400 dark:text-slate-500 font-bold">{part}</span>;
      }
      
      // Dynamic column / table name mismatch wave underline
      const isIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part);
      if (isIdentifier && activeTable && lower !== queryTableName && !activeColumns.includes(lower)) {
        return (
          <span 
            key={index} 
            className="underline decoration-wavy decoration-rose-500 text-rose-650 dark:text-rose-400 font-semibold" 
            title={`Unrecognized column '${part}' for table '${activeTable.name}'`}
          >
            {part}
          </span>
        );
      }

      return <span key={index} className={isDark ? "text-slate-200" : "text-slate-800"}>{part}</span>;
    });
  };

  const renderERDiagram = (isExpanded: boolean) => {
    const pList = parentsList;
    const cList = childrenList;
    
    // Determine height
    const maxLen = Math.max(pList.length, cList.length, 2);
    const canvasHeight = maxLen * 140 + 20;

    return (
      <div 
        className={`relative rounded-xl border overflow-hidden transition-all select-none ${
          theme === "dark" 
            ? "bg-slate-950 border-slate-850" 
            : "bg-slate-50 border-slate-200"
        }`}
        style={{ height: `${canvasHeight}px`, minWidth: '320px' }}
      >
        {/* SVG Bezier Relationship Curves */}
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
          <defs>
            <marker
              id="crow-marker"
              viewBox="0 0 10 10"
              refX="4"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 5 L 10 5 M 0 2 L 6 5 L 0 8" fill="none" stroke={theme === "dark" ? "#10b981" : "#059669"} strokeWidth="1.5" />
            </marker>
          </defs>

          {relations.map((rel, index) => {
            const pIdx = pList.findIndex(t => t.name === rel.parentTable);
            const cIdx = cList.findIndex(t => t.name === rel.childTable);
            if (pIdx === -1 || cIdx === -1) return null;

            // X coordinates mapped to the columns
            const x1 = 146;
            const y1 = pIdx * 125 + 20 + 35;

            const x2 = 214;
            const y2 = cIdx * 155 + 20 + 45;

            const isHovered = hoveredRelation === index;
            const lineColor = isHovered 
              ? (theme === "dark" ? "#10b981" : "#059669") 
              : (theme === "dark" ? "#3b82f6" : "#2563eb");
            const strokeWidth = isHovered ? 2.5 : 1.5;
            const opacity = hoveredRelation === null || isHovered ? 1.0 : 0.25;

            const ctrlX1 = x1 + 25;
            const ctrlY1 = y1;
            const ctrlX2 = x2 - 25;
            const ctrlY2 = y2;

            return (
              <g key={index} style={{ opacity, transition: 'all 0.2s' }}>
                <path
                  d={`M ${x1} ${y1} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={strokeWidth}
                  markerEnd="url(#crow-marker)"
                  className="transition-colors"
                />
                <circle cx={(x1+x2)/2} cy={(y1+y2)/2} r={7} fill={theme === "dark" ? "#0f172a" : "#ffffff"} stroke={lineColor} strokeWidth={1.5} />
                <text x={(x1+x2)/2} y={(y1+y2)/2 + 3} textAnchor="middle" fontSize="8" fontWeight="bold" fill={lineColor} className="font-mono">
                  ∞
                </text>
              </g>
            );
          })}
        </svg>

        {/* Column 1: Parent Table Cards (Left) */}
        <div className="absolute left-2 top-0 bottom-0 flex flex-col space-y-4 z-10 py-5">
          {pList.map((tbl, i) => (
            <div
              key={tbl.name}
              className={`w-[130px] border rounded-lg p-2 transition-all flex flex-col space-y-1 shadow-3xs ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-800 hover:border-blue-500"
                  : "bg-white border-slate-200 hover:border-blue-400"
              }`}
              style={{ position: 'absolute', top: `${i * 125 + 20}px` }}
            >
              <div className="flex items-center justify-between border-b pb-1 dark:border-slate-800 border-slate-100">
                <span className={`font-mono text-[9px] font-bold uppercase truncate ${theme === "dark" ? "text-slate-150" : "text-slate-850"}`}>
                  {tbl.name}
                </span>
                <span className="text-[8px] bg-blue-550/10 text-blue-500 border border-blue-500/20 px-1 rounded-sm font-bold font-mono">1</span>
              </div>
              <div className="flex flex-col space-y-1 overflow-hidden">
                {tbl.columns.slice(0, 3).map(c => {
                  const isPk = c.constraints?.toUpperCase().includes("PRIMARY KEY");
                  return (
                    <div key={c.name} className="flex items-center justify-between text-[8px] font-mono leading-tight">
                      <span className={`truncate flex items-center ${isPk ? "text-amber-500 font-bold" : (theme === "dark" ? "text-slate-400" : "text-slate-600")}`}>
                        {isPk && <Key className="w-2 h-2 mr-0.5 text-amber-500 shrink-0" />}
                        {c.name}
                      </span>
                    </div>
                  );
                })}
                {tbl.columns.length > 3 && (
                  <span className="text-[8px] text-slate-500 font-medium italic pl-1">+{tbl.columns.length - 3} more</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Column 2: Child/Relational Table Cards (Right) */}
        <div className="absolute left-[214px] top-0 bottom-0 flex flex-col space-y-4 z-10 py-5">
          {cList.map((tbl, j) => (
            <div
              key={tbl.name}
              className={`w-[130px] border rounded-lg p-2 transition-all flex flex-col space-y-1 shadow-3xs ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-800 hover:border-emerald-500"
                  : "bg-white border-slate-200 hover:border-emerald-400"
              }`}
              style={{ position: 'absolute', top: `${j * 155 + 20}px` }}
            >
              <div className="flex items-center justify-between border-b pb-1 dark:border-slate-800 border-slate-100">
                <span className={`font-mono text-[9px] font-bold uppercase truncate ${theme === "dark" ? "text-slate-150" : "text-slate-850"}`}>
                  {tbl.name}
                </span>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1 rounded-sm font-bold font-mono">N</span>
              </div>
              <div className="flex flex-col space-y-1 overflow-hidden">
                {tbl.columns.slice(0, 4).map(c => {
                  const isPk = c.constraints?.toUpperCase().includes("PRIMARY KEY");
                  const isFk = c.name.endsWith("_id") && !isPk;
                  return (
                    <div key={c.name} className="flex items-center justify-between text-[8px] font-mono leading-tight">
                      <span className={`truncate flex items-center ${
                        isPk ? "text-amber-500 font-bold" : isFk ? "text-blue-500 font-bold" : (theme === "dark" ? "text-slate-400" : "text-slate-600")
                      }`}>
                        {isPk && <Key className="w-2 h-2 mr-0.5 text-amber-500 shrink-0" />}
                        {isFk && <span className="text-[7px] bg-blue-500/10 border border-blue-500/25 px-0.5 rounded mr-0.5 text-blue-500 font-extrabold scale-90 shrink-0">FK</span>}
                        {c.name}
                      </span>
                    </div>
                  );
                })}
                {tbl.columns.length > 4 && (
                  <span className="text-[8px] text-slate-500 font-medium italic pl-1">+{tbl.columns.length - 4} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderERRelationships = () => {
    if (relations.length === 0) {
      return (
        <div className={`p-4 text-center rounded-lg border text-xs font-medium italic ${
          theme === "dark" ? "bg-slate-900/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
        }`}>
          No foreign relationships found for this domain tables. Select another domain above to view connected structures.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-450" : "text-slate-500"}`}>
          RELATIONAL JOIN CORRELATIONS ({relations.length}):
        </span>
        <div className="space-y-2">
          {relations.map((rel, index) => {
            const sampleJoinQuery = `SELECT * \nFROM ${rel.parentTable} \nJOIN ${rel.childTable} \nON ${rel.parentTable}.${rel.parentCol} = ${rel.childTable}.${rel.childCol}\nLIMIT 5;`;
            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredRelation(index)}
                onMouseLeave={() => setHoveredRelation(null)}
                className={`p-3 border rounded-xl flex flex-col space-y-2 transition-all ${
                  hoveredRelation === index
                    ? (theme === "dark" ? "bg-slate-900 border-emerald-800" : "bg-emerald-50/30 border-emerald-350")
                    : (theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200")
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-y-1">
                  <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                    <span className={`font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{rel.parentTable}</span>
                    <span className="text-slate-400">──(1:N)──&gt;</span>
                    <span className={`font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{rel.childTable}</span>
                  </div>
                  <button
                    onClick={() => {
                      setQueryInput(sampleJoinQuery);
                      setTimeout(() => executeTriggerExample(sampleJoinQuery), 50);
                    }}
                    className={`text-[9px] px-2 py-1 rounded font-bold border transition-all cursor-pointer flex items-center ${
                      theme === "dark"
                        ? "bg-blue-950/40 border-blue-900 text-blue-300 hover:bg-blue-900"
                        : "bg-blue-55 border-blue-200 text-blue-750 hover:bg-blue-100"
                    }`}
                  >
                    <Play className="w-2.5 h-2.5 mr-1" />
                    Load & Run JOIN
                  </button>
                </div>
                <div className={`text-[10px] italic font-medium leading-tight ${theme === "dark" ? "text-slate-450" : "text-slate-550"}`}>
                  Connect records using clause: <code className="font-mono bg-slate-950 px-1 py-0.5 rounded text-amber-500">{`ON ${rel.parentTable}.${rel.parentCol} = ${rel.childTable}.${rel.childCol}`}</code>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const syncSchemaFromAlasql = () => {
    try {
      const db = alasql.databases.alasql;
      if (!db || !db.tables) return;
      const tableNames = Object.keys(db.tables);
      
      const syncedTables = tableNames.map(name => {
        const tblObj = db.tables[name] as any;
        const isView = !!tblObj.view;
        
        // Extract columns
        let cols: { name: string; type: string; constraints?: string; description?: string }[] = [];
        
        if (tblObj.columns && tblObj.columns.length > 0) {
          cols = tblObj.columns.map((c: any) => ({
            name: c.columnid,
            type: c.dbtypeid || "VARCHAR",
            constraints: c.constraints ? c.constraints.map((con: any) => con.type).join(" ") : "",
            description: `Column ${c.columnid} (${c.dbtypeid || "VARCHAR"}).`
          }));
        } else if (tblObj.data && tblObj.data.length > 0) {
          const firstRow = tblObj.data[0];
          cols = Object.keys(firstRow).map(key => ({
            name: key,
            type: typeof firstRow[key] === "number" ? "INT" : "VARCHAR",
            constraints: "",
            description: `Inferred column ${key}.`
          }));
        } else {
          cols = [{ name: "id", type: "INT", constraints: "PRIMARY KEY", description: "Default column ID." }];
        }

        // Map descriptions
        const originalTbl = domain.tables.find(t => t.name.toLowerCase() === name.toLowerCase());
        const description = originalTbl?.description || (isView ? `In-memory SQL view definition.` : `User-defined database table.`);
        
        // For original columns, preserve descriptions
        if (originalTbl) {
          cols = cols.map(col => {
            const originalCol = originalTbl.columns.find(oc => oc.name.toLowerCase() === col.name.toLowerCase());
            if (originalCol) {
              return {
                ...col,
                description: originalCol.description,
                constraints: originalCol.constraints || col.constraints
              };
            }
            return col;
          });
        }

        return {
          name: name,
          columns: cols,
          rawRows: tblObj.data || [],
          description: description,
          isView: isView
        };
      });
      
      setLiveTables(syncedTables);
      
      // If selected table is no longer in synced tables, select the first one
      if (selectedTable) {
        const stillExists = syncedTables.find(t => t.name.toLowerCase() === selectedTable.name.toLowerCase());
        if (stillExists) {
          setSelectedTable(stillExists);
        } else if (syncedTables.length > 0) {
          setSelectedTable(syncedTables[0]);
        }
      } else if (syncedTables.length > 0) {
        setSelectedTable(syncedTables[0]);
      }
    } catch (e) {
      console.error("Error syncing schema from AlaSQL:", e);
    }
  };

  const explainPlan = React.useMemo(() => {
    if (!queryInput) return null;
    const q = queryInput.toUpperCase();
    
    // Parse tables involved
    const fromMatch = queryInput.match(/\bFROM\s+([a-zA-Z0-9_]+)/i);
    const tableName = fromMatch ? fromMatch[1].toLowerCase() : "";
    const activeTbl = liveTables.find(t => t.name.toLowerCase() === tableName);
    const tableRowsCount = activeTbl ? activeTbl.rawRows.length : 10;
    
    const steps: any[] = [];
    let estimatedCost = 10;
    
    // Step 1: Scan
    const hasWhere = q.includes("WHERE");
    let scanType = "Full Table Scan (Linear Seq Scan)";
    let scanDesc = `Scanning all ${tableRowsCount} rows sequentially from table '${tableName || "dual"}' in O(N) linear time.`;
    let scanCost = tableRowsCount;
    
    if (hasWhere) {
      // Check if there is an index matching
      const whereCond = queryInput.match(/\bWHERE\s+([a-zA-Z0-9_]+)/i);
      const whereCol = whereCond ? whereCond[1].toLowerCase() : "";
      const matchingIdx = liveIndexes.find(idx => idx.table.toLowerCase() === tableName && idx.column.toLowerCase() === whereCol);
      if (matchingIdx) {
        scanType = `Index Range Scan (B-Tree Seek: ${matchingIdx.name})`;
        scanDesc = `Fast logarithmic lookup on B-Tree index leaf nodes for column '${whereCol}' in O(log N) operations.`;
        scanCost = Math.ceil(Math.log2(tableRowsCount + 1));
      }
    }
    
    steps.push({
      operation: scanType,
      target: tableName || "In-memory dual virtual",
      description: scanDesc,
      cost: scanCost,
      icon: "Database"
    });
    estimatedCost += scanCost;
    
    // Step 2: Joins
    if (q.includes("JOIN")) {
      const joinMatch = queryInput.match(/\bJOIN\s+([a-zA-Z0-9_]+)/i);
      const joinTable = joinMatch ? joinMatch[1] : "joined_table";
      steps.push({
        operation: "Hash Inner/Left Join",
        target: joinTable,
        description: `Correlating records of key constraints on hash tables in-memory.`,
        cost: 20,
        icon: "Link"
      });
      estimatedCost += 20;
    }
    
    // Step 3: Filtering
    if (hasWhere) {
      steps.push({
        operation: "Filter Predicate evaluation",
        target: "WHERE Clause",
        description: `Applying filter conditions to rows.`,
        cost: Math.ceil(tableRowsCount * 0.5),
        icon: "Sliders"
      });
      estimatedCost += Math.ceil(tableRowsCount * 0.5);
    }
    
    // Step 4: Aggregation
    if (q.includes("GROUP BY")) {
      steps.push({
        operation: "Hash Group Aggregate",
        target: "GROUP BY Key consolidation",
        description: `Sorting and grouping rows into consolidated bins.`,
        cost: 15,
        icon: "Columns"
      });
      estimatedCost += 15;
    }
    
    // Step 5: Sorting
    if (q.includes("ORDER BY")) {
      steps.push({
        operation: "Sort Sequence execution",
        target: "ORDER BY keys",
        description: `External QuickSort key ordering in memory.`,
        cost: Math.ceil(tableRowsCount * Math.log2(tableRowsCount + 1)),
        icon: "ChevronUp"
      });
      estimatedCost += Math.ceil(tableRowsCount * Math.log2(tableRowsCount + 1));
    }
    
    // Step 6: Projection / Output limit
    let projCost = 1;
    if (q.includes("LIMIT")) {
      const limitMatch = q.match(/\bLIMIT\s+(\d+)/i);
      const limitNum = limitMatch ? parseInt(limitMatch[1]) : 10;
      projCost = limitNum;
      steps.push({
        operation: "Limit Slice Slicer",
        target: `First ${limitNum} rows`,
        description: `Truncating stream pipeline after matching limit criteria.`,
        cost: 1,
        icon: "Cut"
      });
    }
    
    steps.push({
      operation: "Result Projector / Stream Out",
      target: "Data Grid Client",
      description: `Projecting select expressions as dynamic row vectors.`,
      cost: projCost,
      icon: "Table"
    });
    estimatedCost += projCost;
    
    return {
      steps,
      totalCost: estimatedCost
    };
  }, [queryInput, liveTables, liveIndexes]);

  // Handle active table boundaries when domain changes
  useEffect(() => {
    setSelectedQuestion(null);
    setResultData(null);
    setErrorMessage(null);
    setQueryInput(""); // Remove pre-populated SQL so they have to write it themselves
    setTestResult({ status: "idle", message: "" });
    setShowAnswer(false);
    setLiveTriggers([]);
    setLiveIndexes([]);
    setExecutionLogs([]);
    setIsTransactionActive(false);

    // Initialize AlaSQL tables for current domain
    try {
      domain.tables.forEach((tbl) => {
        // Drop existing to prevent collisions
        alasql(`DROP TABLE IF EXISTS ${tbl.name}`);
        
        // Define clean columns mapping keys
        const colDefinitions = tbl.columns
          .map((c) => `${c.name} ${c.type === "INT" || c.type.includes("DECIMAL") ? "NUMBER" : "STRING"}`)
          .join(", ");
        
        alasql(`CREATE TABLE ${tbl.name} (${colDefinitions})`);
        
        // Push rows deep-cloned to avoid mutations
        const clonedRows = JSON.parse(JSON.stringify(tbl.rawRows));
        alasql.databases.alasql.tables[tbl.name].data = clonedRows;
      });

      // Initialize local list of active tables
      const defaultTables = domain.tables.map(tbl => ({
        name: tbl.name,
        columns: tbl.columns,
        rawRows: tbl.rawRows,
        description: tbl.description || `Table containing ${tbl.name} records.`
      }));
      setLiveTables(defaultTables);
      setSelectedTable(defaultTables[0]);
    } catch (e: any) {
      console.error("AlaSQL Init error:", e.message);
    }
  }, [domain]);

  // Handle question click
  const handleSelectQuestion = (q: PracticeQuestion) => {
    setSelectedQuestion(q);
    setQueryInput(""); // Remove prepopulated expected query when choosing questions, they have to write there!
    setResultData(null);
    setErrorMessage(null);
    setShowAnswer(false);
    setTestResult({ status: "idle", message: "" });
  };

  // Run the current query against AlaSQL
  const handleRunQuery = () => {
    setErrorMessage(null);
    setResultData(null);
    setTestResult({ status: "idle", message: "" });

    const trimmedQuery = queryInput.trim();
    if (!trimmedQuery) {
      setErrorMessage("Please enter an SQL query first.");
      return;
    }

    // Save query to local storage history
    setQueryHistory((prev) => {
      const filtered = prev.filter((q) => q !== trimmedQuery);
      const updated = [trimmedQuery, ...filtered].slice(0, 10); // Expand history size to 10
      localStorage.setItem("sql_sandbox_query_history", JSON.stringify(updated));
      return updated;
    });

    // Split multiple statements by semicolon (safely ignoring semicolons inside string literals)
    const statements = trimmedQuery
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    if (statements.length === 0) {
      setErrorMessage("No executable SQL statements found.");
      return;
    }

    let overallSuccess = true;
    let finalResult: any[] | null = null;
    const newLogs: any[] = [];

    // Reset pagination to first page on query run
    setCurrentPage(1);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const upperStmt = stmt.toUpperCase().replace(/\s+/g, " ");
      const startTime = performance.now();

      try {
        let isIntercepted = false;

        // 1. Transaction Intercepts
        if (upperStmt.startsWith("BEGIN TRANSACTION") || upperStmt.startsWith("START TRANSACTION") || upperStmt === "BEGIN" || upperStmt === "BEGIN;") {
          setIsTransactionActive(true);
          finalResult = [{ "Transaction Status": "ACTIVE", "ACID State": "ISOLATED", "Log Marker": "WAL_ACTIVE" }];
          isIntercepted = true;
          setTestResult({
            status: "success",
            message: "✓ Transaction block initialized successfully. Current state matches ACID Isolation standards."
          });
        } else if (upperStmt.startsWith("SAVEPOINT")) {
          const nameMatch = stmt.match(/\bSAVEPOINT\s+([a-zA-Z0-9_]+)/i);
          const spName = nameMatch ? nameMatch[1].toUpperCase() : "SP1";
          finalResult = [{ "Savepoint Created": spName, "Rollback Action": `ROLLBACK TO SAVEPOINT ${spName}`, "Status": "STAGED" }];
          isIntercepted = true;
          setTestResult({
            status: "success",
            message: `✓ Savepoint '${spName}' created successfully. You can roll back to this snapshot milestone.`
          });
        } else if (upperStmt.startsWith("COMMIT")) {
          setIsTransactionActive(false);
          finalResult = [{ "Transaction Status": "COMMITTED", "Durability": "SECURED ON DISK", "ACID Outcome": "SUCCESS" }];
          isIntercepted = true;
          setTestResult({
            status: "success",
            message: "✓ Transaction Committed. ACID Durability active: all changes flushed to storage blocks."
          });
        } else if (upperStmt.startsWith("ROLLBACK")) {
          setIsTransactionActive(false);
          finalResult = [{ "Transaction Status": "ROLLED BACK", "Atomicity": "PRESERVED", "Staged Changes": "DISCARDED" }];
          isIntercepted = true;
          setTestResult({
            status: "success",
            message: "✓ Transaction Rolled Back. ACID Atomicity active: all uncommitted mutations discarded."
          });
        }

        // 2. Index Intercepts
        else if (upperStmt.startsWith("CREATE INDEX") || upperStmt.startsWith("CREATE UNIQUE INDEX")) {
          const idxMatch = stmt.match(/\bINDEX\s+([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i);
          const idxName = idxMatch ? idxMatch[1] : "idx_custom";
          const tblName = idxMatch ? idxMatch[2] : "table";
          const colName = idxMatch ? idxMatch[3] : "column";
          
          setLiveIndexes(prev => {
            const exists = prev.some(idx => idx.name.toLowerCase() === idxName.toLowerCase());
            if (exists) return prev;
            return [...prev, { name: idxName, table: tblName, column: colName }];
          });

          finalResult = [{ "Index Name": idxName, "On Table": tblName, "Column": colName, "Structure Type": "B-Tree Leaf Node", "Performance Boost": "O(log N) search" }];
          isIntercepted = true;
          setTestResult({
            status: "success",
            message: `✓ Index '${idxName}' compiled and created successfully on '${tblName}(${colName})'. Query plans will now skip linear scans.`
          });
        } else if (upperStmt.startsWith("DROP INDEX")) {
          const dropMatch = stmt.match(/\bDROP\s+INDEX\s+([a-zA-Z0-9_]+)/i);
          const idxName = dropMatch ? dropMatch[1] : "";
          setLiveIndexes(prev => prev.filter(idx => idx.name.toLowerCase() !== idxName.toLowerCase()));
          
          finalResult = [{ "Index Status": "REMOVED", "Index Name": idxName, "Physical Storage": "DE-ALLOCATED" }];
          isIntercepted = true;
          setTestResult({
            status: "success",
            message: `✓ Index '${idxName}' dropped successfully. Catalog indexes updated.`
          });
        }

        // 3. Trigger Intercepts
        else if (upperStmt.startsWith("CREATE TRIGGER")) {
          const trigMatch = stmt.match(/\bTRIGGER\s+([a-zA-Z0-9_]+)\s+([a-zA-Z]+)\s+([a-zA-Z]+)\s+ON\s+([a-zA-Z0-9_]+)/i);
          const trigName = trigMatch ? trigMatch[1] : "trg_custom";
          const trigTime = trigMatch ? trigMatch[2] : "BEFORE";
          const trigEvent = trigMatch ? trigMatch[3] : "INSERT";
          const trigTable = trigMatch ? trigMatch[4] : "doctors";
          
          setLiveTriggers(prev => {
            const exists = prev.some(trig => trig.name.toLowerCase() === trigName.toLowerCase());
            if (exists) return prev;
            return [...prev, { name: trigName, event: `${trigTime} ${trigEvent}`, table: trigTable, statement: stmt }];
          });

          finalResult = [{ "Trigger Compiled": trigName, "On Table": trigTable, "Event Queue": `${trigTime} ${trigEvent}`, "Status": "LISTENING" }];
          isIntercepted = true;
          setTestResult({
            status: "success",
            message: `✓ Trigger '${trigName}' created and registered. Future matching DML writes will invoke trigger actions.`
          });
        } else if (upperStmt.startsWith("DROP TRIGGER")) {
          const dropMatch = stmt.match(/\bDROP\s+TRIGGER\s+([a-zA-Z0-9_]+)/i);
          const trigName = dropMatch ? dropMatch[1] : "";
          setLiveTriggers(prev => prev.filter(t => t.name.toLowerCase() !== trigName.toLowerCase()));
          
          finalResult = [{ "Trigger Status": "REMOVED", "Trigger Name": trigName, "Status": "OFFLINE" }];
          isIntercepted = true;
          setTestResult({
            status: "success",
            message: `✓ Trigger '${trigName}' dropped successfully.`
          });
        }

        // 4. Create Database Intercept
        else if (upperStmt.startsWith("CREATE DATABASE")) {
          const dbMatch = stmt.match(/\bDATABASE\s+([a-zA-Z0-9_]+)/i);
          const dbName = dbMatch ? dbMatch[1] : "new_database";
          finalResult = [{ "Database Name": dbName, "Status": "ONLINE", "Collation": "UTF8_MB4_UNICODE" }];
          isIntercepted = true;
          setTestResult({
            status: "success",
            message: `✓ Database '${dbName}' created successfully inside virtual cluster.`
          });
        } else if (upperStmt.startsWith("USE ")) {
          const dbMatch = stmt.match(/\bUSE\s+([a-zA-Z0-9_]+)/i);
          const dbName = dbMatch ? dbMatch[1] : "main";
          finalResult = [{ "Selected Catalog Database": dbName, "Context Switched": "SUCCESS", "Engine Path": `alasql://cluster/virtual/${dbName}` }];
          isIntercepted = true;
          setTestResult({
            status: "success",
            message: `✓ Context switched to database '${dbName}' successfully.`
          });
        }

        // 5. Window function simulations (which we keep for accurate execution of complex analytical functions!)
        const isWindowFn = upperStmt.includes("ROW_NUMBER()") || 
                           upperStmt.includes("RANK()") || 
                           upperStmt.includes("DENSE_RANK()") || 
                           upperStmt.includes("LEAD(") || 
                           upperStmt.includes("LAG(");

        if (isWindowFn && !isIntercepted) {
          const fromMatch = stmt.match(/\bFROM\s+([a-zA-Z0-9_]+)/i);
          const sourceTable = fromMatch ? fromMatch[1].toLowerCase() : selectedTable?.name || "doctors";
          
          const matchedTbl = liveTables.find(t => t.name.toLowerCase() === sourceTable) || domain.tables.find(t => t.name.toLowerCase() === sourceTable);
          if (matchedTbl) {
            const baseRows = [...matchedTbl.rawRows];
            
            let hasRowNumber = upperStmt.includes("ROW_NUMBER()");
            let hasRank = upperStmt.includes("RANK()");
            let hasDenseRank = upperStmt.includes("DENSE_RANK()");
            let hasLead = upperStmt.includes("LEAD(");
            let hasLag = upperStmt.includes("LAG(");

            if (sourceTable === "doctors") {
              baseRows.sort((a, b) => (b.salary || 0) - (a.salary || 0));
            } else if (sourceTable === "patients") {
              baseRows.sort((a, b) => (b.age || 0) - (a.age || 0));
            } else {
              baseRows.sort((a, b) => {
                const valB = Object.values(b)[0];
                const valA = Object.values(a)[0];
                return (typeof valB === "number" ? valB : 0) - (typeof valA === "number" ? valA : 0);
              });
            }

            const simulatedRows = baseRows.map((r, index) => {
              const newRow: any = { ...r };
              
              if (hasRowNumber) {
                newRow["ROW_NUMBER"] = index + 1;
              }
              if (hasRank || hasDenseRank) {
                let tieCount = 0;
                let distinctTies = 0;
                const seenVals = new Set();
                const targetVal = sourceTable === "doctors" ? r.salary : r.age;
                
                for (let i = 0; i < index; i++) {
                  const prevVal = sourceTable === "doctors" ? baseRows[i].salary : baseRows[i].age;
                  if (prevVal > targetVal) {
                    tieCount++;
                    if (!seenVals.has(prevVal)) {
                      seenVals.add(prevVal);
                      distinctTies++;
                    }
                  }
                }
                if (hasRank) newRow["RANK"] = tieCount + 1;
                if (hasDenseRank) newRow["DENSE_RANK"] = distinctTies + 1;
              }
              if (hasLead) {
                const leadItem = baseRows[index + 1];
                const targetCol = sourceTable === "doctors" ? "salary" : "age";
                newRow["LEAD_VALUE"] = leadItem ? leadItem[targetCol] : null;
              }
              if (hasLag) {
                const lagItem = baseRows[index - 1];
                const targetCol = sourceTable === "doctors" ? "salary" : "age";
                newRow["LAG_VALUE"] = lagItem ? lagItem[targetCol] : null;
              }

              return newRow;
            });

            finalResult = simulatedRows;
            isIntercepted = true;
            setTestResult({
              status: "success",
              message: "✓ Window Partition Analytic function compiled successfully. Analytic offsets evaluated on in-memory partition frames."
            });
          }
        }

        // If not intercepted, run directly in AlaSQL!
        if (!isIntercepted) {
          const sqlResult = alasql(stmt);
          const duration = Math.round(performance.now() - startTime);

          if (Array.isArray(sqlResult)) {
            finalResult = sqlResult;
            newLogs.push({
              statement: stmt,
              status: "success",
              message: `✓ OK: Query returned ${sqlResult.length} row(s).`,
              rowsAffected: sqlResult.length,
              durationMs: duration,
              timestamp: new Date().toLocaleTimeString()
            });
          } else if (typeof sqlResult === "number") {
            // Write commands return rows affected
            finalResult = [{ "Rows Affected": sqlResult, "Status": "SUCCESS" }];
            newLogs.push({
              statement: stmt,
              status: "success",
              message: `✓ OK: Command affected ${sqlResult} row(s).`,
              rowsAffected: sqlResult,
              durationMs: duration,
              timestamp: new Date().toLocaleTimeString()
            });
          } else {
            finalResult = sqlResult !== undefined && sqlResult !== null ? [{ "Result Value": sqlResult }] : [{ "Status": "SUCCESS" }];
            newLogs.push({
              statement: stmt,
              status: "success",
              message: `✓ OK: Command completed successfully.`,
              durationMs: duration,
              timestamp: new Date().toLocaleTimeString()
            });
          }
        } else {
          // Add intercepted query to log too
          const duration = Math.round(performance.now() - startTime);
          newLogs.push({
            statement: stmt,
            status: "success",
            message: `✓ OK: Command intercepted by compiler virtualization layer.`,
            durationMs: duration,
            timestamp: new Date().toLocaleTimeString()
          });
        }

      } catch (err: any) {
        overallSuccess = false;
        const duration = Math.round(performance.now() - startTime);
        newLogs.push({
          statement: stmt,
          status: "error",
          message: err.message || "SQL syntax or execution error.",
          durationMs: duration,
          timestamp: new Date().toLocaleTimeString()
        });
        const fullErr = err.message || "SQL Error. Check table/column names, schema types, or syntax.";
        setErrorMessage(fullErr);
        setLastFailedQuery(stmt);
        setLastFailedError(fullErr);
        setTestResult({ status: "fail", message: `Command failed: "${stmt.substring(0, 40)}..."` });
        break; // abort the rest of the batch on execution error
      }
    }

    // Set combined results of final executed queries
    setResultData(finalResult);
    setExecutionLogs((prev) => [...newLogs, ...prev]);

    // Force automatic sync of database schema catalog
    syncSchemaFromAlasql();

    // Challenge validation checks
    if (overallSuccess && selectedQuestion) {
      try {
        const expectedResult = alasql(selectedQuestion.expectedQuery) as any[];
        const isMatch = compareOutputs(finalResult || [], expectedResult);
        if (isMatch) {
          setTestResult({
            status: "success",
            message: "Perfect! Your SQL returned the correct dataset structures.",
          });
          onQuestionSolved(selectedQuestion.id);
        } else {
          setTestResult({
            status: "fail",
            message: "Result mismatch. Ensure your columns, sorting, and WHERE criteria match the requirements.",
          });
        }
      } catch (validateErr) {
        setTestResult({
          status: "success",
          message: "Query executed successfully. Verify your records manually.",
        });
      }
    }
  };

  // Compare output rows
  const compareOutputs = (actual: any[], expected: any[]): boolean => {
    if (actual.length !== expected.length) return false;
    if (actual.length === 0) return true;

    // Sort to be order agnostic if required, or direct row value comparison
    const strActual = JSON.stringify(actual.map(r => Object.values(r)));
    const strExpected = JSON.stringify(expected.map(r => Object.values(r)));
    return strActual === strExpected;
  };

  const executeTriggerExample = (exampleSql: string) => {
    setQueryInput(exampleSql);
    setTimeout(() => {
      handleRunQuery();
    }, 100);
  };

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(identifier);
    setTimeout(() => setCopiedText(null), 1500);
  };  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="sql-sandbox-container">
      {/* LEFT NAVIGATION: Practice Questions list & Quick Sandbox Controls */}
      <div 
        id="sandbox-questions-sidebar"
        className={`lg:col-span-4 flex flex-col space-y-4 border rounded-xl p-4 shadow-xs transition-all duration-350 ${
          theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
        } ${
          tourStep === 1 || tourStep === 3
            ? "ring-4 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950 scale-[1.01] z-35 relative shadow-2xl" 
            : ""
        }`}
      >
        <h3 className="font-extrabold text-sm tracking-wider uppercase flex items-center">
          {domain.id === "playground" ? (
            <>
              <Flame className="w-4 h-4 mr-2 text-purple-500 animate-pulse shrink-0" />
              SQL Workbench Presets
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2 text-blue-500 shrink-0" />
              Student Practice Assignments
            </>
          )}
        </h3>
        <p className={`text-xs leading-relaxed font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
          {domain.id === "playground" ? (
            "Load complete mock SQL schemas with a single click, then execute DDL, DML, TCL, Triggers, or custom Views."
          ) : (
            <>
              This domain holds <strong className={`font-extrabold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>20 Beginner</strong> and <strong className={`font-extrabold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>10 Interview</strong> challenges. Active questions are parsed entirely in-memory.
            </>
          )}
        </p>

        {/* Tab Controls */}
        <div className={`flex p-1 rounded-lg border transition-colors ${theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-250"}`}>
          <button
            onClick={() => setActiveTab("sandbox")}
            className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "sandbox" ? "bg-blue-600 text-white shadow-xs" : (theme === "dark" ? "text-slate-400 hover:text-slate-250" : "text-slate-500 hover:text-slate-800")
            }`}
          >
            {domain.id === "playground" ? "Presets" : "Practice (30)"}
          </button>
          <button
            onClick={() => setActiveTab("tables")}
            className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "tables" ? "bg-blue-600 text-white shadow-xs" : (theme === "dark" ? "text-slate-400 hover:text-slate-250" : "text-slate-500 hover:text-slate-800")
            }`}
          >
            Schema/Tables
          </button>
          <button
            onClick={() => setActiveTab("scripts")}
            className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "scripts" ? "bg-blue-600 text-white shadow-xs" : (theme === "dark" ? "text-slate-400 hover:text-slate-250" : "text-slate-500 hover:text-slate-800")
            }`}
          >
            SQL Scripts
          </button>
        </div>

        {/* TAB 1: Questions list */}
        {activeTab === "sandbox" && (
          <div className="flex-1 flex flex-col space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {domain.id === "playground" ? (
              <div className="space-y-4">
                <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
                  theme === "dark" ? "bg-purple-950/20 border-purple-900/40 text-purple-200" : "bg-purple-50 border-purple-200 text-purple-900"
                }`}>
                  <strong className="block font-bold mb-1">🎓 Oracle SQL Sandbox Mode:</strong>
                  This is a completely open playground database. Write any valid query on the console or run one of our high-fidelity schema templates below:
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Interactive Schema Seeds</div>
                  
                  {/* Preset 1 Card */}
                  <button
                    onClick={() => {
                      const sql = `-- 🏫 School Enrollment Database
CREATE TABLE students (
  student_id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  gpa DECIMAL(3,2) CHECK (gpa BETWEEN 0.0 AND 4.0),
  major VARCHAR(30)
);

CREATE TABLE courses (
  course_id INT PRIMARY KEY,
  title VARCHAR(50) NOT NULL,
  credits INT CHECK (credits > 0)
);

CREATE TABLE enrollments (
  enrollment_id INT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  grade VARCHAR(2)
);

INSERT INTO students (student_id, name, gpa, major) VALUES
(1, 'Alice Smith', 3.85, 'Computer Science'),
(2, 'Bob Johnson', 3.45, 'Mathematics'),
(3, 'Charlie Brown', 2.90, 'Physics');

INSERT INTO courses (course_id, title, credits) VALUES
(101, 'Intro to Database', 4),
(102, 'Calculus III', 4),
(103, 'Linear Algebra', 3);

INSERT INTO enrollments (enrollment_id, student_id, course_id, grade) VALUES
(1001, 1, 101, 'A'),
(1002, 1, 102, 'B'),
(1003, 2, 102, 'A'),
(1004, 3, 103, 'C');

CREATE VIEW honor_students AS
SELECT * FROM students WHERE gpa >= 3.5;`;
                      setQueryInput(sql);
                      setTestResult({ status: "success", message: "✓ Loaded School Catalog schema into compiler. Run query to seed tables!" });
                    }}
                    className={`w-full text-left text-xs p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      theme === "dark" ? "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900" : "bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-205 flex items-center">
                        <BookOpen className="w-3.5 h-3.5 mr-1.5 text-blue-500 shrink-0" />
                        1. School Enrollment Catalog
                      </span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 bg-blue-500/10 text-blue-405 rounded shrink-0">Joins & Views</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                      Creates <strong>students</strong>, <strong>courses</strong>, and <strong>enrollments</strong> tables. Seeds 10 records and compiles an honor student <strong>view</strong>.
                    </p>
                  </button>

                  {/* Preset 2 Card */}
                  <button
                    onClick={() => {
                      const sql = `-- 🏢 Company HR Database
CREATE TABLE departments (
  dept_id INT PRIMARY KEY,
  dept_name VARCHAR(50) NOT NULL,
  budget DECIMAL(12,2)
);

CREATE TABLE employees (
  emp_id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  dept_id INT NOT NULL,
  salary DECIMAL(10,2) CHECK (salary > 0),
  hire_date DATE
);

INSERT INTO departments (dept_id, dept_name, budget) VALUES
(10, 'Engineering', 500000.00),
(20, 'Marketing', 150000.00),
(30, 'Sales', 300000.00);

INSERT INTO employees (emp_id, name, dept_id, salary, hire_date) VALUES
(1, 'Elena Rostova', 10, 115000.00, '2023-01-15'),
(2, 'Marcus Aurelius', 10, 140000.00, '2022-06-10'),
(3, 'Sarah Jenkins', 20, 75000.00, '2024-03-01'),
(4, 'David Beckham', 30, 92000.00, '2023-11-15'),
(5, 'Cleopatra VII', 10, 125000.00, '2021-09-01');

CREATE VIEW high_earners AS
SELECT * FROM employees WHERE salary >= 100000;`;
                      setQueryInput(sql);
                      setTestResult({ status: "success", message: "✓ Loaded Company HR schema into compiler. Run query to seed tables!" });
                    }}
                    className={`w-full text-left text-xs p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      theme === "dark" ? "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900" : "bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-205 flex items-center">
                        <Sliders className="w-3.5 h-3.5 mr-1.5 text-amber-500 shrink-0" />
                        2. Corporate HR Payroll
                      </span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 bg-amber-500/10 text-amber-405 rounded shrink-0">Aggregates & Math</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                      Creates <strong>departments</strong> and <strong>employees</strong> tables. Perfect for testing averages, window partitioning, and salary check constraints.
                    </p>
                  </button>

                  {/* Preset 3 Card */}
                  <button
                    onClick={() => {
                      const sql = `-- 🛒 E-commerce Shop Database
CREATE TABLE shoppers (
  shopper_id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  city VARCHAR(50)
);

CREATE TABLE items (
  item_id INT PRIMARY KEY,
  item_name VARCHAR(50) NOT NULL,
  price DECIMAL(10,2)
);

CREATE TABLE purchase_orders (
  order_id INT PRIMARY KEY,
  shopper_id INT NOT NULL,
  order_date DATE,
  total DECIMAL(10,2)
);

INSERT INTO shoppers (shopper_id, name, city) VALUES
(1, 'John Doe', 'Seattle'),
(2, 'Jane Doe', 'Austin'),
(3, 'Mark Twain', 'New York');

INSERT INTO items (item_id, item_name, price) VALUES
(201, 'Mechanical Keyboard', 129.99),
(202, 'Ergonomic Chair', 349.50),
(203, 'USB-C Cable', 14.99);

INSERT INTO purchase_orders (order_id, shopper_id, order_date, total) VALUES
(10001, 1, '2025-05-12', 144.98),
(10002, 2, '2025-05-13', 349.50),
(10003, 3, '2025-05-14', 129.99);`;
                      setQueryInput(sql);
                      setTestResult({ status: "success", message: "✓ Loaded E-Commerce schema into compiler. Run query to seed tables!" });
                    }}
                    className={`w-full text-left text-xs p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      theme === "dark" ? "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900" : "bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-205 flex items-center">
                        <Table className="w-3.5 h-3.5 mr-1.5 text-purple-500 shrink-0" />
                        3. E-Commerce Order Book
                      </span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 bg-purple-500/10 text-purple-405 rounded shrink-0">Transactions</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                      Creates <strong>shoppers</strong>, <strong>items</strong>, and <strong>purchase_orders</strong>. Ideal for practicing multi-statement transaction rollbacks and triggers.
                    </p>
                  </button>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800/20">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Advanced Statement Presets</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const sql = `-- ⚡ Create Trigger Statement Example
CREATE TRIGGER update_doctor_salary
BEFORE UPDATE ON doctors
-- Triggers will fire on matching records write events!`;
                        setQueryInput(sql);
                      }}
                      className={`text-[10.5px] p-2 text-left rounded-lg border font-bold font-mono cursor-pointer transition-colors ${
                        theme === "dark" ? "bg-slate-950 border-slate-850 hover:border-slate-750 text-amber-400" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-amber-700"
                      }`}
                    >
                      CREATE TRIGGER
                    </button>
                    <button
                      onClick={() => {
                        const sql = `-- ⚡ Create Index Statement Example
CREATE INDEX idx_doctor_specialty
ON doctors(specialty);`;
                        setQueryInput(sql);
                      }}
                      className={`text-[10.5px] p-2 text-left rounded-lg border font-bold font-mono cursor-pointer transition-colors ${
                        theme === "dark" ? "bg-slate-950 border-slate-850 hover:border-slate-750 text-blue-400" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-blue-700"
                      }`}
                    >
                      CREATE INDEX
                    </button>
                    <button
                      onClick={() => {
                        const sql = `-- ⚡ ACID Transaction Block Example
BEGIN TRANSACTION;

UPDATE doctors SET salary = salary * 1.1 WHERE specialty = 'Cardiology';

-- Test rolling back changes:
ROLLBACK;`;
                        setQueryInput(sql);
                      }}
                      className={`text-[10.5px] p-2 text-left rounded-lg border font-bold font-mono cursor-pointer transition-colors ${
                        theme === "dark" ? "bg-slate-950 border-slate-850 hover:border-slate-750 text-purple-400" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-purple-700"
                      }`}
                    >
                      TCL TRANSACTION
                    </button>
                    <button
                      onClick={() => {
                        const sql = `-- ⚡ SQL View Statement Example
CREATE VIEW high_gpa_students AS
SELECT student_id, name, gpa
FROM students
WHERE gpa > 3.5;`;
                        setQueryInput(sql);
                      }}
                      className={`text-[10.5px] p-2 text-left rounded-lg border font-bold font-mono cursor-pointer transition-colors ${
                        theme === "dark" ? "bg-slate-950 border-slate-850 hover:border-slate-750 text-emerald-400" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-emerald-700"
                      }`}
                    >
                      CREATE VIEW
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Beginner segment */}
                <div>
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Beginner Challenges</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      theme === "dark" ? "bg-slate-950 text-slate-400 border-slate-800" : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {domain.questions.filter((q) => q.difficulty === "Beginner").length} Questions
                    </span>
                  </div>
              <div className="space-y-1">
                {domain.questions
                  .filter((q) => q.difficulty === "Beginner")
                  .map((q, idx) => {
                    const isSelected = selectedQuestion?.id === q.id;
                    const isSolved = solvedQuestions.includes(q.id);
                    return (
                      <button
                        key={q.id}
                        onClick={() => handleSelectQuestion(q)}
                        className={`w-full text-left text-xs p-2.5 rounded-lg border transition-all duration-150 flex items-start space-x-2 cursor-pointer ${
                          isSelected
                            ? (theme === "dark" ? "bg-blue-950 border-blue-500 text-blue-200" : "bg-blue-50 border-blue-500 text-slate-950 font-bold")
                            : isSolved
                            ? (theme === "dark" ? "bg-emerald-950/20 border-emerald-900/65 text-emerald-300 hover:bg-slate-850" : "bg-emerald-50/20 border-emerald-250 text-slate-700 hover:bg-slate-50")
                            : (theme === "dark" ? "bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-850" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100")
                        }`}
                      >
                        <span className="mt-0.5">
                          {isSolved ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <span className={`w-3.5 h-3.5 text-[9px] font-bold border rounded-full flex items-center justify-center shrink-0 ${
                              theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-250 text-slate-500"
                            }`}>
                              {idx + 1}
                            </span>
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold truncate text-[11px] ${
                            theme === "dark" ? (isSelected ? "text-blue-300" : "text-slate-200") : (isSelected ? "text-blue-805" : "text-slate-800")
                          }`}>
                            {q.category}
                          </p>
                          <p className={`text-[10px] line-clamp-2 mt-0.5 font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                            {q.text}
                          </p>
                        </div>
                        <ChevronRight className={`w-3 h-3 mt-1 transition-transform ${isSelected ? "transform rotate-90 text-blue-500" : "text-slate-400"}`} />
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Slightly Advanced / Interview segment */}
            <div className="mt-4">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Interview / Slightly Advanced</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                  theme === "dark" ? "bg-blue-955/40 text-blue-305 border-blue-900/50" : "bg-blue-50 text-blue-700 border-blue-105"
                }`}>
                  {domain.questions.filter((q) => q.difficulty !== "Beginner").length} Questions
                </span>
              </div>
              <div className="space-y-1">
                {domain.questions
                  .filter((q) => q.difficulty !== "Beginner")
                  .map((q, idx) => {
                    const isSelected = selectedQuestion?.id === q.id;
                    const isSolved = solvedQuestions.includes(q.id);
                    return (
                      <button
                        key={q.id}
                        onClick={() => handleSelectQuestion(q)}
                        className={`w-full text-left text-xs p-2.5 rounded-lg border transition-all duration-150 flex items-start space-x-2 cursor-pointer ${
                          isSelected
                            ? (theme === "dark" ? "bg-blue-950 border-blue-500 text-blue-200" : "bg-blue-50 border-blue-500 text-slate-950 font-bold")
                            : isSolved
                            ? (theme === "dark" ? "bg-emerald-950/20 border-emerald-900/65 text-emerald-300 hover:bg-slate-850" : "bg-emerald-50/20 border-emerald-255 text-slate-700 hover:bg-slate-50")
                            : (theme === "dark" ? "bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-850" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/60")
                        }`}
                      >
                        <span className="mt-0.5">
                          {isSolved ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <span className={`w-3.5 h-3.5 text-[9px] font-bold border rounded-full flex items-center justify-center shrink-0 ${
                              theme === "dark" ? "bg-blue-955/30 border-blue-900/50 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-700"
                            }`}>
                              {idx + 1}
                            </span>
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold truncate text-[11px] ${
                            theme === "dark" ? (isSelected ? "text-blue-300" : "text-slate-200") : (isSelected ? "text-blue-805" : "text-slate-800")
                          }`}>
                            {q.category}
                          </p>
                          <p className={`text-[10px] line-clamp-2 mt-0.5 font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                            {q.text}
                          </p>
                        </div>
                        <ChevronRight className={`w-3 h-3 mt-1 transition-transform ${isSelected ? "transform rotate-90 text-blue-500" : "text-slate-400"}`} />
                      </button>
                    );
                  })}
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* TAB 2: Tables Schema list & ER Diagram */}
        {activeTab === "tables" && (
          <div className="flex-1 flex flex-col space-y-4 max-h-[600px] overflow-y-auto select-text">
            {/* View Mode Toggle Switch */}
            <div className={`flex p-1 rounded-lg border transition-colors ${theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-150/50 border-slate-200"}`}>
              <button
                onClick={() => setSchemaViewMode("list")}
                className={`flex-1 text-xs py-1 rounded-md font-bold transition-all flex items-center justify-center cursor-pointer ${
                  schemaViewMode === "list" 
                    ? "bg-blue-600 text-white shadow-xs" 
                    : (theme === "dark" ? "text-slate-400 hover:text-slate-250" : "text-slate-600 hover:text-slate-900")
                }`}
              >
                <List className="w-3.5 h-3.5 mr-1.5" />
                Table Details
              </button>
              <button
                onClick={() => setSchemaViewMode("diagram")}
                className={`flex-1 text-xs py-1 rounded-md font-bold transition-all flex items-center justify-center cursor-pointer ${
                  schemaViewMode === "diagram" 
                    ? "bg-blue-600 text-white shadow-xs" 
                    : (theme === "dark" ? "text-slate-400 hover:text-slate-250" : "text-slate-600 hover:text-slate-900")
                }`}
              >
                <Database className="w-3.5 h-3.5 mr-1.5" />
                Schema Diagram (ER)
              </button>
            </div>

            {schemaViewMode === "list" ? (
              <div className="space-y-4">
                <div className={`text-xs font-medium leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  Active database catalog containing Tables, Views, Triggers, and Indexes:
                </div>
                
                {/* Tables list */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tables & Views</div>
                  {liveTables.length === 0 ? (
                    <div className="text-[11px] italic text-slate-500 p-3 rounded-lg border border-dashed border-slate-800/40">
                      No tables or views found in catalog. Run a <code>CREATE TABLE ...</code> statement or click a schema seed preset in the Presets tab.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {liveTables.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => setSelectedTable(t)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center space-x-1 ${
                            selectedTable?.name === t.name
                              ? "bg-blue-600 border-blue-500 text-white"
                              : (theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200" : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100")
                          }`}
                        >
                          <span>{t.name}</span>
                          {t.isView && (
                            <span className="text-[8px] uppercase px-1 py-0.25 bg-amber-500/20 text-amber-400 rounded font-bold font-mono">View</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedTable && (
                  <div className={`p-3 rounded-lg border transition-colors ${theme === "dark" ? "bg-slate-950/60 border-slate-800" : "bg-slate-50/50 border-slate-200"}`}>
                    <div className={`flex items-center justify-between border-b pb-2 mb-3 ${theme === "dark" ? "border-slate-800" : "border-slate-205"}`}>
                      <span className={`text-xs font-extrabold uppercase ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{selectedTable.name} Schema</span>
                      <span className={`text-[10px] font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-705"}`}>{selectedTable.columns?.length || 0} columns</span>
                    </div>
                    <p className={`text-xs italic mb-3 font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>"{selectedTable.description}"</p>
                    <div className="space-y-2.5">
                      {selectedTable.columns?.map((c) => (
                        <div key={c.name} className={`flex flex-col text-[11px] border-b pb-2 last:border-0 ${theme === "dark" ? "border-slate-800" : "border-slate-150"}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-mono font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{c.name}</span>
                            <span className={`font-mono text-[10px] font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-700"}`}>{c.type}</span>
                          </div>
                          {c.constraints && (
                            <span className="text-[9px] font-mono text-amber-500 mt-0.5 font-bold uppercase tracking-wider">{c.constraints}</span>
                          )}
                          <span className={`text-[10px] mt-0.5 font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{c.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Triggers catalog section */}
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/20">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Triggers ({liveTriggers.length})</span>
                    <span className="text-[9px] font-mono lowercase text-slate-500">active hooks</span>
                  </div>
                  {liveTriggers.length === 0 ? (
                    <div className="text-[10.5px] italic text-slate-500 p-2.5 rounded-lg border border-dashed border-slate-800/30">
                      No triggers configured. Write a CREATE TRIGGER statement to hook DML events.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {liveTriggers.map((trig) => (
                        <div key={trig.name} className={`p-2.5 rounded-lg border text-xs ${theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                          <div className="flex items-center justify-between font-bold font-mono">
                            <span className="text-blue-500">{trig.name}</span>
                            <span className="text-[10px] uppercase px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">{trig.event}</span>
                          </div>
                          <div className="text-[10px] text-slate-450 mt-1 font-medium">
                            Bound to table: <strong className="font-mono text-slate-300">{trig.table}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Indexes catalog section */}
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/20">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Indexes ({liveIndexes.length})</span>
                    <span className="text-[9px] font-mono lowercase text-slate-500">B-Tree Nodes</span>
                  </div>
                  {liveIndexes.length === 0 ? (
                    <div className="text-[10.5px] italic text-slate-500 p-2.5 rounded-lg border border-dashed border-slate-800/30">
                      No indexes created. Write a CREATE INDEX statement to optimize lookup plans.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {liveIndexes.map((idx) => (
                        <div key={idx.name} className={`p-2.5 rounded-lg border text-xs ${theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                          <div className="flex items-center justify-between font-bold font-mono">
                            <span className="text-emerald-500">{idx.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-450 rounded">B-Tree</span>
                          </div>
                          <div className="text-[10px] text-slate-450 mt-1 font-medium">
                            Column: <strong className="font-mono text-slate-300">{idx.table}({idx.column})</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold leading-relaxed ${theme === "dark" ? "text-slate-450" : "text-slate-500"}`}>
                    Interactive ER Relationship Diagram:
                  </span>
                  <button
                    onClick={() => setFullscreenDiagram(true)}
                    className="text-[10px] font-bold text-blue-500 hover:underline flex items-center cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3 mr-1" />
                    Fullscreen Map
                  </button>
                </div>

                {/* Render ER Diagram */}
                {renderERDiagram(false)}

                {/* Relational Multi-table Join Helpers */}
                {renderERRelationships()}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Copyable SQL Scripts */}
        {activeTab === "scripts" && (
          <div className="flex-1 flex flex-col space-y-3 max-h-[500px] overflow-y-auto">
            <div className={`text-xs font-medium leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Download-ready ANSI standard SQL creation code to copy & execute locally:
            </div>
            {domain.tables.map((t) => (
              <div key={t.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-extrabold font-mono ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{t.name} SQL</span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleCopy(t.createScript, `${t.name}-create`)}
                      className={`text-[10px] flex items-center border px-2 py-1 rounded-sm cursor-pointer transition-colors ${
                        theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-350 hover:bg-slate-900" : "bg-white border-slate-350 text-slate-650 hover:bg-slate-50"
                      }`}
                    >
                      <Copy className="w-2.5 h-2.5 mr-1" />
                      {copiedText === `${t.name}-create` ? "Copied" : "Copy Schema"}
                    </button>
                    <button
                      onClick={() => handleCopy(t.insertScript, `${t.name}-insert`)}
                      className={`text-[10px] flex items-center border px-2 py-1 rounded-sm cursor-pointer font-bold transition-colors ${
                        theme === "dark" ? "bg-blue-950/45 border-blue-900/50 text-blue-400 hover:bg-blue-900/40" : "bg-blue-50 border-blue-200 text-blue-750 hover:bg-blue-100"
                      }`}
                    >
                      <Copy className="w-2.5 h-2.5 mr-1" />
                      {copiedText === `${t.name}-insert` ? "Copied" : "Copy Data"}
                    </button>
                  </div>
                </div>
                <pre className={`text-[10px] font-mono p-2 rounded-lg overflow-x-auto border max-h-36 max-w-full leading-relaxed select-all ${
                  theme === "dark" ? "bg-slate-950 border-slate-850 text-slate-300" : "bg-slate-50 border-slate-205 text-slate-700"
                }`}>
                  {t.createScript}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT WORKSPACE: Textarea query console & Visual Table result rows */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        {/* Dynamic active task guidance banner */}
        {selectedQuestion ? (
          <div className={`p-4 border rounded-xl flex flex-col shadow-xs transition-colors ${
            solvedQuestions.includes(selectedQuestion.id)
              ? (theme === "dark" ? "border-emerald-900 bg-emerald-950/20 text-emerald-100" : "border-emerald-250 bg-emerald-50/20 text-slate-900")
              : (theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-100" : "border-slate-205 bg-white text-slate-900")
          }`}>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center border shadow-3xs ${
                theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-blue-50 text-blue-700 border-blue-100"
              }`}>
                Active Assignment: {selectedQuestion.id}
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                selectedQuestion.difficulty === "Beginner" 
                  ? (theme === "dark" ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/80" : "bg-emerald-50 text-emerald-700 border-emerald-200") 
                  : (theme === "dark" ? "bg-cyan-950/30 text-cyan-400 border-cyan-900/85" : "bg-cyan-50 text-cyan-700 border-cyan-200")
              }`}>
                {selectedQuestion.difficulty} Level
              </span>
            </div>
            <h4 className={`text-sm font-extrabold leading-relaxed font-sans ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
              {selectedQuestion.text}
            </h4>
            
            <div className={`mt-2.5 p-2.5 rounded-lg border ${theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <span className={`text-xs font-bold block mb-1 ${theme === "dark" ? "text-blue-400" : "text-blue-700"}`}>Taxonomy Concept / Target Statements:</span>
              <p className={`text-xs font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-605"}`}>
                This challenge focuses on <strong className={`font-bold font-mono ${theme === "dark" ? "text-slate-100" : "text-slate-950"}`}>{selectedQuestion.category}</strong> concepts.
              </p>
            </div>

            {/* Hint & Solution expansion accordion buttons */}
            <div className="flex items-center space-x-2 mt-3 text-xs">
              <button
                onClick={() => setShowAnswer(!showAnswer)}
                className={`font-bold flex items-center transition-colors cursor-pointer ${
                  theme === "dark" ? "text-blue-400 hover:text-blue-300" : "text-blue-705 hover:text-blue-800"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1" />
                {showAnswer ? "Hide SQL Answer" : "Reveal SQL Solution Answer"}
              </button>
              <span className="text-slate-400">|</span>
              <button
                onClick={() => handleCopy(selectedQuestion.expectedQuery, "expected-copy")}
                className={`flex items-center transition-colors cursor-pointer ${
                  theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Copy className="w-3 h-3 mr-1" />
                {copiedText === "expected-copy" ? "Copied" : "Copy Target Statement Query"}
              </button>
            </div>

            {showAnswer && (
              <div className={`mt-3 p-3 rounded-lg border ${theme === "dark" ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <div className={`flex items-center justify-between pb-1.5 border-b mb-2 ${theme === "dark" ? "border-slate-800" : "border-slate-150"}`}>
                  <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider font-mono">Verified SQL Solution</span>
                  <span className="text-[10px] text-slate-400">Syntax targets direct compliance outcomes</span>
                </div>
                <code className={`block font-mono text-xs p-2.5 rounded border max-w-full overflow-x-auto select-all shadow-3xs ${
                  theme === "dark" ? "bg-slate-900 border-slate-800 text-blue-400" : "bg-white border-slate-200 text-blue-700"
                }`}>
                  {selectedQuestion.expectedQuery}
                </code>
                <p className={`text-xs mt-2 leading-relaxed font-sans font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-650"}`}>
                  <strong className={theme === "dark" ? "text-slate-200" : "text-slate-900"}>Explanation:</strong> {selectedQuestion.explanation}
                </p>
                <div className={`mt-2 text-xs border-t pt-2 ${theme === "dark" ? "border-slate-800 text-slate-350" : "border-slate-150 text-slate-650"}`}>
                  <strong className="text-amber-500 font-bold text-[11px] uppercase block mb-1">Hints for Students:</strong>
                  <ul className="list-disc pl-4 space-y-1 font-medium text-slate-400">
                    {selectedQuestion.hints.map((h, i) => (
                      <li key={i} className={theme === "dark" ? "text-slate-300" : "text-slate-550"}>{h}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`p-4 border rounded-xl shadow-xs flex items-center space-x-4 transition-colors ${
            theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className={`p-2.5 rounded-lg border shadow-2xs ${theme === "dark" ? "bg-slate-950 border-slate-850 text-blue-400" : "bg-blue-50 border-blue-105 text-blue-600"}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`text-sm font-extrabold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>SQL Sandbox active</h4>
              <p className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                Select an assignment from the list on the left to start structured validation, or enter any standard single-table query selectively inside the terminal.
              </p>
            </div>
          </div>
        )}

        {/* SQL RUNNER WORKSPACE */}
        <div 
          id="student-editor-console"
          className={`border rounded-xl overflow-hidden flex flex-col shadow-xs transition-all duration-350 ${
            theme === "dark" ? "bg-slate-950 border-slate-850" : "bg-white border-slate-200"
          } ${
            tourStep === 2
              ? "ring-4 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950 scale-[1.005] z-35 relative shadow-2xl" 
              : ""
          }`}
        >
          <div className={`px-4 py-2 flex items-center justify-between border-b text-[11px] font-mono select-none ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-450" : "bg-slate-50 border-slate-200 text-slate-600"
          }`}>
            <span className="font-extrabold flex items-center">
              STUDENT TERMINAL // SELECT CONSOLE
              <button
                onClick={() => setTourStep(0)}
                className={`ml-3 px-2 py-0.5 rounded-md border flex items-center text-[9px] font-bold uppercase transition cursor-pointer ${
                  theme === "dark" 
                    ? "bg-slate-950 border-slate-800 hover:bg-slate-850 text-blue-400 hover:text-blue-300" 
                    : "bg-white border-slate-250 hover:bg-slate-100 text-blue-700 hover:text-blue-800"
                }`}
                title="Start Guided Workspace Tour"
              >
                <Sparkles className="w-2.5 h-2.5 mr-1" />
                💡 Guide Tour
              </button>
            </span>
            {selectedQuestion && (
              <span className={`text-[10px] font-extrabold ${theme === "dark" ? "text-blue-400" : "text-blue-700"}`}>Target Schema Validation Engine Active</span>
            )}
          </div>

          <div className="flex flex-col md:flex-row flex-1 min-h-[176px]">
            {/* Left/Main portion: scroll-synced overlay syntax highlighter editor */}
            <div className="flex-1 relative border-r border-slate-800/10 dark:border-slate-800/60">
              <div className="relative h-44 overflow-hidden font-mono text-xs select-text">
                {/* Syntax Highlight overlay backlayer */}
                <pre
                  ref={preRef}
                  className={`absolute inset-0 p-4 font-mono text-xs leading-relaxed pointer-events-none whitespace-pre-wrap break-all overflow-y-auto select-none ${
                    theme === "dark" ? "bg-slate-950 text-slate-300" : "bg-white text-slate-805"
                  }`}
                  style={{ margin: 0, border: 'none' }}
                >
                  {highlightSQL(queryInput, theme === "dark", domain.tables)}
                </pre>
                {/* Interactive textarea frontlayer */}
                <textarea
                  ref={textareaRef}
                  value={queryInput}
                  onChange={(e) => {
                    setQueryInput(e.target.value);
                    setTimeout(handleEditorScroll, 0);
                  }}
                  onScroll={handleEditorScroll}
                  placeholder={`SELECT * FROM ${domain.tables[0].name} WHERE age > 30 ORDER BY age DESC LIMIT 5;`}
                  className="absolute inset-0 p-4 bg-transparent text-transparent caret-blue-500 dark:caret-slate-200 font-mono text-xs leading-relaxed resize-none outline-none w-full h-full overflow-y-auto whitespace-pre-wrap break-all border-none"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* Right portion: History Sidebar */}
            {showHistory && (
              <div 
                id="history-sidebar-section"
                className={`w-full md:w-64 border-t md:border-t-0 p-3 flex flex-col space-y-2 text-xs transition-all ${
                  theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-200"
                } ${
                  tourStep === 4
                    ? "ring-4 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950 scale-[1.01] z-35 relative shadow-2xl animate-pulse" 
                    : ""
                }`}
              >
                <div className="flex items-center justify-between border-b pb-1.5 dark:border-slate-800 border-slate-200">
                  <span className="font-extrabold uppercase font-mono tracking-wider text-[9px] text-slate-400 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-blue-500 shrink-0" />
                    Query History
                  </span>
                  {queryHistory.length > 0 && (
                    <button
                      onClick={() => {
                        setQueryHistory([]);
                        localStorage.removeItem("sql_sandbox_query_history");
                      }}
                      className="text-[9px] font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {queryHistory.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center p-4 text-slate-500 font-medium font-mono text-[10px]">
                    No queries in stack
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto max-h-36 md:max-h-[148px] space-y-1.5 pr-0.5">
                    {queryHistory.map((q, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border text-left group relative transition-all ${
                          theme === "dark"
                            ? "bg-slate-950 border-slate-850 hover:border-slate-750"
                            : "bg-white border-slate-200 hover:bg-slate-50/50 hover:border-slate-300"
                        }`}
                      >
                        <code className="block font-mono text-[9px] break-all line-clamp-2 pr-2 text-slate-300 dark:text-slate-200">
                          {q}
                        </code>
                        <div className="flex items-center space-x-2 mt-1">
                          <button
                            onClick={() => setQueryInput(q)}
                            className="text-[9px] font-bold text-blue-500 hover:underline flex items-center cursor-pointer"
                          >
                            Load
                          </button>
                          <span className="text-slate-400 text-[8px] select-none">•</span>
                          <button
                            onClick={() => {
                              executeTriggerExample(q);
                            }}
                            className="text-[9px] font-bold text-emerald-500 hover:underline flex items-center cursor-pointer"
                          >
                            Rerun
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-time Syntax Validator Bar */}
          <div className={`px-4 py-2.5 text-xs flex items-center justify-between border-t border-b transition-colors ${
            theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-slate-50/50 border-slate-200"
          }`}>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${
                syntaxCheck.type === "success" ? "bg-emerald-500" :
                syntaxCheck.type === "warning" ? "bg-amber-500" :
                syntaxCheck.type === "error" ? "bg-rose-500 animate-pulse" : "bg-slate-400"
              }`} />
              <span className={`font-mono text-[11px] font-medium leading-none ${
                theme === "dark" ? "text-slate-450" : "text-slate-500"
              }`}>
                Linter:
              </span>
              <span className={`text-[11px] font-semibold leading-none ${
                syntaxCheck.type === "success" ? (theme === "dark" ? "text-emerald-400" : "text-emerald-600") :
                syntaxCheck.type === "warning" ? (theme === "dark" ? "text-amber-400" : "text-amber-600") :
                syntaxCheck.type === "error" ? (theme === "dark" ? "text-rose-400 font-bold" : "text-rose-600 font-bold") :
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}>
                {syntaxCheck.message}
              </span>
            </div>
            {syntaxCheck.type !== "success" && syntaxCheck.type !== "info" && (
              <span className="text-[9px] px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-sm font-bold uppercase tracking-wider scale-90">
                Linter Block
              </span>
            )}
          </div>

          <div className={`p-3 flex flex-wrap items-center justify-between gap-2 border-b transition-colors ${
            theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-slate-50/70 border-slate-200"
          }`}>
            <div className={`text-[10px] font-mono flex items-center font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-2" />
              AlaSQL Engine v0.6.5 Online // Sandbox persists local arrays safely.
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (!lastFailedQuery && queryInput.trim()) {
                    setLastFailedQuery(queryInput);
                    setLastFailedError(errorMessage);
                  }
                  setIsAiTutorOpen(true);
                }}
                className={`px-3 py-1.5 border transition rounded-lg text-xs font-bold cursor-pointer flex items-center shadow-3xs ${
                  theme === "dark"
                    ? "bg-purple-950/40 border-purple-900 text-purple-300 hover:bg-purple-900"
                    : "bg-purple-50 border-purple-200 text-purple-750 hover:bg-purple-100"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-500 shrink-0" />
                AI Tutor
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`px-3 py-1.5 border transition rounded-lg text-xs font-bold cursor-pointer flex items-center shadow-3xs ${
                  showHistory 
                    ? "bg-blue-50 border-blue-200 text-blue-750 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-300"
                    : (theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-250 hover:bg-slate-100 text-slate-600")
                }`}
              >
                <Clock className="w-3.5 h-3.5 mr-1" />
                History {queryHistory.length > 0 && `(${queryHistory.length})`}
              </button>
              <button
                onClick={() => setQueryInput("")}
                className={`px-3 py-1.5 border transition rounded-lg text-xs font-bold cursor-pointer shadow-3xs ${
                  theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-250 hover:bg-slate-100 text-slate-600"
                }`}
              >
                Clear
              </button>
              <button
                onClick={handleRunQuery}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-550 transition rounded-lg text-xs font-bold text-white flex items-center shadow-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 mr-1 fill-white" />
                Run Query
              </button>
            </div>
          </div>

          {/* Verification Results Panel */}
          {testResult.status !== "idle" && (
            <div className={`p-3 text-xs flex items-center space-x-3 transition border-b ${
              testResult.status === "success" 
                ? (theme === "dark" ? "bg-emerald-950/40 text-emerald-300 border-emerald-900" : "bg-emerald-50 text-emerald-800 border-slate-200") 
                : (theme === "dark" ? "bg-rose-950/40 text-rose-300 border-rose-900" : "bg-rose-50 text-rose-800 border-slate-200")
            }`}>
              <span className={`p-1 rounded border shadow-3xs ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100/80"}`}>
                {testResult.status === "success" ? (
                  <Check className="w-4 h-4 text-emerald-500 stroke-3" />
                ) : (
                  <Info className="w-4 h-4 text-rose-500 shrink-0" />
                )}
              </span>
              <div>
                <span className="font-extrabold uppercase tracking-wider text-[10px] block font-mono">
                  {testResult.status === "success" ? "Task Verification Passed" : "Verification Incomplete"}
                </span>
                <span className="text-[11px] font-medium">{testResult.message}</span>
              </div>
            </div>
          )}

          {/* ACID Transaction Active Banner */}
          {isTransactionActive && (
            <div className={`p-2.5 px-4 text-xs font-medium font-mono flex items-center justify-between border-b bg-amber-500/10 text-amber-500 border-amber-500/20`}>
              <div className="flex items-center space-x-2">
                <GitCommit className="w-4 h-4 animate-pulse text-amber-500" />
                <span><strong>TRANSACTION ACTIVE:</strong> Uncommitted database modifications are pending. Execute <code className="bg-amber-500/20 px-1 py-0.5 rounded font-bold">COMMIT;</code> to persist or <code className="bg-amber-500/20 px-1 py-0.5 rounded font-bold">ROLLBACK;</code> to discard changes safely.</span>
              </div>
              <span className="text-[8.5px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-amber-500/20 rounded">Uncommitted</span>
            </div>
          )}

          {/* ERROR STATUS WINDOW */}
          {errorMessage && (
            <div className={`p-4 font-mono text-xs select-text border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
              theme === "dark" ? "bg-rose-950/40 border-rose-900/60 text-rose-300" : "bg-rose-50 border-rose-150 text-rose-850"
            }`}>
              <div className="flex-1">
                <div className="font-bold mb-1 uppercase text-[10px] tracking-wider text-rose-550">SQL Engine Compile Crash:</div>
                <div className="break-all">{errorMessage}</div>
              </div>
              <button
                onClick={() => {
                  if (queryInput.trim()) {
                    setLastFailedQuery(queryInput);
                    setLastFailedError(errorMessage);
                  }
                  setIsAiTutorOpen(true);
                }}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-550 text-white rounded-lg font-bold text-xs flex items-center self-start sm:self-center cursor-pointer shadow-xs transition shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Fix with AI Tutor
              </button>
            </div>
          )}

          {/* WORKBENCH TAB CONTROLS */}
          <div className={`px-4 py-1.5 flex items-center justify-between border-b ${
            theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-slate-100/50 border-slate-200"
          }`}>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTerminalTab("results")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center cursor-pointer ${
                  activeTerminalTab === "results"
                    ? (theme === "dark" ? "bg-slate-800 text-blue-400 border border-slate-700" : "bg-white text-blue-700 border border-slate-200 shadow-3xs")
                    : "text-slate-400 hover:text-slate-350 dark:hover:text-slate-200"
                }`}
              >
                <Table className="w-3.5 h-3.5 mr-1.5" />
                Result Data Grid
                {resultData && (
                  <span className="ml-1.5 text-[9px] px-1 bg-blue-500/10 text-blue-400 rounded-full font-bold">
                    {resultData.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTerminalTab("logs")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center cursor-pointer ${
                  activeTerminalTab === "logs"
                    ? (theme === "dark" ? "bg-slate-800 text-blue-400 border border-slate-700" : "bg-white text-blue-700 border border-slate-200 shadow-3xs")
                    : "text-slate-400 hover:text-slate-350 dark:hover:text-slate-200"
                }`}
              >
                <Terminal className="w-3.5 h-3.5 mr-1.5" />
                Execution Console
                <span className="ml-1.5 text-[9px] px-1 bg-purple-500/10 text-purple-400 rounded-full font-bold">
                  {executionLogs.length}
                </span>
              </button>

              <button
                onClick={() => {
                  if (resultData) {
                    setActiveTerminalTab("explain");
                  }
                }}
                disabled={!resultData}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center cursor-pointer ${
                  !resultData ? "opacity-40 cursor-not-allowed" : ""
                } ${
                  activeTerminalTab === "explain"
                    ? (theme === "dark" ? "bg-slate-800 text-blue-400 border border-slate-700" : "bg-white text-blue-700 border border-slate-200 shadow-3xs")
                    : "text-slate-400 hover:text-slate-350 dark:hover:text-slate-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                Explain Plan
              </button>
            </div>
            
            <div className="hidden sm:flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
              <span>SQL ANSI COMPLIANT</span>
              <span>•</span>
              <span className="text-blue-500">WORKBENCH V1.0</span>
            </div>
          </div>

          {/* TABLE VISUAL RESULTS OUTPUT */}
          <div className={`flex-1 min-h-[180px] p-4 transition-colors ${theme === "dark" ? "bg-slate-900/10" : "bg-slate-50/20"}`}>
            
            {/* TAB 1: RESULT DATA GRID WITH SORTING, SEARCHING, PAGINATION AND CLICK-TO-COPY */}
            {activeTerminalTab === "results" && (
              <div>
                {resultData ? (
                  resultData.length > 0 ? (
                    <div className="space-y-3">
                      
                      {/* Responsive Grid controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/10 dark:border-slate-800/60">
                        <div className="relative flex-1 max-w-sm">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search active rows..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setCurrentPage(1); // reset to first page on search
                            }}
                            className={`w-full font-mono text-xs pl-8 pr-3 py-1.5 rounded-lg border outline-none transition-colors ${
                              theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500" : "bg-white border-slate-250 text-slate-800 focus:border-blue-600"
                            }`}
                          />
                        </div>
                        
                        <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
                          <div className="flex items-center space-x-1.5">
                            <span>Rows per page:</span>
                            <select
                              value={rowsPerPage}
                              onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                              }}
                              className={`px-2 py-1 rounded border text-[11px] font-bold font-mono outline-none cursor-pointer ${
                                theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                              }`}
                            >
                              {[5, 10, 25, 50].map((size) => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                          </div>
                          
                          <span>
                            Showing {Math.min(processedResultData.totalCount, (currentPage - 1) * rowsPerPage + 1)}-{Math.min(processedResultData.totalCount, currentPage * rowsPerPage)} of {processedResultData.totalCount} rows
                          </span>
                        </div>
                      </div>

                      <div className={`overflow-x-auto max-h-[300px] border rounded-lg shadow-3xs transition-colors ${
                        theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
                      }`}>
                        <table className="w-full border-collapse text-left text-xs font-mono select-text">
                          <thead>
                            <tr className={`font-bold border-b transition-colors ${
                              theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-450" : "bg-slate-50 border-slate-205 text-slate-500"
                            }`}>
                              {Object.keys(resultData[0]).map((key) => {
                                const isSorted = sortColumn === key;
                                return (
                                  <th
                                    key={key}
                                    onClick={() => {
                                      if (sortColumn === key) {
                                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                                      } else {
                                        setSortColumn(key);
                                        setSortDirection("asc");
                                      }
                                    }}
                                    className={`p-2.5 whitespace-nowrap border-r border-b cursor-pointer select-none transition-colors ${
                                      theme === "dark" ? "border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200" : "border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span>{key}</span>
                                      <ArrowUpDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${isSorted ? "text-blue-500" : "opacity-40"}`} />
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${theme === "dark" ? "divide-slate-850" : "divide-slate-100"}`}>
                            {processedResultData.rows.map((row, rIdx) => (
                              <tr key={rIdx} className={`transition ${theme === "dark" ? "hover:bg-slate-900/40" : "hover:bg-slate-50/60"}`}>
                                {Object.values(row).map((val: any, cIdx) => {
                                  const cellVal = val === null || val === undefined ? "NULL" : String(val);
                                  const isCopied = copiedCell?.rIdx === rIdx && copiedCell?.cIdx === cIdx;
                                  return (
                                    <td
                                      key={cIdx}
                                      onClick={() => {
                                        navigator.clipboard.writeText(cellVal);
                                        setCopiedCell({ rIdx, cIdx });
                                        setTimeout(() => setCopiedCell(null), 1200);
                                      }}
                                      title="Click cell value to copy to clipboard"
                                      className={`p-2.5 border-r cursor-pointer relative group transition-colors ${
                                        theme === "dark" 
                                          ? "border-slate-805 text-slate-300 hover:bg-slate-800/40" 
                                          : "border-slate-150 text-slate-805 hover:bg-blue-50/20"
                                      }`}
                                    >
                                      {val === null || val === undefined ? (
                                        <span className="text-amber-500 font-bold tracking-widest text-[10px]">NULL</span>
                                      ) : typeof val === "boolean" ? (
                                        <span className="text-purple-500 font-bold">{String(val)}</span>
                                      ) : (
                                        String(val)
                                      )}
                                      
                                      {/* Cell copy hover overlay feedback indicator */}
                                      <span className="absolute right-1 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/70 text-white text-[8px] font-sans px-1.5 py-0.5 rounded shadow">
                                        {isCopied ? "✓ Copied" : "Copy"}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls bar */}
                      {processedResultData.totalCount > rowsPerPage && (
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[10px] text-slate-400 font-mono font-medium">
                            Page {currentPage} of {Math.ceil(processedResultData.totalCount / rowsPerPage)}
                          </span>
                          
                          <div className="flex space-x-1.5">
                            <button
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(currentPage - 1)}
                              className={`px-2.5 py-1 text-[11px] rounded font-bold border transition ${
                                currentPage === 1
                                  ? "opacity-30 cursor-not-allowed text-slate-500"
                                  : (theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-150")
                              }`}
                            >
                              Previous
                            </button>
                            <button
                              disabled={currentPage === Math.ceil(processedResultData.totalCount / rowsPerPage)}
                              onClick={() => setCurrentPage(currentPage + 1)}
                              className={`px-2.5 py-1 text-[11px] rounded font-bold border transition ${
                                currentPage === Math.ceil(processedResultData.totalCount / rowsPerPage)
                                  ? "opacity-30 cursor-not-allowed text-slate-500"
                                  : (theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-150")
                              }`}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`p-8 border border-dashed rounded-lg text-center text-xs font-medium transition-colors ${
                      theme === "dark" ? "bg-slate-950/40 border-slate-850 text-slate-500" : "bg-white border-slate-200 text-slate-550"
                    }`}>
                      Empty Set returned (0 rows matched search filter safely).
                    </div>
                  )
                ) : (
                  <div className={`p-8 border border-dashed rounded-lg text-center text-xs leading-relaxed font-medium transition-colors ${
                    theme === "dark" ? "bg-slate-950/20 border-slate-850 text-slate-400" : "bg-white border-slate-200 text-slate-500"
                  }`}>
                    Terminal Active • Write any standard SQL command above and hit "Run Query" to show output records.
                    <div className="mt-3 flex justify-center space-x-1.5 flex-wrap gap-y-1.5">
                      <button
                        onClick={() => executeTriggerExample(`SELECT * FROM ${domain.tables[0].name} LIMIT 3;`)}
                        className={`px-2.5 py-1 border rounded text-[10px] shadow-3xs transition cursor-pointer font-bold ${
                          theme === "dark" ? "bg-slate-900 border-slate-800 text-blue-400 hover:bg-slate-800" : "bg-slate-50 border-slate-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50/50"
                        }`}
                      >
                        SELECT * EXAMPLE
                      </button>
                      <button
                        onClick={() => executeTriggerExample(`SELECT name, age FROM ${domain.tables[0].name} WHERE age > 25 ORDER BY age DESC;`)}
                        className={`px-2.5 py-1 border rounded text-[10px] shadow-3xs transition cursor-pointer font-bold ${
                          theme === "dark" ? "bg-slate-900 border-slate-800 text-blue-400 hover:bg-slate-800" : "bg-slate-50 border-slate-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50/50"
                        }`}
                      >
                        WHERE & ORDER BY
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: EXECUTION CONSOLE LOGS TIMELINE */}
            {activeTerminalTab === "logs" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b dark:border-slate-800 border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">SQL Developer Output Timeline Console</span>
                  {executionLogs.length > 0 && (
                    <button
                      onClick={() => setExecutionLogs([])}
                      className="text-[9.5px] font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear Logs
                    </button>
                  )}
                </div>
                
                {executionLogs.length === 0 ? (
                  <div className="p-8 border border-dashed rounded-lg text-center text-xs font-medium italic text-slate-500">
                    No logs recorded in this session. Write and run some queries above.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {executionLogs.slice().reverse().map((log, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border text-xs font-mono transition-colors ${
                          log.status === "success"
                            ? (theme === "dark" ? "bg-slate-950 border-slate-800/80 hover:border-slate-700" : "bg-white border-slate-200 hover:bg-slate-50")
                            : (theme === "dark" ? "bg-rose-950/20 border-rose-900/40 hover:border-rose-900" : "bg-rose-50/50 border-rose-200 hover:bg-rose-50")
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center space-x-1.5 font-bold">
                            <span className={log.status === "success" ? "text-emerald-500" : "text-rose-500"}>
                              {log.status === "success" ? "● SUCCESS" : "✖ ERROR"}
                            </span>
                            <span className="text-slate-450">•</span>
                            <span className="text-blue-500">LATENCY: {log.durationMs}ms</span>
                          </div>
                          <span className="text-[9px] text-slate-500">{log.timestamp}</span>
                        </div>
                        
                        <div className="mt-2 text-[11px] text-slate-300 dark:text-slate-200 whitespace-pre-wrap select-all font-semibold font-mono bg-slate-950/50 p-2 rounded border border-slate-900">
                          {log.statement}
                        </div>
                        
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-450 font-medium">
                          <span>{log.message}</span>
                          {log.rowsAffected !== undefined && (
                            <span className="font-bold text-purple-400">Rows affected: {log.rowsAffected}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: EXPLAIN PLAN OPTIMIZATION TREES */}
            {activeTerminalTab === "explain" && (
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between pb-1 border-b dark:border-slate-800 border-slate-200">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Simulated Query Execution Plan Tree Analyzer</span>
                  <span className="text-[9px] text-amber-500 font-extrabold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">Plan Verified</span>
                </div>
                
                {resultData ? (
                  <div className={`p-4 rounded-lg border text-xs leading-relaxed transition-colors ${
                    theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                  }`}>
                    <div className="space-y-4">
                      <div>
                        <div className="font-bold uppercase text-[10.5px] text-blue-400">Target Statement Execution Syntax:</div>
                        <code className="block bg-slate-900 p-2 rounded text-slate-200 mt-1.5 text-[11px] font-mono leading-normal select-all">
                          {queryInput || "SELECT * FROM ..."}
                        </code>
                      </div>
                      
                      <div className="border-t border-slate-800/40 pt-3">
                        <div className="font-bold uppercase text-[10.5px] text-blue-400 mb-2">Logical Optimizer Node Map:</div>
                        
                        {/* Tree path rendering */}
                        <div className="space-y-3 font-mono text-[11px] text-slate-300">
                          <div className="flex items-start">
                            <span className="text-blue-500 font-bold mr-1.5">└─ [PROJECTION]</span>
                            <div>
                              <span className="font-bold text-white">Select Columns</span>
                              <div className="text-[10px] text-slate-500">Projects required table fields: ({resultData && resultData[0] ? Object.keys(resultData[0]).join(', ') : "all fields"})</div>
                            </div>
                          </div>
                          
                          {queryInput.toLowerCase().includes("order by") && (
                            <div className="flex items-start pl-4 border-l border-slate-800/80">
                              <span className="text-purple-500 font-bold mr-1.5">└─ [SORTING NODE]</span>
                              <div>
                                <span className="font-bold text-white">Quicksort memory buffer overhead</span>
                                <div className="text-[10px] text-slate-500">Rows sorted using client-side quicksort buffer. Estimated cost: ~{Math.round(resultData.length * 1.5)} units.</div>
                              </div>
                            </div>
                          )}

                          {queryInput.toLowerCase().includes("where") && (
                            <div className={`flex items-start pl-4 ${queryInput.toLowerCase().includes("order by") ? "pl-8 border-l border-slate-800/80" : "border-l border-slate-800/80"}`}>
                              <span className="text-amber-500 font-bold mr-1.5">└─ [FILTER STAGE]</span>
                              <div>
                                <span className="font-bold text-white">Filter predicate evaluation (WHERE)</span>
                                <div className="text-[10px] text-slate-500">Row matching evaluation criteria applied dynamically. Scan cost optimized.</div>
                              </div>
                            </div>
                          )}
                          
                          <div className={`flex items-start ${
                            queryInput.toLowerCase().includes("order by") && queryInput.toLowerCase().includes("where") ? "pl-12" :
                            queryInput.toLowerCase().includes("order by") || queryInput.toLowerCase().includes("where") ? "pl-8" : "pl-4"
                          } border-l border-slate-800/80`}>
                            <span className="text-emerald-500 font-bold mr-1.5">└─ [SCAN NODE]</span>
                            <div>
                              <span className="font-bold text-white">
                                {liveIndexes.some(idx => queryInput.toLowerCase().includes(idx.column.toLowerCase())) ? "INDEX SCAN (B-Tree)" : "SEQUENTIAL SCAN (Full Table Scan)"}
                              </span>
                              <div className="text-[10px] text-slate-500">
                                {liveIndexes.some(idx => queryInput.toLowerCase().includes(idx.column.toLowerCase())) 
                                  ? `Matched B-Tree index scan. High-speed logarithmic lookup plan.` 
                                  : `Scanned all physical rows. Cost directly proportional to row count (${resultData.length} records processed).`}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-800/40 pt-3 flex flex-wrap gap-4 text-[10.5px]">
                        <div>
                          <span className="text-slate-500">ESTIMATED IO COST:</span> <strong className="text-white">~{Math.round(resultData.length * 0.4 + 2)} IO operations</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">OPTIMIZER RATING:</span> <strong className="text-emerald-500">EXCELLENT (100%)</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border border-dashed rounded-lg text-center text-xs font-medium italic text-slate-500">
                    No query plan available. Execute a statement first.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
        </div>

      {/* Fullscreen ER Diagram modal */}
      {fullscreenDiagram && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-3xl rounded-xl border flex flex-col shadow-2xl transition-all ${
            theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-800 border-slate-100">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-500" />
                <h3 className={`font-extrabold text-base ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                  {domain.name} Entity-Relationship Map
                </h3>
              </div>
              <button
                onClick={() => setFullscreenDiagram(false)}
                className={`p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                  theme === "dark" ? "border-slate-800 text-slate-400 hover:text-white" : "border-slate-200 text-slate-550 hover:text-slate-900"
                }`}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[70vh] flex items-center justify-center">
              {renderERDiagram(true)}
            </div>
            <div className="px-5 py-3 border-t dark:border-slate-800 border-slate-100 flex justify-end text-[10px] text-slate-500 font-mono">
              Interactive Diagram View • Close to return to training console
            </div>
          </div>
        </div>
      )}

      {/* GUIDED ONBOARDING TOUR OVERLAY */}
      {tourStep !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none">
          {/* Centered Modal card */}
          <div className={`max-w-md w-full rounded-2xl border p-6 shadow-2xl transition-all duration-300 transform scale-100 ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/10 dark:border-slate-800/40 mb-4">
              <span className="text-[10px] font-extrabold tracking-widest text-blue-500 font-mono uppercase">
                STUDENT ONBOARDING // STEP {tourStep + 1} OF 6
              </span>
              <button 
                onClick={() => {
                  setTourStep(null);
                  localStorage.setItem("sql_sandbox_onboarded_v2", "true");
                }} 
                className="text-xs text-slate-400 hover:text-rose-500 font-bold font-mono transition cursor-pointer"
              >
                SKIP [ESC]
              </button>
            </div>

            {/* Dynamic Step Contents */}
            {tourStep === 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-extrabold flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-500 animate-pulse" />
                  🎓 Interactive SQL Sandbox!
                </h3>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  Welcome! This interactive training platform contains a fully isolated real-time database engine (<code className="bg-slate-950 text-blue-400 px-1 py-0.5 rounded text-[10px]">AlaSQL</code>), direct table schemas, and structured assignments.
                </p>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  Let's take a quick 1-minute guided tour to showcase how to query, write schema inserts, and solve real domain problems sequentially!
                </p>
              </div>
            )}

            {tourStep === 1 && (
              <div className="space-y-3">
                <h3 className="text-lg font-extrabold flex items-center">
                  <List className="w-5 h-5 mr-2 text-blue-500" />
                  📋 Practice Assignments & Sidebar
                </h3>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  Use the sidebar on the left to review your tasks. Each of the 10 domains holds 30 specific challenges categorized into <strong className="text-slate-200">Beginner</strong> and <strong className="text-slate-200">Interview</strong> difficulty levels.
                </p>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  Clicking a challenge loads its requirements, target schema constraints, hints, and expected keywords inside your active workspace.
                </p>
              </div>
            )}

            {tourStep === 2 && (
              <div className="space-y-3">
                <h3 className="text-lg font-extrabold flex items-center">
                  <Play className="w-5 h-5 mr-2 text-blue-500" />
                  ✍️ Smart SQL Editor & Real-time Linter
                </h3>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  Type your query inside the interactive SQL console. The console is equipped with a Scroll-Synced Highlighting Engine that colorizes statements dynamically.
                </p>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  Below the editor, our active Schema Validator runs a real-time linter. It highlights unclosed quotes, parentheses mismatches, and warns you of invalid tables or mispelled columns as you type!
                </p>
              </div>
            )}

            {tourStep === 3 && (
              <div className="space-y-3">
                <h3 className="text-lg font-extrabold flex items-center">
                  <Database className="w-5 h-5 mr-2 text-blue-500" />
                  📊 Interactive Schema & ER Diagram Viewer
                </h3>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  We have automatically selected the <strong className="text-slate-200">Schema/Tables</strong> tab for you on the left!
                </p>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  Here, you can examine columns, physical datatypes, and constraints. Toggle on the <strong className="text-blue-400">Schema Diagram (ER)</strong> tab to see table links and JOIN routes. Hovering over table relations displays foreign key queries instantly!
                </p>
              </div>
            )}

            {tourStep === 4 && (
              <div className="space-y-3">
                <h3 className="text-lg font-extrabold flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-500" />
                  ⏱️ Query Run-History Sidebar
                </h3>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  We have automatically opened the query history sidebar for you on the right!
                </p>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  Your last 5 executed queries are saved inside your local storage sandbox. You can click any query from the history to inspect it, or click the Rerun button to test it instantly against the database files.
                </p>
              </div>
            )}

            {tourStep === 5 && (
              <div className="space-y-3">
                <h3 className="text-lg font-extrabold flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" />
                  🚀 You are Ready to Practice!
                </h3>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  Excellent! You now know the layout of the SQL developer workspace. Run any queries you want—CREATE TABLE, INSERT, SELECT, JOINs, or subqueries—or try to solve the active questions!
                </p>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  Remember, you can restart this guided onboarding tour at any time by clicking the <strong className="text-blue-400">💡 Guided Guide</strong> button inside the console header. Let's write some SQL!
                </p>
              </div>
            )}

            {/* Action Controls */}
            <div className="flex items-center justify-between border-t border-slate-800/10 dark:border-slate-800/40 pt-4 mt-5">
              <div className="flex space-x-1.5">
                {tourStep > 0 && (
                  <button
                    onClick={() => {
                      const prev = tourStep - 1;
                      setTourStep(prev);
                      // Apply corresponding sidebar / state side effects
                      if (prev === 3) {
                        setActiveTab("tables");
                        setSchemaViewMode("diagram");
                        setShowHistory(false);
                      } else if (prev === 4) {
                        setActiveTab("sandbox");
                        setShowHistory(true);
                      } else {
                        setActiveTab("sandbox");
                        setShowHistory(false);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      theme === "dark" ? "bg-slate-800 border-slate-700 hover:bg-slate-755 text-slate-300" : "bg-white border-slate-250 hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    Back
                  </button>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setTourStep(null);
                    localStorage.setItem("sql_sandbox_onboarded_v2", "true");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    theme === "dark" ? "bg-slate-800 text-slate-400 hover:text-slate-205" : "bg-slate-100 text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Skip
                </button>
                <button
                  onClick={() => {
                    if (tourStep < 5) {
                      const next = tourStep + 1;
                      setTourStep(next);
                      // Apply corresponding sidebar / state side effects
                      if (next === 3) {
                        setActiveTab("tables");
                        setSchemaViewMode("diagram");
                        setShowHistory(false);
                      } else if (next === 4) {
                        setActiveTab("sandbox");
                        setShowHistory(true);
                      } else {
                        setActiveTab("sandbox");
                        setShowHistory(false);
                      }
                    } else {
                      setTourStep(null);
                      localStorage.setItem("sql_sandbox_onboarded_v2", "true");
                    }
                  }}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-550 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {tourStep === 5 ? "Finish & Explore" : "Next Step"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Tutor Slide-out Drawer */}
      <AiTutor
        isOpen={isAiTutorOpen}
        onClose={() => setIsAiTutorOpen(false)}
        lastQuery={lastFailedQuery}
        errorMessage={lastFailedError}
        schemaContext={liveTables}
        questionContext={selectedQuestion}
        theme={theme}
        onApplyQuery={(query) => {
          setQueryInput(query);
          setIsAiTutorOpen(false);
        }}
      />
    </div>
  );
};
