import type { ChallengeState } from "./storage";
import type { Challenge } from "./types";

export interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: string;
  test: (s: ChallengeState, all: Challenge[]) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-blood",
    label: "First Blood",
    description: "Solve your first challenge.",
    icon: "🩸",
    test: (s) => s.solved.length >= 1,
  },
  {
    id: "streak-3",
    label: "3-Day Streak",
    description: "Solve on 3 consecutive days.",
    icon: "🔥",
    test: (s) => s.dailyStreakDays >= 3,
  },
  {
    id: "streak-7",
    label: "Weekly Warrior",
    description: "7-day solve streak.",
    icon: "🗓️",
    test: (s) => s.dailyStreakDays >= 7,
  },
  {
    id: "streak-30",
    label: "Century Grinder",
    description: "30-day solve streak.",
    icon: "🏔️",
    test: (s) => s.dailyStreakDays >= 30,
  },
  {
    id: "solved-10",
    label: "Getting Warm",
    description: "Solve 10 challenges.",
    icon: "🌱",
    test: (s) => s.solved.length >= 10,
  },
  {
    id: "solved-50",
    label: "Half Century",
    description: "Solve 50 challenges.",
    icon: "🎯",
    test: (s) => s.solved.length >= 50,
  },
  {
    id: "solved-100",
    label: "Centurion",
    description: "Solve 100 challenges.",
    icon: "💯",
    test: (s) => s.solved.length >= 100,
  },
  {
    id: "solved-250",
    label: "Grinder",
    description: "Solve 250 challenges.",
    icon: "🥷",
    test: (s) => s.solved.length >= 250,
  },
  {
    id: "solved-500",
    label: "SQL Assassin",
    description: "Solve 500 challenges.",
    icon: "🗡️",
    test: (s) => s.solved.length >= 500,
  },
  {
    id: "xp-500",
    label: "Rising Star",
    description: "Earn 500 XP.",
    icon: "⭐",
    test: (s) => s.xp >= 500,
  },
  {
    id: "xp-2500",
    label: "SQL Pro",
    description: "Earn 2,500 XP.",
    icon: "🌟",
    test: (s) => s.xp >= 2500,
  },
  {
    id: "xp-10000",
    label: "Grand Master",
    description: "Earn 10,000 XP.",
    icon: "👑",
    test: (s) => s.xp >= 10_000,
  },
  {
    id: "domain-first",
    label: "Domain Explorer",
    description: "Solve a challenge in each of 5 different domains.",
    icon: "🗺️",
    test: (s, all) => {
      const doms = new Set(
        all.filter((c) => s.solved.includes(c.id)).map((c) => c.domain),
      );
      return doms.size >= 5;
    },
  },
  {
    id: "domain-all",
    label: "Polyglot",
    description: "Solve at least one challenge in every domain.",
    icon: "🌍",
    test: (s, all) => {
      const solvedDomains = new Set(
        all.filter((c) => s.solved.includes(c.id)).map((c) => c.domain),
      );
      const totalDomains = new Set(all.map((c) => c.domain));
      return solvedDomains.size >= totalDomains.size;
    },
  },
  {
    id: "interview-5",
    label: "Interview Ready",
    description: "Solve 5 interview-tier challenges.",
    icon: "🎓",
    test: (s, all) =>
      all.filter((c) => c.difficulty === "Interview" && s.solved.includes(c.id)).length >= 5,
  },
  {
    id: "interview-20",
    label: "Interview Champion",
    description: "Solve 20 interview-tier challenges.",
    icon: "🏆",
    test: (s, all) =>
      all.filter((c) => c.difficulty === "Interview" && s.solved.includes(c.id)).length >= 20,
  },
  {
    id: "company-faang",
    label: "FAANG Slayer",
    description: "Solve 3 challenges from FAANG companies.",
    icon: "🦁",
    test: (s, all) => {
      const faang = ["Amazon", "Google", "Microsoft", "Meta", "Netflix"];
      return all.filter((c) => c.company && faang.includes(c.company) && s.solved.includes(c.id)).length >= 3;
    },
  },
  {
    id: "window-master",
    label: "Window Master",
    description: "Solve 5 window-function challenges.",
    icon: "🪟",
    test: (s, all) =>
      all.filter((c) =>
        ["window-functions", "row-number", "rank", "dense-rank", "lead", "lag", "partition-by"].includes(c.topic)
        && s.solved.includes(c.id),
      ).length >= 5,
  },
  {
    id: "join-master",
    label: "Join Master",
    description: "Solve 10 join challenges.",
    icon: "🔗",
    test: (s, all) =>
      all.filter((c) =>
        ["inner-join", "left-join", "right-join", "full-outer-join", "self-join", "cross-join", "multi-table-joins"].includes(c.topic)
        && s.solved.includes(c.id),
      ).length >= 10,
  },
];

/** Return the list of achievement IDs currently satisfied by the state. */
export function unlockedAchievements(s: ChallengeState, all: Challenge[]): string[] {
  return ACHIEVEMENTS.filter((a) => a.test(s, all)).map((a) => a.id);
}

/** Progress toward the next locked achievement in the same "family" (very light heuristic). */
export function newlyUnlocked(
  prev: string[],
  next: string[],
): Achievement[] {
  const set = new Set(prev);
  return ACHIEVEMENTS.filter((a) => next.includes(a.id) && !set.has(a.id));
}
