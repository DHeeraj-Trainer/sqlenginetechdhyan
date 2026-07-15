import type { Challenge } from "./types";
import { CURATED_CHALLENGES } from "./catalog";
import { CURATED_EXTRA } from "./curated-extra";
import { generateDomainChallenges, generateCompanyChallenges } from "./generator";

/**
 * The full challenge library. Ordering:
 *   1. Hand-written CURATED_CHALLENGES (E-Commerce, 51)
 *   2. Hand-written CURATED_EXTRA (per-domain + per-company, growing)
 *   3. Generated domain seed slice (curated templates × 22 domains)
 *   4. Generated company interview seeds (3 per company)
 *
 * Generator output is de-duplicated against curated ids so hand-written
 * challenges take precedence when both exist.
 */
const domainGen = generateDomainChallenges();
const companyGen = generateCompanyChallenges();

const seen = new Set<string>();
const push = (arr: Challenge[], out: Challenge[]) => {
  for (const c of arr) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
};

const collected: Challenge[] = [];
push(CURATED_CHALLENGES, collected);
push(CURATED_EXTRA, collected);
push(domainGen, collected);
push(companyGen, collected);

// Re-number so #s are contiguous across the whole library.
let n = 0;
export const CHALLENGES: Challenge[] = collected.map((c) => ({ ...c, number: ++n }));

export const CHALLENGE_MAP: Record<string, Challenge> = Object.fromEntries(
  CHALLENGES.map((c) => [c.id, c]),
);

export const DOMAIN_CHALLENGES = domainGen;
export const COMPANY_CHALLENGES = companyGen;
export const CURATED_HANDWRITTEN = [...CURATED_CHALLENGES, ...CURATED_EXTRA];
