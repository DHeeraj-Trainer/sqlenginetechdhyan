import type { Topic, TopicId } from "./types";

export const TOPICS: Topic[] = [
  { id: "select-basics", label: "SELECT Basics", order: 1 },
  { id: "where-filtering", label: "WHERE & Filtering", order: 2 },
  { id: "order-by", label: "ORDER BY", order: 3 },
  { id: "limit-offset", label: "LIMIT & OFFSET", order: 4 },
  { id: "distinct", label: "DISTINCT", order: 5 },
  { id: "aggregate-functions", label: "Aggregate Functions", order: 6 },
  { id: "group-by", label: "GROUP BY", order: 7 },
  { id: "having", label: "HAVING", order: 8 },
  { id: "case-when", label: "CASE WHEN", order: 9 },
  { id: "string-functions", label: "String Functions", order: 10 },
  { id: "date-functions", label: "Date Functions", order: 11 },
  { id: "math-functions", label: "Mathematical Functions", order: 12 },
  { id: "null-handling", label: "NULL Handling", order: 13 },
  { id: "inner-join", label: "INNER JOIN", order: 14 },
  { id: "left-join", label: "LEFT JOIN", order: 15 },
  { id: "right-join", label: "RIGHT JOIN", order: 16 },
  { id: "full-outer-join", label: "FULL OUTER JOIN", order: 17 },
  { id: "self-join", label: "SELF JOIN", order: 18 },
  { id: "cross-join", label: "CROSS JOIN", order: 19 },
  { id: "multi-table-joins", label: "Multi-table Joins", order: 20 },
  { id: "union", label: "UNION / UNION ALL", order: 21 },
  { id: "subqueries", label: "Subqueries", order: 22 },
  { id: "correlated-subqueries", label: "Correlated Subqueries", order: 23 },
  { id: "exists", label: "EXISTS / NOT EXISTS", order: 24 },
  { id: "any-all", label: "ANY / ALL", order: 25 },
  { id: "cte", label: "CTE", order: 26 },
  { id: "recursive-cte", label: "Recursive CTE", order: 27 },
  { id: "window-functions", label: "Window Functions", order: 28 },
  { id: "row-number", label: "ROW_NUMBER()", order: 29 },
  { id: "rank", label: "RANK()", order: 30 },
  { id: "dense-rank", label: "DENSE_RANK()", order: 31 },
  { id: "lead", label: "LEAD()", order: 32 },
  { id: "lag", label: "LAG()", order: 33 },
  { id: "partition-by", label: "PARTITION BY", order: 34 },
  { id: "views", label: "Views", order: 35 },
  { id: "indexes", label: "Indexes", order: 36 },
  { id: "transactions", label: "Transactions", order: 37 },
  { id: "database-design", label: "Database Design", order: 38 },
  { id: "normalization", label: "Normalization", order: 39 },
  { id: "performance", label: "Performance Optimization", order: 40 },
];

export const TOPIC_MAP: Record<TopicId, Topic> = TOPICS.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<TopicId, Topic>,
);
