import { DomainData } from "../types";

export function generateFullSqlAssignmentPacket(domains: DomainData[]): string {
  let sql = `/*
================================================================================
4-HOUR ONLINE SQL BOOTCAMP: STUDENT PRACTICE ASSIGNMENT PACKET
================================================================================
Designed for Beginners to Intermediate Students
Contains ALL 10 Industry Domains with Tables, Realistic Datasets (15-20 rows each),
and Practice Questions with syntax comments.

Instructions:
1. Copy this script in its entirety into your SQL Query Editor (PostgreSQL, MySQL, SQL Server, etc.)
2. Run the DDL (CREATE TABLE) statements sequentially to initialize your schemas.
3. Run the DML (INSERT INTO) statements to load realistic business datasets.
4. Solve the practice questions using SELECT, DISTINCT, WHERE, ORDER BY, GROUP BY, HAVING, and LIMIT.
================================================================================
*/

`;

  domains.forEach((dom) => {
    sql += `\n-- ====================================================================\n`;
    sql += `-- DOMAIN: ${dom.name.toUpperCase()}\n`;
    sql += `-- Scenarios: ${dom.businessScenario}\n`;
    sql += `-- ====================================================================\n\n`;

    dom.tables.forEach((tbl) => {
      sql += `-- --- Table: ${tbl.name} (${tbl.description}) ---\n`;
      sql += `${tbl.createScript}\n\n`;
      sql += `-- --- Sample Data for table: ${tbl.name} ---\n`;
      sql += `${tbl.insertScript}\n\n`;
    });

    sql += `-- ====================================================================\n`;
    sql += `-- STUDENT PRACTICE ASSIGNMENTS FOR ${dom.name.toUpperCase()}\n`;
    sql += `-- Try writing the queries for each of these challenges:\n`;
    sql += `-- ====================================================================\n\n`;

    dom.questions.forEach((q, idx) => {
      sql += `-- [${q.id}] Complexity: ${q.difficulty} | Category: ${q.category}\n`;
      sql += `-- Question: ${q.text}\n`;
      sql += `-- Expectation Hint: ${q.hints.join(" | ")}\n`;
      sql += `-- Correct query block: \n-- ${q.expectedQuery}\n\n`;
    });

    sql += `\n-- ====================================================================\n`;
    sql += `-- MINI ASSESSMENT CHEAT SHEET FOR ${dom.name.toUpperCase()}\n`;
    dom.miniQuiz.forEach((q) => {
      sql += `-- Q: ${q.question}\n`;
      q.options.forEach((opt, oIdx) => {
        sql += `--   [${oIdx === q.correctIndex ? "X" : " "}] ${opt}\n`;
      });
      sql += `-- Explanation: ${q.explanation}\n\n`;
    });
  });

  return sql;
}
