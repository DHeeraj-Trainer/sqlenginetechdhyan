// Adapter over legacy data files. Legacy shapes vary, so we use permissive
// types here and cast at consumption sites where necessary.
// @ts-nocheck
import { generateAllDomains } from "@/legacy/data/domainGenerator";
import { sqlChapters } from "@/legacy/data/sqlDocsData";
import {
  sqlCommandCategories,
  basicQueriesSyllabus,
  operatorDetailsSyllabus,
  aggregateFunctionsSyllabus,
} from "@/legacy/data/syllabus";

import { buildAdvancedChallenges } from "./advanced-challenges";

export type LegacyDomain = ReturnType<typeof generateAllDomains>[number];
export type LegacyChapter = (typeof sqlChapters)[number];

let cache: LegacyDomain[] | null = null;
export function getLegacyDomains(): LegacyDomain[] {
  if (!cache) {
    const domains = generateAllDomains();
    // Attach an advanced track to every domain — tough challenges the student
    // must solve in order, with in-app verification against the reference query.
    for (const d of domains) {
      (d as any).advancedQuestions = buildAdvancedChallenges(d);
    }
    cache = domains;
  }
  return cache;
}

export function getLegacyChapters() {
  return sqlChapters;
}

export const legacySyllabus = {
  categories: sqlCommandCategories,
  basicQueries: basicQueriesSyllabus,
  operators: operatorDetailsSyllabus,
  aggregates: aggregateFunctionsSyllabus,
};
