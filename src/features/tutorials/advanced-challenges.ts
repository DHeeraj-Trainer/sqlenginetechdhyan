// @ts-nocheck
// Generates tough / advanced challenges per domain. These sit on top of the
// generator's beginner set and are used by the sequential-unlock Advanced
// track in LearnPanel.
//
// Each challenge exposes:
//   id, category, difficulty, text, expectedQuery
// exactly like the beginner questions, so the same ChallengeCard shape works.
//
// Rules: queries must be portable across SQLite / PGlite / AlaSQL. We only
// use ANSI features (COUNT, DISTINCT, GROUP BY, HAVING, CTE, subqueries,
// CASE, UNION ALL). Column references use each table's first column as PK.

function firstCol(t: any): string {
  return t?.columns?.[0]?.name ?? "id";
}
function numericCol(t: any): string {
  const c = t?.columns?.find((c: any) => /int|numeric|decimal|float|double|real/i.test(c?.type ?? ""));
  return c?.name ?? firstCol(t);
}

export function buildAdvancedChallenges(domain: any) {
  const tables = domain?.tables ?? [];
  const t1 = tables[0];
  const t2 = tables[1] ?? t1;
  const t3 = tables[2] ?? t2;
  if (!t1) return [];

  const pk1 = firstCol(t1);
  const pk2 = firstCol(t2);
  const num1 = numericCol(t1);
  const num2 = numericCol(t2);

  const items = [
    {
      id: `${domain.id}-adv-1`,
      category: "Aggregation",
      difficulty: "Advanced",
      text: `Return one row per table with its total row count from ${t1.name}, ${t2.name}, and ${t3.name}, sorted by count descending. Use UNION ALL.`,
      expectedQuery:
        `SELECT '${t1.name}' AS tbl, COUNT(*) AS n FROM ${t1.name}\n` +
        `UNION ALL SELECT '${t2.name}', COUNT(*) FROM ${t2.name}\n` +
        `UNION ALL SELECT '${t3.name}', COUNT(*) FROM ${t3.name}\n` +
        `ORDER BY n DESC`,
    },
    {
      id: `${domain.id}-adv-2`,
      category: "CTE",
      difficulty: "Advanced",
      text: `Using a CTE named "totals", compute COUNT(*) from ${t1.name} as n, then select rows from that CTE where n > 0.`,
      expectedQuery:
        `WITH totals AS (SELECT COUNT(*) AS n FROM ${t1.name})\n` +
        `SELECT n FROM totals WHERE n > 0`,
    },
    {
      id: `${domain.id}-adv-3`,
      category: "Deduplication",
      difficulty: "Advanced",
      text: `Report duplicates in ${t1.name}: COUNT(*) - COUNT(DISTINCT ${pk1}) AS duplicates.`,
      expectedQuery:
        `SELECT COUNT(*) - COUNT(DISTINCT ${pk1}) AS duplicates FROM ${t1.name}`,
    },
    {
      id: `${domain.id}-adv-4`,
      category: "Self-join",
      difficulty: "Advanced",
      text: `Using a self-join on ${t1.name}, count the number of ordered pairs (a, b) where a.${pk1} < b.${pk1}. Return a single column named pairs.`,
      expectedQuery:
        `SELECT COUNT(*) AS pairs FROM ${t1.name} a, ${t1.name} b WHERE a.${pk1} < b.${pk1}`,
    },
    {
      id: `${domain.id}-adv-5`,
      category: "Subquery",
      difficulty: "Advanced",
      text: `From ${t2.name}, select rows whose ${pk2} appears in ${t2.name} (self reference via subquery). Return COUNT(*).`,
      expectedQuery:
        `SELECT COUNT(*) FROM ${t2.name} WHERE ${pk2} IN (SELECT ${pk2} FROM ${t2.name})`,
    },
    {
      id: `${domain.id}-adv-6`,
      category: "CASE aggregation",
      difficulty: "Advanced",
      text: `From ${t1.name}, use CASE inside SUM to count rows where ${num1} > 0 (label as positives) and where ${num1} = 0 or IS NULL (label as zeros).`,
      expectedQuery:
        `SELECT SUM(CASE WHEN ${num1} > 0 THEN 1 ELSE 0 END) AS positives,\n` +
        `       SUM(CASE WHEN ${num1} = 0 OR ${num1} IS NULL THEN 1 ELSE 0 END) AS zeros\n` +
        `FROM ${t1.name}`,
    },
    {
      id: `${domain.id}-adv-7`,
      category: "HAVING",
      difficulty: "Advanced",
      text: `Group ${t2.name} by ${pk2}, and return only groups with COUNT(*) >= 1. Select ${pk2} and the count as n. Order by n descending, then ${pk2}.`,
      expectedQuery:
        `SELECT ${pk2}, COUNT(*) AS n FROM ${t2.name}\n` +
        `GROUP BY ${pk2}\n` +
        `HAVING COUNT(*) >= 1\n` +
        `ORDER BY n DESC, ${pk2}`,
    },
    {
      id: `${domain.id}-adv-8`,
      category: "Cross-table",
      difficulty: "Advanced",
      text: `Return a single row with three columns — n1, n2, n3 — the row counts of ${t1.name}, ${t2.name}, and ${t3.name} respectively, using scalar subqueries.`,
      expectedQuery:
        `SELECT (SELECT COUNT(*) FROM ${t1.name}) AS n1,\n` +
        `       (SELECT COUNT(*) FROM ${t2.name}) AS n2,\n` +
        `       (SELECT COUNT(*) FROM ${t3.name}) AS n3`,
    },
    {
      id: `${domain.id}-adv-9`,
      category: "Aggregation",
      difficulty: "Advanced",
      text: `From ${t2.name}, compute MIN, MAX, AVG, and SUM of ${num2} in one row. Alias them min_v, max_v, avg_v, sum_v.`,
      expectedQuery:
        `SELECT MIN(${num2}) AS min_v, MAX(${num2}) AS max_v, AVG(${num2}) AS avg_v, SUM(${num2}) AS sum_v FROM ${t2.name}`,
    },
    {
      id: `${domain.id}-adv-10`,
      category: "Set logic",
      difficulty: "Advanced",
      text: `Using a CTE, compute total_rows across ${t1.name} and ${t2.name} combined (sum of their row counts). Return a single column total_rows.`,
      expectedQuery:
        `WITH a AS (SELECT COUNT(*) AS n FROM ${t1.name}),\n` +
        `     b AS (SELECT COUNT(*) AS n FROM ${t2.name})\n` +
        `SELECT (SELECT n FROM a) + (SELECT n FROM b) AS total_rows`,
    },
  ];

  return items;
}
