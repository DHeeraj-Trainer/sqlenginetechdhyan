// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SQLTable {
  name: string;
  description: string;
  columns: {
    name: string;
    type: string;
    constraints?: string;
    description: string;
  }[];
  createScript: string;
  insertScript: string;
  rawRows: Record<string, any>[];
}

export interface PracticeQuestion {
  id: string; // e.g. "HC-Q01"
  text: string;
  expectedQuery: string;
  difficulty: "Beginner" | "Intermediate" | "Slightly Advanced";
  category: string; // e.g. "WHERE & Operators", "HAVING & GROUP BY"
  hints: string[];
  explanation: string;
}

export interface DomainData {
  id: string; // e.g., "healthcare"
  name: string;
  icon: string; // Lucide icon name
  businessScenario: string;
  realWorldUse: string;
  importance: string;
  tables: SQLTable[];
  questions: PracticeQuestion[];
  miniQuiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface SyllabusSection {
  id: string;
  title: string;
  duration: string;
  objectives: string[];
  content: string;
}