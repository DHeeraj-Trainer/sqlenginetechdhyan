import type { Challenge } from "./types";
import { CURATED_CHALLENGES } from "./catalog";
import { generateDomainChallenges, generateCompanyChallenges } from "./generator";

/**
 * The full challenge library: curated hand-written challenges + programmatic
 * domain challenges + company interview challenges. Numbered contiguously.
 */
const domainGen = generateDomainChallenges();
const companyGen = generateCompanyChallenges();

// Re-number so #s are contiguous across the whole library.
let n = 0;
export const CHALLENGES: Challenge[] = [
  ...CURATED_CHALLENGES,
  ...domainGen,
  ...companyGen,
].map((c) => ({ ...c, number: ++n }));

export const CHALLENGE_MAP: Record<string, Challenge> = Object.fromEntries(
  CHALLENGES.map((c) => [c.id, c]),
);

export const DOMAIN_CHALLENGES = domainGen;
export const COMPANY_CHALLENGES = companyGen;
