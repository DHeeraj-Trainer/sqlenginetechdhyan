import type { Challenge, Difficulty, DomainDef, InterviewRound, TopicId } from "./types";
import { DOMAINS } from "./domains";
import { COMPANIES } from "./companies";

/**
 * Programmatic challenge generator. Each template describes a canonical SQL
 * pattern (SELECT, filter, aggregate, join, window, CTE, …). The generator
 * instantiates every template for every domain, producing a large but
 * deterministic library of professional-shape challenges.
 *
 * Trade-off: templates are portable ANSI SQL against domain schemas described
 * in the problem body — solutions won't run in the workbench unless a matching
 * schema is loaded. The catalog is designed for reading, learning, and
 * interview prep, not necessarily for one-click execution across all rows.
 */

interface Template {
  key: string;
  topic: TopicId;
  difficulty: Difficulty;
  xp: number;
  minutes: number;
  concepts: string[];
  tags: string[];
  complexity: string;
  title: (d: DomainDef) => string;
  problem: (d: DomainDef) => string;
  expected: (d: DomainDef) => string;
  solution: (d: DomainDef) => string;
  alt?: (d: DomainDef) => string;
  hint1: (d: DomainDef) => string;
  hint2: (d: DomainDef) => string;
  explain: (d: DomainDef) => string;
  learned: string[];
  related?: TopicId[];
}

const T = (t: Template) => t;

const TEMPLATES: Template[] = [
  // ─────────── Beginner ───────────
  T({
    key: "list-all",
    topic: "select-basics",
    difficulty: "Beginner",
    xp: 10,
    minutes: 3,
    concepts: ["SELECT", "FROM"],
    tags: ["basics"],
    complexity: "O(n)",
    title: (d) => `List all ${d.entity.label}s`,
    problem: (d) => `Return every column and every row from the ${d.entity.name} table.`,
    expected: (d) => `All ${d.entity.label} rows with all columns.`,
    solution: (d) => `SELECT * FROM ${d.entity.name};`,
    hint1: () => "Use SELECT * to project every column.",
    hint2: () => "FROM specifies which table to read.",
    explain: () => "SELECT * returns every column of the source table without a WHERE filter.",
    learned: ["SELECT", "FROM", "Projection"],
  }),
  T({
    key: "project-cols",
    topic: "select-basics",
    difficulty: "Beginner",
    xp: 10,
    minutes: 3,
    concepts: ["column list"],
    tags: ["basics", "projection"],
    complexity: "O(n)",
    title: (d) => `${cap(d.entity.textCol)} directory`,
    problem: (d) => `Return only ${d.entity.textCol} and ${d.entity.regionCol} from ${d.entity.name}.`,
    expected: (d) => `Two columns: ${d.entity.textCol}, ${d.entity.regionCol}.`,
    solution: (d) => `SELECT ${d.entity.textCol}, ${d.entity.regionCol} FROM ${d.entity.name};`,
    hint1: () => "List the columns you need after SELECT, separated by commas.",
    hint2: () => "Explicit column projection is preferred over SELECT *.",
    explain: () => "Explicit column lists reduce data movement and clarify intent.",
    learned: ["Column projection"],
  }),
  T({
    key: "where-eq",
    topic: "where-filtering",
    difficulty: "Beginner",
    xp: 12,
    minutes: 4,
    concepts: ["WHERE", "equality"],
    tags: ["filter"],
    complexity: "O(n)",
    title: (d) => `${d.entity.label}s in a specific ${d.entity.regionCol}`,
    problem: (d) =>
      `Return every ${d.entity.label} whose ${d.entity.regionCol} equals a value the reviewer provides. Use 'X' as the placeholder.`,
    expected: (d) => `${d.entity.label}s where ${d.entity.regionCol} = 'X'.`,
    solution: (d) => `SELECT * FROM ${d.entity.name} WHERE ${d.entity.regionCol} = 'X';`,
    hint1: () => "Use a WHERE clause with an equality predicate.",
    hint2: () => "String literals go in single quotes.",
    explain: () => "WHERE runs before SELECT projection and filters rows against a predicate.",
    learned: ["WHERE", "Filter predicates"],
  }),
  T({
    key: "order-by",
    topic: "order-by",
    difficulty: "Beginner",
    xp: 12,
    minutes: 4,
    concepts: ["ORDER BY", "DESC"],
    tags: ["sort"],
    complexity: "O(n log n)",
    title: (d) => `Most expensive ${d.item.label}s first`,
    problem: (d) => `Return all ${d.item.name} sorted by ${d.item.priceCol} in descending order.`,
    expected: (d) => `${d.item.label} rows sorted by ${d.item.priceCol} DESC.`,
    solution: (d) => `SELECT * FROM ${d.item.name} ORDER BY ${d.item.priceCol} DESC;`,
    hint1: () => "ORDER BY controls output order.",
    hint2: () => "Append DESC to reverse the default ascending order.",
    explain: () => "ORDER BY runs after SELECT and sorts the result set.",
    learned: ["ORDER BY", "Sort direction"],
  }),
  T({
    key: "limit-top",
    topic: "limit-offset",
    difficulty: "Beginner",
    xp: 12,
    minutes: 4,
    concepts: ["LIMIT"],
    tags: ["top-n"],
    complexity: "O(n log n)",
    title: (d) => `Top 5 most expensive ${d.item.label}s`,
    problem: (d) => `Return the top 5 ${d.item.name} rows by ${d.item.priceCol}, highest first.`,
    expected: (d) => `Exactly 5 rows.`,
    solution: (d) => `SELECT * FROM ${d.item.name} ORDER BY ${d.item.priceCol} DESC LIMIT 5;`,
    hint1: () => "Sort first, then LIMIT.",
    hint2: () => "LIMIT N caps the number of returned rows.",
    explain: () => "ORDER BY + LIMIT is the canonical top-N pattern.",
    learned: ["LIMIT", "Top-N"],
    related: ["order-by"],
  }),
  T({
    key: "distinct",
    topic: "distinct",
    difficulty: "Beginner",
    xp: 10,
    minutes: 3,
    concepts: ["DISTINCT"],
    tags: ["dedupe"],
    complexity: "O(n)",
    title: (d) => `Distinct ${d.item.categoryCol}s`,
    problem: (d) => `List every unique ${d.item.categoryCol} in the ${d.item.name} table.`,
    expected: (d) => `One row per unique ${d.item.categoryCol}.`,
    solution: (d) => `SELECT DISTINCT ${d.item.categoryCol} FROM ${d.item.name};`,
    hint1: () => "DISTINCT removes duplicate rows.",
    hint2: () => "Apply DISTINCT immediately after SELECT.",
    explain: () => "DISTINCT deduplicates on the entire projected row.",
    learned: ["DISTINCT"],
  }),
  T({
    key: "count",
    topic: "aggregate-functions",
    difficulty: "Beginner",
    xp: 12,
    minutes: 4,
    concepts: ["COUNT"],
    tags: ["aggregate"],
    complexity: "O(n)",
    title: (d) => `Total number of ${d.event.label}s`,
    problem: (d) => `Return the total row count of ${d.event.name}.`,
    expected: () => `A single row with one integer column.`,
    solution: (d) => `SELECT COUNT(*) AS total FROM ${d.event.name};`,
    hint1: () => "COUNT(*) counts rows.",
    hint2: () => "Alias with AS for a readable column name.",
    explain: () => "COUNT(*) counts all rows, regardless of NULLs.",
    learned: ["COUNT", "Aliasing"],
  }),
  T({
    key: "sum-avg",
    topic: "aggregate-functions",
    difficulty: "Beginner",
    xp: 14,
    minutes: 5,
    concepts: ["SUM", "AVG"],
    tags: ["aggregate"],
    complexity: "O(n)",
    title: (d) => `Total and average ${d.event.amountCol}`,
    problem: (d) => `Compute the sum and average of ${d.event.amountCol} across all ${d.event.name}.`,
    expected: () => `One row with two numeric columns: total and average.`,
    solution: (d) =>
      `SELECT SUM(${d.event.amountCol}) AS total, AVG(${d.event.amountCol}) AS avg_amount FROM ${d.event.name};`,
    hint1: () => "SUM and AVG are aggregate functions.",
    hint2: () => "Both aggregates can appear in the same SELECT.",
    explain: () => "Aggregates collapse many rows to a single value; AVG ignores NULLs.",
    learned: ["SUM", "AVG"],
  }),
  T({
    key: "like",
    topic: "string-functions",
    difficulty: "Beginner",
    xp: 12,
    minutes: 5,
    concepts: ["LIKE", "wildcards"],
    tags: ["string"],
    complexity: "O(n)",
    title: (d) => `${cap(d.entity.label)}s whose ${d.entity.textCol} starts with 'A'`,
    problem: (d) => `Return ${d.entity.name} rows where ${d.entity.textCol} starts with the letter A.`,
    expected: () => `Filtered rows only.`,
    solution: (d) => `SELECT * FROM ${d.entity.name} WHERE ${d.entity.textCol} LIKE 'A%';`,
    hint1: () => "% matches any sequence of characters in LIKE.",
    hint2: () => "_ matches a single character in LIKE.",
    explain: () => "LIKE with % and _ wildcards is portable across engines.",
    learned: ["LIKE", "Wildcards"],
  }),
  T({
    key: "null-check",
    topic: "null-handling",
    difficulty: "Beginner",
    xp: 12,
    minutes: 4,
    concepts: ["IS NULL", "COALESCE"],
    tags: ["null"],
    complexity: "O(n)",
    title: (d) => `${cap(d.event.label)}s missing ${d.event.amountCol}`,
    problem: (d) => `Find all ${d.event.name} rows where ${d.event.amountCol} is NULL.`,
    expected: () => `Rows with NULL in the target column.`,
    solution: (d) => `SELECT * FROM ${d.event.name} WHERE ${d.event.amountCol} IS NULL;`,
    hint1: () => "Never use = NULL — use IS NULL.",
    hint2: () => "COALESCE returns the first non-NULL argument if you need a default.",
    explain: () => "NULL is not equal to anything, not even itself; use IS NULL/IS NOT NULL.",
    learned: ["IS NULL"],
  }),

  // ─────────── Intermediate ───────────
  T({
    key: "group-by",
    topic: "group-by",
    difficulty: "Intermediate",
    xp: 18,
    minutes: 6,
    concepts: ["GROUP BY", "COUNT"],
    tags: ["group"],
    complexity: "O(n)",
    title: (d) => `${cap(d.event.label)} count per ${d.item.categoryCol}`,
    problem: (d) =>
      `For each ${d.item.categoryCol} in ${d.item.name}, count the number of ${d.event.name} referring to it.`,
    expected: (d) => `One row per ${d.item.categoryCol} with a count column.`,
    solution: (d) => `SELECT i.${d.item.categoryCol}, COUNT(*) AS ${d.event.label}_count
FROM ${d.event.name} e JOIN ${d.item.name} i ON e.${d.event.itemFk} = i.${d.item.name.replace(/s$/, "") + "_id"}
GROUP BY i.${d.item.categoryCol};`,
    hint1: () => "Aggregate with GROUP BY to bucket rows by a column.",
    hint2: () => "Non-aggregated columns in SELECT must appear in GROUP BY.",
    explain: () => "GROUP BY partitions rows into buckets and applies aggregates per bucket.",
    learned: ["GROUP BY"],
    related: ["aggregate-functions", "inner-join"],
  }),
  T({
    key: "having",
    topic: "having",
    difficulty: "Intermediate",
    xp: 20,
    minutes: 7,
    concepts: ["HAVING"],
    tags: ["group", "filter"],
    complexity: "O(n)",
    title: (d) => `${cap(d.entity.label)}s with more than 3 ${d.event.label}s`,
    problem: (d) => `List every ${d.entity.label} that has more than 3 rows in ${d.event.name}.`,
    expected: (d) => `${d.entity.label} identifiers and their ${d.event.label} counts, count > 3.`,
    solution: (d) => `SELECT ${d.event.entityFk}, COUNT(*) AS cnt
FROM ${d.event.name}
GROUP BY ${d.event.entityFk}
HAVING COUNT(*) > 3;`,
    hint1: () => "WHERE filters rows; HAVING filters groups.",
    hint2: () => "You can reference aggregates only in HAVING (or SELECT), not WHERE.",
    explain: () => "HAVING runs after GROUP BY and filters aggregated groups.",
    learned: ["HAVING", "Group filtering"],
    related: ["group-by"],
  }),
  T({
    key: "case-when",
    topic: "case-when",
    difficulty: "Intermediate",
    xp: 18,
    minutes: 6,
    concepts: ["CASE WHEN"],
    tags: ["logic"],
    complexity: "O(n)",
    title: (d) => `Bucket ${d.item.label}s by ${d.item.priceCol}`,
    problem: (d) =>
      `Return each ${d.item.label} with a tier: 'Low' if ${d.item.priceCol} < 50, 'Mid' if < 200, else 'High'.`,
    expected: (d) => `${d.item.label} rows plus a 'tier' column.`,
    solution: (d) => `SELECT *,
  CASE
    WHEN ${d.item.priceCol} < 50 THEN 'Low'
    WHEN ${d.item.priceCol} < 200 THEN 'Mid'
    ELSE 'High'
  END AS tier
FROM ${d.item.name};`,
    hint1: () => "CASE WHEN … THEN … [ELSE …] END returns a value per row.",
    hint2: () => "Order of WHEN clauses matters — the first match wins.",
    explain: () => "CASE is a portable conditional expression usable anywhere a value is expected.",
    learned: ["CASE WHEN"],
  }),
  T({
    key: "inner-join",
    topic: "inner-join",
    difficulty: "Intermediate",
    xp: 20,
    minutes: 7,
    concepts: ["INNER JOIN"],
    tags: ["join"],
    complexity: "O(n log n)",
    title: (d) => `${cap(d.event.label)}s with ${d.entity.label} names`,
    problem: (d) =>
      `Return every ${d.event.label} joined with its ${d.entity.label} so the result shows ${d.entity.textCol} beside every ${d.event.label}.`,
    expected: () => `Rows containing columns from both tables.`,
    solution: (d) => `SELECT e.*, u.${d.entity.textCol}
FROM ${d.event.name} e
JOIN ${d.entity.name} u ON e.${d.event.entityFk} = u.${d.entity.keyCol};`,
    hint1: () => "Match the FK on the event to the PK on the entity.",
    hint2: () => "INNER JOIN keeps only rows with a matching key on both sides.",
    explain: () => "INNER JOIN is the intersection of two tables on the join predicate.",
    learned: ["INNER JOIN"],
  }),
  T({
    key: "left-join-null",
    topic: "left-join",
    difficulty: "Intermediate",
    xp: 22,
    minutes: 8,
    concepts: ["LEFT JOIN", "IS NULL"],
    tags: ["join", "anti-join"],
    complexity: "O(n)",
    title: (d) => `${cap(d.entity.label)}s with no ${d.event.label}s`,
    problem: (d) => `Return every ${d.entity.label} that has no matching row in ${d.event.name}.`,
    expected: (d) => `${d.entity.label} rows only — dormant users.`,
    solution: (d) => `SELECT u.*
FROM ${d.entity.name} u
LEFT JOIN ${d.event.name} e ON e.${d.event.entityFk} = u.${d.entity.keyCol}
WHERE e.${d.event.entityFk} IS NULL;`,
    alt: (d) => `SELECT * FROM ${d.entity.name} u
WHERE NOT EXISTS (SELECT 1 FROM ${d.event.name} e WHERE e.${d.event.entityFk} = u.${d.entity.keyCol});`,
    hint1: () => "LEFT JOIN keeps unmatched rows on the left side with NULLs on the right.",
    hint2: () => "Filtering the right side for NULL turns it into an anti-join.",
    explain: () => "The LEFT JOIN + IS NULL pattern finds rows missing on the other side.",
    learned: ["LEFT JOIN", "Anti-join"],
    related: ["exists"],
  }),
  T({
    key: "union",
    topic: "union",
    difficulty: "Intermediate",
    xp: 16,
    minutes: 6,
    concepts: ["UNION"],
    tags: ["set-op"],
    complexity: "O(n)",
    title: (d) => `Unique cities across ${d.entity.label}s and ${d.item.label}s`,
    problem: (d) =>
      `Return a single column of unique locations combining ${d.entity.regionCol} from ${d.entity.name} with any similarly-named column from ${d.item.name}.`,
    expected: () => `A single deduped column.`,
    solution: (d) => `SELECT ${d.entity.regionCol} AS location FROM ${d.entity.name}
UNION
SELECT ${d.item.categoryCol} AS location FROM ${d.item.name};`,
    hint1: () => "UNION removes duplicates; UNION ALL keeps them.",
    hint2: () => "Column count and types on both sides must match.",
    explain: () => "UNION combines two compatible result sets and de-duplicates by default.",
    learned: ["UNION"],
  }),
  T({
    key: "subquery",
    topic: "subqueries",
    difficulty: "Intermediate",
    xp: 22,
    minutes: 8,
    concepts: ["subquery", "AVG"],
    tags: ["subquery"],
    complexity: "O(n)",
    title: (d) => `${cap(d.event.label)}s above the average ${d.event.amountCol}`,
    problem: (d) => `Return ${d.event.label}s whose ${d.event.amountCol} exceeds the overall average.`,
    expected: (d) => `${d.event.label} rows only.`,
    solution: (d) => `SELECT * FROM ${d.event.name}
WHERE ${d.event.amountCol} > (SELECT AVG(${d.event.amountCol}) FROM ${d.event.name});`,
    hint1: () => "Scalar subqueries return a single value usable in a WHERE.",
    hint2: () => "Compute the aggregate once as a subquery, then compare.",
    explain: () => "A scalar subquery is evaluated once and re-used per row.",
    learned: ["Subquery", "Aggregate comparison"],
  }),
  T({
    key: "date-month",
    topic: "date-functions",
    difficulty: "Intermediate",
    xp: 20,
    minutes: 7,
    concepts: ["date parts"],
    tags: ["date"],
    complexity: "O(n)",
    title: (d) => `Monthly ${d.event.label} volume`,
    problem: (d) => `Return one row per month with the count of ${d.event.name} in that month.`,
    expected: () => `Columns: month, count.`,
    solution: (d) => `SELECT strftime('%Y-%m', ${d.event.dateCol}) AS month, COUNT(*) AS cnt
FROM ${d.event.name}
GROUP BY strftime('%Y-%m', ${d.event.dateCol})
ORDER BY month;`,
    alt: (d) => `-- Postgres/MySQL:
SELECT DATE_TRUNC('month', ${d.event.dateCol}) AS month, COUNT(*) AS cnt
FROM ${d.event.name}
GROUP BY DATE_TRUNC('month', ${d.event.dateCol})
ORDER BY month;`,
    hint1: () => "Extract the month from the date column.",
    hint2: () => "Group by the extracted month.",
    explain: () => "Time bucketing is a bread-and-butter analytics pattern.",
    learned: ["Date truncation", "Time bucketing"],
  }),

  // ─────────── Advanced ───────────
  T({
    key: "top-n-per-group",
    topic: "row-number",
    difficulty: "Advanced",
    xp: 28,
    minutes: 10,
    concepts: ["ROW_NUMBER", "PARTITION BY"],
    tags: ["window", "top-n"],
    complexity: "O(n log n)",
    title: (d) => `Top 3 ${d.entity.label}s by ${d.event.amountCol} per ${d.entity.regionCol}`,
    problem: (d) =>
      `For each ${d.entity.regionCol}, return the top 3 ${d.entity.label}s ranked by total ${d.event.amountCol}.`,
    expected: (d) => `Up to 3 rows per ${d.entity.regionCol}.`,
    solution: (d) => `WITH totals AS (
  SELECT u.${d.entity.keyCol}, u.${d.entity.textCol}, u.${d.entity.regionCol},
         SUM(e.${d.event.amountCol}) AS total
  FROM ${d.entity.name} u
  JOIN ${d.event.name} e ON e.${d.event.entityFk} = u.${d.entity.keyCol}
  GROUP BY u.${d.entity.keyCol}, u.${d.entity.textCol}, u.${d.entity.regionCol}
), ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY ${d.entity.regionCol} ORDER BY total DESC) AS rn
  FROM totals
)
SELECT * FROM ranked WHERE rn <= 3;`,
    hint1: () => "Aggregate first, then rank within each group.",
    hint2: () => "PARTITION BY defines the group ROW_NUMBER resets over.",
    explain: () => "The CTE + ROW_NUMBER pattern is the canonical top-N-per-group solution.",
    learned: ["Window functions", "Top-N per group"],
    related: ["cte", "partition-by"],
  }),
  T({
    key: "running-total",
    topic: "window-functions",
    difficulty: "Advanced",
    xp: 28,
    minutes: 10,
    concepts: ["SUM OVER", "running total"],
    tags: ["window", "cumulative"],
    complexity: "O(n log n)",
    title: (d) => `Cumulative ${d.event.amountCol} over time`,
    problem: (d) =>
      `Return every ${d.event.label} ordered by ${d.event.dateCol} with a running total of ${d.event.amountCol}.`,
    expected: () => `Rows plus a cumulative column.`,
    solution: (d) => `SELECT ${d.event.name.replace(/s$/, "") + "_id"}, ${d.event.dateCol}, ${d.event.amountCol},
       SUM(${d.event.amountCol}) OVER (ORDER BY ${d.event.dateCol}
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM ${d.event.name};`,
    hint1: () => "SUM as a window function over an ORDER BY produces a running total.",
    hint2: () => "Frame clause ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW is explicit.",
    explain: () => "Frame clauses control which rows the window aggregate sees.",
    learned: ["Window frames", "Running totals"],
  }),
  T({
    key: "lag-diff",
    topic: "lag",
    difficulty: "Advanced",
    xp: 26,
    minutes: 9,
    concepts: ["LAG"],
    tags: ["window"],
    complexity: "O(n log n)",
    title: (d) => `Day-over-day change in ${d.event.amountCol}`,
    problem: (d) =>
      `For each ${d.event.label} ordered by ${d.event.dateCol}, return the difference vs the previous row's ${d.event.amountCol}.`,
    expected: () => `A delta column, NULL on the first row.`,
    solution: (d) => `SELECT ${d.event.dateCol}, ${d.event.amountCol},
       ${d.event.amountCol} - LAG(${d.event.amountCol}) OVER (ORDER BY ${d.event.dateCol}) AS delta
FROM ${d.event.name};`,
    hint1: () => "LAG returns a value from the previous row.",
    hint2: () => "LEAD returns the next row's value.",
    explain: () => "LAG/LEAD implement offset lookups without a self-join.",
    learned: ["LAG", "Sequence analysis"],
  }),
  T({
    key: "dense-rank",
    topic: "dense-rank",
    difficulty: "Advanced",
    xp: 26,
    minutes: 9,
    concepts: ["DENSE_RANK"],
    tags: ["window", "rank"],
    complexity: "O(n log n)",
    title: (d) => `Dense-rank ${d.item.label}s by ${d.item.priceCol}`,
    problem: (d) =>
      `Return each ${d.item.label} with its DENSE_RANK over ${d.item.priceCol} descending. Ties share a rank; no gaps.`,
    expected: () => `Rows plus a rank column starting at 1.`,
    solution: (d) => `SELECT *, DENSE_RANK() OVER (ORDER BY ${d.item.priceCol} DESC) AS rk
FROM ${d.item.name};`,
    hint1: () => "RANK leaves gaps for ties; DENSE_RANK does not.",
    hint2: () => "ROW_NUMBER assigns unique numbers regardless of ties.",
    explain: () => "Choose the rank flavor that matches business semantics.",
    learned: ["DENSE_RANK", "RANK", "ROW_NUMBER"],
  }),
  T({
    key: "self-join-mgr",
    topic: "self-join",
    difficulty: "Advanced",
    xp: 24,
    minutes: 9,
    concepts: ["self join"],
    tags: ["join", "self"],
    complexity: "O(n)",
    title: (d) => `Pair each ${d.event.label} with the previous one for the same ${d.entity.label}`,
    problem: (d) =>
      `Return pairs of consecutive ${d.event.label}s for the same ${d.entity.label} using a self-join.`,
    expected: () => `Pairs with matching entity FK and adjacent dates.`,
    solution: (d) => `SELECT a.${d.event.entityFk}, a.${d.event.dateCol} AS prev_date, b.${d.event.dateCol} AS next_date
FROM ${d.event.name} a
JOIN ${d.event.name} b ON a.${d.event.entityFk} = b.${d.event.entityFk} AND a.${d.event.dateCol} < b.${d.event.dateCol};`,
    alt: (d) => `-- Prefer LAG over a self-join for adjacent pairs:
SELECT ${d.event.entityFk}, ${d.event.dateCol} AS next_date,
       LAG(${d.event.dateCol}) OVER (PARTITION BY ${d.event.entityFk} ORDER BY ${d.event.dateCol}) AS prev_date
FROM ${d.event.name};`,
    hint1: () => "Alias the same table twice to self-join.",
    hint2: () => "A self-join between events on FK + date inequality yields pairs.",
    explain: () => "Self-joins express row-to-row relationships within one table.",
    learned: ["Self join", "LAG"],
    related: ["lag"],
  }),
  T({
    key: "exists-any",
    topic: "exists",
    difficulty: "Advanced",
    xp: 22,
    minutes: 8,
    concepts: ["EXISTS"],
    tags: ["semi-join"],
    complexity: "O(n)",
    title: (d) => `${cap(d.entity.label)}s who have at least one ${d.event.label}`,
    problem: (d) =>
      `Return ${d.entity.label} rows that have any matching ${d.event.label}. Use EXISTS.`,
    expected: () => `Entities with at least one event.`,
    solution: (d) => `SELECT * FROM ${d.entity.name} u
WHERE EXISTS (SELECT 1 FROM ${d.event.name} e WHERE e.${d.event.entityFk} = u.${d.entity.keyCol});`,
    hint1: () => "EXISTS returns true as soon as a matching row is found.",
    hint2: () => "The projection inside EXISTS is irrelevant; SELECT 1 is idiomatic.",
    explain: () => "EXISTS is often faster than IN for semi-joins.",
    learned: ["EXISTS", "Semi-join"],
  }),
  T({
    key: "cte",
    topic: "cte",
    difficulty: "Advanced",
    xp: 24,
    minutes: 9,
    concepts: ["CTE", "WITH"],
    tags: ["readability"],
    complexity: "O(n)",
    title: (d) => `Top ${d.item.categoryCol} by total ${d.event.amountCol} (CTE version)`,
    problem: (d) =>
      `Use a CTE to compute the total ${d.event.amountCol} per ${d.item.categoryCol}, then return the top row.`,
    expected: () => `Exactly one row.`,
    solution: (d) => `WITH totals AS (
  SELECT i.${d.item.categoryCol}, SUM(e.${d.event.amountCol}) AS total
  FROM ${d.event.name} e
  JOIN ${d.item.name} i ON e.${d.event.itemFk} = i.${d.item.name.replace(/s$/, "") + "_id"}
  GROUP BY i.${d.item.categoryCol}
)
SELECT * FROM totals ORDER BY total DESC LIMIT 1;`,
    hint1: () => "WITH … AS ( … ) defines a CTE.",
    hint2: () => "CTEs make multi-step queries readable and testable.",
    explain: () => "CTEs improve query readability without materializing extra tables.",
    learned: ["CTE", "Composition"],
  }),
  T({
    key: "correlated",
    topic: "correlated-subqueries",
    difficulty: "Advanced",
    xp: 26,
    minutes: 10,
    concepts: ["correlated subquery"],
    tags: ["subquery"],
    complexity: "O(n²) worst-case",
    title: (d) => `Each ${d.entity.label}'s latest ${d.event.label}`,
    problem: (d) =>
      `For every ${d.entity.label}, return their most recent ${d.event.label} by ${d.event.dateCol} using a correlated subquery.`,
    expected: (d) => `One row per ${d.entity.label}.`,
    solution: (d) => `SELECT e.* FROM ${d.event.name} e
WHERE e.${d.event.dateCol} = (
  SELECT MAX(e2.${d.event.dateCol}) FROM ${d.event.name} e2
  WHERE e2.${d.event.entityFk} = e.${d.event.entityFk}
);`,
    alt: (d) => `-- Window-function alternative (usually faster):
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY ${d.event.entityFk} ORDER BY ${d.event.dateCol} DESC) AS rn
  FROM ${d.event.name}
) x WHERE rn = 1;`,
    hint1: () => "A correlated subquery references the outer row.",
    hint2: () => "Consider replacing correlated subqueries with window functions.",
    explain: () => "Correlated subqueries can be O(n²) — window functions often beat them.",
    learned: ["Correlated subquery", "Window rewrite"],
    related: ["window-functions"],
  }),

  // ─────────── Interview ───────────
  T({
    key: "median",
    topic: "window-functions",
    difficulty: "Interview",
    xp: 40,
    minutes: 15,
    concepts: ["median", "percentile"],
    tags: ["interview", "advanced"],
    complexity: "O(n log n)",
    title: (d) => `Median ${d.event.amountCol}`,
    problem: (d) =>
      `Compute the median ${d.event.amountCol} across all ${d.event.name} without using PERCENTILE_CONT (portable).`,
    expected: () => `A single numeric value.`,
    solution: (d) => `WITH ranked AS (
  SELECT ${d.event.amountCol},
         ROW_NUMBER() OVER (ORDER BY ${d.event.amountCol}) AS rn,
         COUNT(*) OVER () AS n
  FROM ${d.event.name}
)
SELECT AVG(${d.event.amountCol}) AS median
FROM ranked
WHERE rn IN ((n + 1) / 2, (n + 2) / 2);`,
    hint1: () => "Sort values and pick the middle one(s).",
    hint2: () => "For even counts, average the two middle rows.",
    explain: () => "This portable median expression works on engines without PERCENTILE_CONT.",
    learned: ["Median", "Portable analytics"],
  }),
  T({
    key: "consecutive-days",
    topic: "date-functions",
    difficulty: "Interview",
    xp: 45,
    minutes: 18,
    concepts: ["gaps and islands", "date math"],
    tags: ["interview", "streak"],
    complexity: "O(n log n)",
    title: (d) => `Longest daily streak per ${d.entity.label}`,
    problem: (d) =>
      `For each ${d.entity.label}, find the longest run of consecutive calendar days containing at least one ${d.event.label}.`,
    expected: () => `Entity id + longest streak length.`,
    solution: (d) => `WITH d AS (
  SELECT DISTINCT ${d.event.entityFk}, DATE(${d.event.dateCol}) AS dt FROM ${d.event.name}
),
grouped AS (
  SELECT ${d.event.entityFk}, dt,
         DATE(dt, '-' || ROW_NUMBER() OVER (PARTITION BY ${d.event.entityFk} ORDER BY dt) || ' days') AS grp
  FROM d
)
SELECT ${d.event.entityFk}, MAX(streak) AS longest FROM (
  SELECT ${d.event.entityFk}, grp, COUNT(*) AS streak
  FROM grouped GROUP BY ${d.event.entityFk}, grp
) s GROUP BY ${d.event.entityFk};`,
    hint1: () => "Gaps-and-islands: subtract a row number from the date to detect runs.",
    hint2: () => "Each 'island' shares a constant offset date.",
    explain: () => "Gaps-and-islands is a canonical interview pattern for streaks.",
    learned: ["Gaps & islands", "Streak analysis"],
    related: ["window-functions"],
  }),
  T({
    key: "second-highest",
    topic: "limit-offset",
    difficulty: "Interview",
    xp: 30,
    minutes: 12,
    concepts: ["nth-highest", "DISTINCT"],
    tags: ["interview", "classic"],
    complexity: "O(n log n)",
    title: (d) => `Second highest ${d.item.priceCol}`,
    problem: (d) => `Return the second highest DISTINCT ${d.item.priceCol} in ${d.item.name}. Return NULL if none.`,
    expected: () => `A single value.`,
    solution: (d) => `SELECT MAX(${d.item.priceCol}) AS second_highest
FROM ${d.item.name}
WHERE ${d.item.priceCol} < (SELECT MAX(${d.item.priceCol}) FROM ${d.item.name});`,
    alt: (d) => `SELECT DISTINCT ${d.item.priceCol}
FROM ${d.item.name}
ORDER BY ${d.item.priceCol} DESC
LIMIT 1 OFFSET 1;`,
    hint1: () => "Filter out the maximum, then take the max of what remains.",
    hint2: () => "OFFSET works too, but returns no rows if only one distinct value exists.",
    explain: () => "The MAX-of-below-MAX form handles the edge case cleanly.",
    learned: ["Nth highest", "OFFSET vs subquery"],
  }),
  T({
    key: "duplicates",
    topic: "group-by",
    difficulty: "Interview",
    xp: 28,
    minutes: 10,
    concepts: ["duplicates", "HAVING"],
    tags: ["interview", "dedup"],
    complexity: "O(n)",
    title: (d) => `Find duplicate ${d.entity.textCol}s`,
    problem: (d) => `Return every ${d.entity.textCol} that appears more than once in ${d.entity.name}.`,
    expected: () => `One row per duplicated value with the count.`,
    solution: (d) => `SELECT ${d.entity.textCol}, COUNT(*) AS cnt
FROM ${d.entity.name}
GROUP BY ${d.entity.textCol}
HAVING COUNT(*) > 1;`,
    hint1: () => "GROUP BY the column, then HAVING on the count.",
    hint2: () => "HAVING filters after aggregation.",
    explain: () => "Bucket + HAVING is the shortest way to spot duplicates.",
    learned: ["Duplicates", "HAVING"],
  }),
  T({
    key: "retention",
    topic: "cte",
    difficulty: "Interview",
    xp: 50,
    minutes: 20,
    concepts: ["retention", "cohort"],
    tags: ["interview", "product-analytics"],
    complexity: "O(n)",
    title: (d) => `Week-1 retention rate`,
    problem: (d) =>
      `Compute the percentage of ${d.entity.label}s whose signup week contains a ${d.event.label} and who also have a ${d.event.label} in the following week.`,
    expected: () => `A single ratio.`,
    solution: (d) => `WITH first_event AS (
  SELECT ${d.event.entityFk} AS uid, MIN(${d.event.dateCol}) AS first_dt
  FROM ${d.event.name} GROUP BY ${d.event.entityFk}
),
w2 AS (
  SELECT fe.uid FROM first_event fe
  JOIN ${d.event.name} e ON e.${d.event.entityFk} = fe.uid
   AND DATE(e.${d.event.dateCol}) BETWEEN DATE(fe.first_dt, '+7 days') AND DATE(fe.first_dt, '+13 days')
  GROUP BY fe.uid
)
SELECT ROUND(100.0 * (SELECT COUNT(*) FROM w2) / (SELECT COUNT(*) FROM first_event), 2) AS retention_pct;`,
    hint1: () => "Identify each entity's first event.",
    hint2: () => "Count those who returned in the following week.",
    explain: () => "Retention analysis anchors every user to their own timeline.",
    learned: ["Cohort", "Retention"],
    related: ["date-functions"],
  }),
];

/**
 * Curated seed templates used for the domain browser (4 per domain).
 * Chosen to span the beginner → intermediate → advanced arc so every
 * domain has a self-contained learning slice out of the box.
 */
const SEED_TEMPLATE_KEYS = [
  "list-all",         // SELECT / projection — beginner
  "count",            // aggregate — beginner→intermediate
  "group-by",         // GROUP BY — intermediate
  "top-n-per-group",  // window function — advanced
];

/** Companies rotate through interview-tier templates (3 per company). */
const INTERVIEW_TEMPLATE_KEYS = [
  "second-highest",
  "duplicates",
  "median",
  "consecutive-days",
  "top-n-per-group",
  "retention",
  "running-total",
  "lag-diff",
  "correlated",
];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

let counter = 0;
const nextNum = () => ++counter;

function build(template: Template, domain: DomainDef, extra: Partial<Challenge> = {}): Challenge {
  const id = `${domain.id}-${template.key}`;
  return {
    id,
    number: nextNum(),
    title: template.title(domain),
    topic: template.topic,
    difficulty: template.difficulty,
    estMinutes: template.minutes,
    xp: template.xp,
    concepts: template.concepts,
    tags: [...template.tags, domain.id],
    domain: domain.label,
    problem: template.problem(domain),
    dbDescription: `${domain.entity.name}(${domain.entity.cols})
${domain.event.name}(${domain.event.cols})
${domain.item.name}(${domain.item.cols})`,
    sampleInput: `-- Schema for ${domain.label}\n-- See Database section for column details.`,
    expectedOutput: template.expected(domain),
    starterSql: `-- ${template.title(domain)}\n`,
    hints: [template.hint1(domain), template.hint2(domain)],
    solution: template.solution(domain),
    altSolution: template.alt?.(domain),
    explanation: template.explain(domain),
    complexity: template.complexity,
    conceptsLearned: template.learned,
    relatedTopics: template.related,
    ...extra,
  };
}

/**
 * Generate a curated seed slice: SEED_TEMPLATE_KEYS × every domain.
 * 22 domains × 4 templates = 88 domain challenges. Content grows
 * incrementally by adding template keys to SEED_TEMPLATE_KEYS.
 */
export function generateDomainChallenges(): Challenge[] {
  counter = 0;
  const out: Challenge[] = [];
  const seedTemplates = SEED_TEMPLATE_KEYS
    .map((k) => TEMPLATES.find((t) => t.key === k))
    .filter((t): t is Template => Boolean(t));
  for (const d of DOMAINS) {
    for (const t of seedTemplates) {
      out.push(build(t, d));
    }
  }
  // Wire nextId across contiguous challenges within each domain.
  const byDomain = new Map<string, Challenge[]>();
  for (const c of out) {
    const arr = byDomain.get(c.domain) ?? [];
    arr.push(c);
    byDomain.set(c.domain, arr);
  }
  for (const arr of byDomain.values()) {
    for (let i = 0; i < arr.length - 1; i++) arr[i].nextId = arr[i + 1].id;
  }
  return out;
}

const ROUNDS: InterviewRound[] = ["Screen", "Phone", "Onsite", "Take-home", "Final"];

/**
 * Generate 3 seed interview questions per company (Beginner / Intermediate /
 * Advanced) cycled across domains. 20 × 3 = 60 challenges.
 */
export function generateCompanyChallenges(): Challenge[] {
  const list: Challenge[] = [];
  let n = 10_000; // separate namespace
  const SEED_COUNT = 3;
  for (const company of COMPANIES) {
    const templates = INTERVIEW_TEMPLATE_KEYS.map((k) => TEMPLATES.find((t) => t.key === k)!).filter(Boolean);
    for (let i = 0; i < SEED_COUNT; i++) {
      const tpl = templates[i % templates.length];
      const domain = DOMAINS[(company.name.length + i) % DOMAINS.length];
      const round = ROUNDS[i % ROUNDS.length];
      const difficulty: Difficulty = i < 2 ? "Beginner" : i < 4 ? "Intermediate" : "Advanced";
      const xp = 25 + i * 5;
      const built = build(tpl, domain, {
        id: `${company.id}-${tpl.key}-${i}`,
        number: n++,
        difficulty: "Interview",
        company: company.name,
        interviewRound: round,
        xp,
        tags: [...tpl.tags, company.id, domain.id, difficulty.toLowerCase()],
        title: `${company.name} · ${tpl.title(domain)}`,
      });
      list.push(built);
    }
  }
  // Add similarIds within a company.
  const byCompany = new Map<string, Challenge[]>();
  for (const c of list) {
    if (!c.company) continue;
    const arr = byCompany.get(c.company) ?? [];
    arr.push(c);
    byCompany.set(c.company, arr);
  }
  for (const arr of byCompany.values()) {
    for (const c of arr) c.similarIds = arr.filter((x) => x.id !== c.id).slice(0, 3).map((x) => x.id);
  }
  return list;
}
