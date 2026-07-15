/**
 * Content registry — scalable, JSON-first data layer.
 *
 * Sources content from two places:
 *  1. Existing generator + curated catalog (src/features/challenges/*)
 *  2. JSON files under src/content/** (auto-loaded via import.meta.glob).
 *
 * Any new domain/topic/company/challenge JSON dropped under src/content/**
 * is picked up on the next build with no code changes. Frontends should
 * consume this registry rather than importing catalog/domain/company modules
 * directly, so new data flows through a single lens.
 */

import { CHALLENGES } from "@/features/challenges";
import { DOMAINS } from "@/features/challenges/domains";
import { COMPANIES } from "@/features/challenges/companies";
import { TOPICS } from "@/features/challenges/topics";
import type { Challenge, CompanyDef, DomainDef, Topic } from "@/features/challenges/types";

// Auto-load any JSON dropped under src/content/**. Non-fatal if the folder
// is empty — the glob returns an empty object.
const domainJson = import.meta.glob("/src/content/domains/*.json", { eager: true }) as Record<string, { default: DomainDef }>;
const topicJson = import.meta.glob("/src/content/topics/*.json", { eager: true }) as Record<string, { default: Topic }>;
const companyJson = import.meta.glob("/src/content/companies/*.json", { eager: true }) as Record<string, { default: CompanyDef }>;
const challengeJson = import.meta.glob("/src/content/challenges/*.json", { eager: true }) as Record<string, { default: Challenge }>;

function merge<T extends { id: string }>(base: T[], extras: Record<string, { default: T }>): T[] {
  const map = new Map<string, T>(base.map((x) => [x.id, x]));
  for (const mod of Object.values(extras)) {
    const item = mod.default;
    if (item?.id) map.set(item.id, item);
  }
  return Array.from(map.values());
}

export interface ContentSnapshot {
  domains: DomainDef[];
  topics: Topic[];
  companies: CompanyDef[];
  challenges: Challenge[];
  challengesById: Record<string, Challenge>;
  challengesByDomain: Record<string, Challenge[]>;
  challengesByCompany: Record<string, Challenge[]>;
  challengesByTopic: Record<string, Challenge[]>;
  challengesByDifficulty: Record<string, Challenge[]>;
}

function build(): ContentSnapshot {
  const domains = merge(DOMAINS, domainJson);
  const topics = merge(TOPICS, topicJson);
  const companies = merge(COMPANIES, companyJson);
  const challenges = merge(CHALLENGES, challengeJson);

  const byDomain: Record<string, Challenge[]> = {};
  const byCompany: Record<string, Challenge[]> = {};
  const byTopic: Record<string, Challenge[]> = {};
  const byDifficulty: Record<string, Challenge[]> = {};

  for (const c of challenges) {
    (byDomain[c.domain] ??= []).push(c);
    if (c.company) (byCompany[c.company] ??= []).push(c);
    (byTopic[c.topic] ??= []).push(c);
    (byDifficulty[c.difficulty] ??= []).push(c);
  }

  return {
    domains,
    topics,
    companies,
    challenges,
    challengesById: Object.fromEntries(challenges.map((c) => [c.id, c])),
    challengesByDomain: byDomain,
    challengesByCompany: byCompany,
    challengesByTopic: byTopic,
    challengesByDifficulty: byDifficulty,
  };
}

let cached: ContentSnapshot | null = null;
export function getContent(): ContentSnapshot {
  if (!cached) cached = build();
  return cached;
}

export function useContent(): ContentSnapshot {
  return getContent();
}
