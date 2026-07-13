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

export type LegacyDomain = ReturnType<typeof generateAllDomains>[number];
export type LegacyChapter = (typeof sqlChapters)[number];

let cache: LegacyDomain[] | null = null;
export function getLegacyDomains(): LegacyDomain[] {
  if (!cache) cache = generateAllDomains();
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
