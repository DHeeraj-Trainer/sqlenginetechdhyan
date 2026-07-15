const KEY = "sqlwb:challenges:v1";

export interface ChallengeState {
  solved: string[];
  bookmarked: string[];
  favorite: string[];
  xp: number;
}

const empty = (): ChallengeState => ({ solved: [], bookmarked: [], favorite: [], xp: 0 });

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
