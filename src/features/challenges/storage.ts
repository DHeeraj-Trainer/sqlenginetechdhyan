const KEY = "sqlwb:challenges:v1";

export interface SolveRecord {
  id: string;
  ts: number;
  seconds: number;
  attempts: number;
}

export interface ChallengeState {
  solved: string[];
  bookmarked: string[];
  favorite: string[];
  xp: number;
  attempts: Record<string, number>;
  records: SolveRecord[];
  dailyStreakDays: number;
  lastSolvedDate?: string; // YYYY-MM-DD
  achievements: string[]; // achievement IDs unlocked
}

const empty = (): ChallengeState => ({
  solved: [],
  bookmarked: [],
  favorite: [],
  xp: 0,
  attempts: {},
  records: [],
  dailyStreakDays: 0,
  lastSolvedDate: undefined,
  achievements: [],
});

export function loadState(): ChallengeState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return { ...empty(), ...parsed };
  } catch {
    return empty();
  }
}

export function saveState(s: ChallengeState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore quota errors
  }
}

export function toggle(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ta = new Date(a + "T00:00:00Z").getTime();
  const tb = new Date(b + "T00:00:00Z").getTime();
  return Math.round((tb - ta) / 86_400_000);
}

/** Record a solve — updates solved, xp, streak, records, and attempts. */
export function recordSolve(
  s: ChallengeState,
  id: string,
  xp: number,
  seconds = 0,
): ChallengeState {
  if (s.solved.includes(id)) return s;
  const today = todayISO();
  const attempts = s.attempts[id] ?? 1;
  const record: SolveRecord = { id, ts: Date.now(), seconds, attempts };
  let streak = s.dailyStreakDays;
  if (s.lastSolvedDate === today) {
    // same day — keep streak
  } else if (s.lastSolvedDate && daysBetween(s.lastSolvedDate, today) === 1) {
    streak += 1;
  } else {
    streak = 1;
  }
  return {
    ...s,
    solved: [...s.solved, id],
    xp: s.xp + xp,
    records: [record, ...s.records].slice(0, 500),
    dailyStreakDays: streak,
    lastSolvedDate: today,
  };
}

export function recordAttempt(s: ChallengeState, id: string): ChallengeState {
  return { ...s, attempts: { ...s.attempts, [id]: (s.attempts[id] ?? 0) + 1 } };
}
