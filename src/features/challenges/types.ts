export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Interview";

export type TopicId =
  | "select-basics"
  | "where-filtering"
  | "order-by"
  | "limit-offset"
  | "distinct"
  | "aggregate-functions"
  | "group-by"
  | "having"
  | "case-when"
  | "string-functions"
  | "date-functions"
  | "math-functions"
  | "null-handling"
  | "inner-join"
  | "left-join"
  | "right-join"
  | "full-outer-join"
  | "self-join"
  | "cross-join"
  | "multi-table-joins"
  | "union"
  | "subqueries"
  | "correlated-subqueries"
  | "exists"
  | "any-all"
  | "cte"
  | "recursive-cte"
  | "window-functions"
  | "row-number"
  | "rank"
  | "dense-rank"
  | "lead"
  | "lag"
  | "partition-by"
  | "views"
  | "indexes"
  | "transactions"
  | "database-design"
  | "normalization"
  | "performance";

export interface Challenge {
  id: string;
  number: number;
  title: string;
  topic: TopicId;
  difficulty: Difficulty;
  estMinutes: number;
  xp: number;
  concepts: string[];
  tags: string[];
  domain: string;
  problem: string;
  dbDescription: string;
  sampleInput: string;
  expectedOutput: string;
  starterSql: string;
  hints: [string, string];
  solution: string;
  altSolution?: string;
  explanation: string;
  complexity: string;
  conceptsLearned: string[];
}

export interface Topic {
  id: TopicId;
  label: string;
  order: number;
}
