import type { Challenge, TopicId } from "./types";
import type { ChallengeState } from "./storage";
import { TOPICS } from "./topics";
import { DOMAINS } from "./domains";

export interface ProgressStats {
  total: number;
  completed: number;
  remaining: number;
  xp: number;
  streak: number;
  accuracyPct: number;
  avgSolveSeconds: number;
  rank: string;
  byTopic: { id: TopicId; label: string; total: number; solved: number; pct: number }[];
  byDomain: { id: string; label: string; total: number; solved: number; pct: number }[];
  byDifficulty: { difficulty: string; total: number; solved: number; pct: number }[];
}

const RANKS: { min: number; name: string }[] = [
  { min: 0, name: "Novice" },
  { min: 5, name: "Beginner" },
  { min: 25, name: "Apprentice" },
  { min: 75, name: "Journeyman" },
  { min: 150, name: "Analyst" },
  { min: 300, name: "Data Engineer" },
  { min: 500, name: "Query Ninja" },
  { min: 750, name: "SQL Master" },
  { min: 1000, name: "Grand Master" },
];

export function computeProgress(state: ChallengeState, all: Challenge[]): ProgressStats {
  const total = all.length;
  const completed = state.solved.length;
  const remaining = Math.max(0, total - completed);

  const totalAttempts = Object.values(state.attempts).reduce((a, b) => a + b, 0);
  const accuracyPct = totalAttempts > 0 ? Math.round((completed / totalAttempts) * 100) : 100;

  const solvedRecords = state.records.filter((r) => r.seconds > 0);
  const avgSolveSeconds =
    solvedRecords.length > 0
      ? Math.round(solvedRecords.reduce((a, r) => a + r.seconds, 0) / solvedRecords.length)
      : 0;

  const rank = RANKS.reduce((best, r) => (completed >= r.min ? r : best), RANKS[0]).name;

  const solvedSet = new Set(state.solved);

  const byTopic = TOPICS.map((t) => {
    const list = all.filter((c) => c.topic === t.id);
    const solved = list.filter((c) => solvedSet.has(c.id)).length;
    return {
      id: t.id,
      label: t.label,
      total: list.length,
      solved,
      pct: list.length ? Math.round((solved / list.length) * 100) : 0,
    };
  }).filter((t) => t.total > 0);

  const byDomain = DOMAINS.map((d) => {
    const list = all.filter((c) => c.domain === d.label);
    const solved = list.filter((c) => solvedSet.has(c.id)).length;
    return {
      id: d.id,
      label: d.label,
      total: list.length,
      solved,
      pct: list.length ? Math.round((solved / list.length) * 100) : 0,
    };
  }).filter((d) => d.total > 0);

  const difficulties = ["Beginner", "Intermediate", "Advanced", "Interview"] as const;
  const byDifficulty = difficulties.map((diff) => {
    const list = all.filter((c) => c.difficulty === diff);
    const solved = list.filter((c) => solvedSet.has(c.id)).length;
    return {
      difficulty: diff,
      total: list.length,
      solved,
      pct: list.length ? Math.round((solved / list.length) * 100) : 0,
    };
  });

  return {
    total,
    completed,
    remaining,
    xp: state.xp,
    streak: state.dailyStreakDays,
    accuracyPct,
    avgSolveSeconds,
    rank,
    byTopic,
    byDomain,
    byDifficulty,
  };
}
