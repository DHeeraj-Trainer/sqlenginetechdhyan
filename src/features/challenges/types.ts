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

export type InterviewRound = "Screen" | "Phone" | "Onsite" | "Take-home" | "Final";

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
  // Interview-specific (optional)
  company?: string;
  interviewRound?: InterviewRound;
  similarIds?: string[];
  relatedTopics?: TopicId[];
  nextId?: string;
}

export interface Topic {
  id: TopicId;
  label: string;
  order: number;
}

export interface DomainDef {
  id: string;
  label: string;
  emoji: string;
  // Three semantic tables per domain: entity, event, item.
  entity: { name: string; label: string; cols: string; keyCol: string; textCol: string; regionCol: string };
  event: {
    name: string;
    label: string;
    cols: string;
    dateCol: string;
    amountCol: string;
    statusCol: string;
    statusValues: string[];
    entityFk: string;
    itemFk: string;
  };
  item: { name: string; label: string; cols: string; categoryCol: string; priceCol: string; textCol: string };
}

export interface CompanyDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
  tier: "FAANG" | "Big Tech" | "Fintech" | "Consumer" | "Enterprise";
}
