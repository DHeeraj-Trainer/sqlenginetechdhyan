import type { Challenge, Difficulty, TopicId, InterviewRound } from "./types";

/**
 * Hand-written, interview-grade challenges. Each is a genuinely distinct
 * problem — no template rotation. Solutions target the domain schemas in
 * ./domains.ts so learners can wire real sample data and run them.
 *
 * Additions land in this file (or a per-domain sibling). The library
 * aggregator (./index.ts) re-numbers everything contiguously.
 */

interface MkArgs {
  id: string;
  title: string;
  topic: TopicId;
  difficulty: Difficulty;
  minutes: number;
  xp: number;
  domain: string;
  concepts: string[];
  tags: string[];
  problem: string;
  dbDescription: string;
  expected: string;
  hints: [string, string];
  solution: string;
  altSolution?: string;
  explanation: string;
  complexity: string;
  learned: string[];
  relatedTopics?: TopicId[];
  company?: string;
  interviewRound?: InterviewRound;
}

function mk(a: MkArgs): Challenge {
  return {
    id: a.id,
    number: 0,
    title: a.title,
    topic: a.topic,
    difficulty: a.difficulty,
    estMinutes: a.minutes,
    xp: a.xp,
    concepts: a.concepts,
    tags: a.tags,
    domain: a.domain,
    problem: a.problem,
    dbDescription: a.dbDescription,
    sampleInput: `-- Schema for ${a.domain}\n${a.dbDescription}`,
    expectedOutput: a.expected,
    starterSql: `-- ${a.title}\n`,
    hints: a.hints,
    solution: a.solution,
    altSolution: a.altSolution,
    explanation: a.explanation,
    complexity: a.complexity,
    conceptsLearned: a.learned,
    relatedTopics: a.relatedTopics,
    company: a.company,
    interviewRound: a.interviewRound,
  };
}

// ============================================================
// HEALTHCARE  · patients / appointments / doctors
// ============================================================
const HEALTHCARE_SCHEMA =
  "patients(patient_id, name, dob, gender, city, insurance)\nappointments(appointment_id, patient_id, doctor_id, appointment_date, status, fee)\ndoctors(doctor_id, name, specialty, years_experience, consultation_fee)";

const HEALTHCARE: Challenge[] = [
  mk({
    id: "hc-01", title: "Insured patients by city",
    topic: "where-filtering", difficulty: "Beginner", minutes: 4, xp: 15,
    domain: "Healthcare", concepts: ["WHERE", "IS NOT NULL", "IN"], tags: ["filter"],
    problem: "List patient_id and name of patients from Boston, New York, or Chicago whose insurance is on file. Order by name.",
    dbDescription: HEALTHCARE_SCHEMA,
    expected: "patient_id, name — sorted alphabetically by name.",
    hints: ["Combine WHERE city IN (...) with IS NOT NULL on insurance.", "ORDER BY name gives alphabetical output."],
    solution: "SELECT patient_id, name\nFROM patients\nWHERE city IN ('Boston','New York','Chicago')\n  AND insurance IS NOT NULL\nORDER BY name;",
    explanation: "IN is a compact way to test set membership; IS NOT NULL is required because = NULL never returns true.",
    complexity: "O(n)", learned: ["IN filter", "NULL semantics"],
  }),
  mk({
    id: "hc-02", title: "Appointments by status",
    topic: "group-by", difficulty: "Beginner", minutes: 5, xp: 20,
    domain: "Healthcare", concepts: ["GROUP BY", "COUNT"], tags: ["aggregation"],
    problem: "Return each appointment status and the number of appointments in that status, highest count first.",
    dbDescription: HEALTHCARE_SCHEMA,
    expected: "status, appointment_count — ordered by appointment_count DESC.",
    hints: ["Group by status.", "ORDER BY the COUNT expression."],
    solution: "SELECT status, COUNT(*) AS appointment_count\nFROM appointments\nGROUP BY status\nORDER BY appointment_count DESC;",
    explanation: "GROUP BY collapses rows sharing a key; aggregates run per group.",
    complexity: "O(n)", learned: ["Grouping", "Aggregate ordering"],
  }),
  mk({
    id: "hc-03", title: "Doctors above their specialty's average fee",
    topic: "correlated-subqueries", difficulty: "Intermediate", minutes: 8, xp: 40,
    domain: "Healthcare", concepts: ["Correlated subquery", "AVG"], tags: ["subquery","comparison"],
    problem: "Return name, specialty, and consultation_fee of every doctor whose fee is strictly greater than the average fee within the same specialty.",
    dbDescription: HEALTHCARE_SCHEMA,
    expected: "One row per doctor above their specialty average.",
    hints: ["Correlate the inner query on specialty.", "Use > (not >=) for strictly above."],
    solution: "SELECT d.name, d.specialty, d.consultation_fee\nFROM doctors d\nWHERE d.consultation_fee > (\n  SELECT AVG(d2.consultation_fee)\n  FROM doctors d2\n  WHERE d2.specialty = d.specialty\n);",
    altSolution: "SELECT name, specialty, consultation_fee\nFROM (\n  SELECT name, specialty, consultation_fee,\n         AVG(consultation_fee) OVER (PARTITION BY specialty) AS avg_fee\n  FROM doctors\n) x\nWHERE consultation_fee > avg_fee;",
    explanation: "The correlated subquery recomputes AVG per specialty. The window-function alternative is usually faster on large tables.",
    complexity: "O(n²) correlated / O(n log n) window",
    learned: ["Correlated subqueries", "Group-relative comparison"],
    relatedTopics: ["window-functions","partition-by"],
  }),
  mk({
    id: "hc-04", title: "No-show rate per city",
    topic: "case-when", difficulty: "Intermediate", minutes: 10, xp: 45,
    domain: "Healthcare", concepts: ["JOIN", "CASE", "AVG"], tags: ["rate","case"],
    problem: "For each city, compute the percentage of appointments with status 'No-show'. Only include cities with at least 20 appointments. Round to 2 decimal places, highest rate first.",
    dbDescription: HEALTHCARE_SCHEMA,
    expected: "city, no_show_pct — rate as a percentage 0–100.",
    hints: ["AVG(CASE WHEN status='No-show' THEN 1.0 ELSE 0 END) gives the fraction.", "Multiply by 100 and use ROUND(..., 2)."],
    solution: "SELECT p.city,\n       ROUND(100.0 * AVG(CASE WHEN a.status='No-show' THEN 1.0 ELSE 0 END), 2) AS no_show_pct\nFROM appointments a\nJOIN patients p ON p.patient_id = a.patient_id\nGROUP BY p.city\nHAVING COUNT(*) >= 20\nORDER BY no_show_pct DESC;",
    explanation: "Boolean-to-numeric via CASE lets AVG produce a rate. HAVING filters small groups where the percentage is noisy.",
    complexity: "O(n)", learned: ["CASE in aggregates", "HAVING for noise-filtering"],
  }),
  mk({
    id: "hc-05", title: "Top 3 doctors by revenue per specialty",
    topic: "window-functions", difficulty: "Advanced", minutes: 12, xp: 60,
    domain: "Healthcare", concepts: ["ROW_NUMBER", "PARTITION BY", "SUM"], tags: ["window","top-n"],
    problem: "Rank doctors within each specialty by total completed-appointment revenue (SUM of fee where status='Completed'). Return the top 3 per specialty as: specialty, doctor_name, revenue, rank_in_specialty.",
    dbDescription: HEALTHCARE_SCHEMA,
    expected: "specialty, doctor_name, revenue, rank_in_specialty (1..3).",
    hints: ["Aggregate revenue per (specialty, doctor) first with a CTE.", "Use ROW_NUMBER() OVER (PARTITION BY specialty ORDER BY revenue DESC)."],
    solution: "WITH rev AS (\n  SELECT d.specialty, d.name AS doctor_name, SUM(a.fee) AS revenue\n  FROM doctors d\n  JOIN appointments a ON a.doctor_id = d.doctor_id\n  WHERE a.status = 'Completed'\n  GROUP BY d.specialty, d.name\n),\nranked AS (\n  SELECT specialty, doctor_name, revenue,\n         ROW_NUMBER() OVER (PARTITION BY specialty ORDER BY revenue DESC) AS rank_in_specialty\n  FROM rev\n)\nSELECT * FROM ranked WHERE rank_in_specialty <= 3\nORDER BY specialty, rank_in_specialty;",
    explanation: "Two-stage pattern: aggregate first, then rank inside partitions. ROW_NUMBER breaks ties deterministically; use DENSE_RANK if you want to include ties.",
    complexity: "O(n log n)", learned: ["Top-N per group", "Window functions"],
  }),
  mk({
    id: "hc-06", title: "Patients with 3+ completed visits in the same month",
    topic: "having", difficulty: "Advanced", minutes: 10, xp: 55,
    domain: "Healthcare", concepts: ["GROUP BY", "strftime", "HAVING"], tags: ["cohort"],
    problem: "Find patients who had 3 or more Completed appointments within a single calendar month. Return patient_id, month (YYYY-MM), and visit_count. Sort by visit_count DESC, then month.",
    dbDescription: HEALTHCARE_SCHEMA,
    expected: "patient_id, month, visit_count where visit_count >= 3.",
    hints: ["Extract month with strftime('%Y-%m', appointment_date) (SQLite) or DATE_FORMAT (MySQL).", "GROUP BY (patient, month), filter with HAVING COUNT(*) >= 3."],
    solution: "SELECT patient_id,\n       strftime('%Y-%m', appointment_date) AS month,\n       COUNT(*) AS visit_count\nFROM appointments\nWHERE status = 'Completed'\nGROUP BY patient_id, strftime('%Y-%m', appointment_date)\nHAVING COUNT(*) >= 3\nORDER BY visit_count DESC, month;",
    explanation: "HAVING filters group-level results — you can't use WHERE with an aggregate. Month bucketing via strftime is portable across SQLite; MySQL uses DATE_FORMAT.",
    complexity: "O(n)", learned: ["Date bucketing", "HAVING vs WHERE"],
  }),
];

// ============================================================
// BANKING  · customers / transactions / accounts
// ============================================================
const BANKING_SCHEMA =
  "customers(customer_id, name, city, credit_score, occupation)\ntransactions(txn_id, customer_id, account_id, txn_date, amount, txn_type)\naccounts(account_id, customer_id, account_type, balance, opened_at)";

const BANKING: Challenge[] = [
  mk({
    id: "bk-01", title: "High credit-score customers",
    topic: "where-filtering", difficulty: "Beginner", minutes: 3, xp: 15,
    domain: "Banking", concepts: ["WHERE", "range"], tags: ["filter"],
    problem: "List customer_id, name, and credit_score for customers with credit_score between 750 and 850, sorted highest score first.",
    dbDescription: BANKING_SCHEMA,
    expected: "customer_id, name, credit_score — descending by credit_score.",
    hints: ["BETWEEN is inclusive on both endpoints.", "ORDER BY … DESC for descending."],
    solution: "SELECT customer_id, name, credit_score\nFROM customers\nWHERE credit_score BETWEEN 750 AND 850\nORDER BY credit_score DESC;",
    explanation: "BETWEEN a AND b is equivalent to >= a AND <= b — inclusive.",
    complexity: "O(n)", learned: ["Range filters"],
  }),
  mk({
    id: "bk-02", title: "Total deposits per account type",
    topic: "group-by", difficulty: "Beginner", minutes: 5, xp: 20,
    domain: "Banking", concepts: ["JOIN", "GROUP BY", "SUM"], tags: ["aggregation"],
    problem: "For each account_type, return the total amount deposited (txn_type = 'Deposit'). Order by total DESC.",
    dbDescription: BANKING_SCHEMA,
    expected: "account_type, total_deposits.",
    hints: ["Filter transactions to txn_type='Deposit' first.", "JOIN accounts to pull account_type."],
    solution: "SELECT a.account_type, SUM(t.amount) AS total_deposits\nFROM transactions t\nJOIN accounts a ON a.account_id = t.account_id\nWHERE t.txn_type = 'Deposit'\nGROUP BY a.account_type\nORDER BY total_deposits DESC;",
    explanation: "Filter before aggregation to keep the group totals honest.",
    complexity: "O(n)", learned: ["Filtered aggregation"],
  }),
  mk({
    id: "bk-03", title: "Customer 30-day activity",
    topic: "date-functions", difficulty: "Intermediate", minutes: 8, xp: 40,
    domain: "Banking", concepts: ["Date arithmetic", "COUNT", "AVG"], tags: ["date","aggregation"],
    problem: "For each customer, return customer_id, txn_count, and avg_amount for transactions in the last 30 days. Exclude customers with no recent transactions.",
    dbDescription: BANKING_SCHEMA,
    expected: "customer_id, txn_count, avg_amount.",
    hints: ["Filter txn_date >= date('now','-30 day') (SQLite) / DATE_SUB(CURDATE(), INTERVAL 30 DAY) (MySQL).", "GROUP BY customer_id."],
    solution: "SELECT customer_id,\n       COUNT(*) AS txn_count,\n       ROUND(AVG(amount), 2) AS avg_amount\nFROM transactions\nWHERE txn_date >= date('now','-30 day')\nGROUP BY customer_id;",
    explanation: "Rolling windows are typically expressed as an anchor point minus an interval. Filtering before GROUP BY is what makes 'no recent transactions' drop out.",
    complexity: "O(n)", learned: ["Rolling date filters"],
  }),
  mk({
    id: "bk-04", title: "Month-over-month balance drops",
    topic: "lag", difficulty: "Intermediate", minutes: 12, xp: 55,
    domain: "Banking", concepts: ["LAG", "PARTITION BY", "date bucket"], tags: ["window","trend"],
    problem: "For each account, compute end-of-month balance (last balance snapshot per month, approximated as SUM of net transactions up to month end). Return account_id, month, balance, prev_balance, and delta for months where the balance decreased vs the previous month.",
    dbDescription: BANKING_SCHEMA,
    expected: "account_id, month, balance, prev_balance, delta (negative).",
    hints: ["Bucket transactions by month, sum by account cumulatively.", "LAG(balance) OVER (PARTITION BY account_id ORDER BY month) gives the previous month's value."],
    solution: "WITH monthly AS (\n  SELECT account_id,\n         strftime('%Y-%m', txn_date) AS month,\n         SUM(CASE WHEN txn_type IN ('Deposit') THEN amount\n                  WHEN txn_type IN ('Withdrawal','Fee') THEN -amount\n                  ELSE 0 END) AS net\n  FROM transactions\n  GROUP BY account_id, strftime('%Y-%m', txn_date)\n),\nrun AS (\n  SELECT account_id, month,\n         SUM(net) OVER (PARTITION BY account_id ORDER BY month\n                        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance\n  FROM monthly\n)\nSELECT account_id, month, balance,\n       LAG(balance) OVER (PARTITION BY account_id ORDER BY month) AS prev_balance,\n       balance - LAG(balance) OVER (PARTITION BY account_id ORDER BY month) AS delta\nFROM run\nQUALIFY delta < 0;",
    altSolution: "-- Portable alternative without QUALIFY:\nSELECT * FROM (\n  /* same run + LAG subquery as above */\n) x WHERE delta < 0;",
    explanation: "QUALIFY filters on window results directly. Not all engines support it; wrap in a subquery when needed.",
    complexity: "O(n log n)", learned: ["LAG", "Running sums", "QUALIFY"],
  }),
  mk({
    id: "bk-05", title: "Rapid-fire withdrawals — fraud signal",
    topic: "window-functions", difficulty: "Advanced", minutes: 15, xp: 70,
    domain: "Banking", concepts: ["COUNT window", "RANGE BETWEEN"], tags: ["fraud","window"],
    problem: "Find every (account_id, txn_id) that is part of a burst of 5 or more Withdrawal transactions on the same account within a rolling 24-hour window. Return account_id, txn_id, txn_date.",
    dbDescription: BANKING_SCHEMA,
    expected: "One row per suspicious transaction.",
    hints: ["Store txn_date as timestamp seconds so RANGE BETWEEN works.", "COUNT(*) OVER (PARTITION BY account_id ORDER BY ts RANGE BETWEEN 86400 PRECEDING AND CURRENT ROW) — filter counts >= 5."],
    solution: "WITH w AS (\n  SELECT account_id, txn_id, txn_date,\n         strftime('%s', txn_date) AS ts\n  FROM transactions\n  WHERE txn_type = 'Withdrawal'\n)\nSELECT account_id, txn_id, txn_date FROM (\n  SELECT account_id, txn_id, txn_date,\n         COUNT(*) OVER (\n           PARTITION BY account_id\n           ORDER BY CAST(ts AS INTEGER)\n           RANGE BETWEEN 86400 PRECEDING AND CURRENT ROW\n         ) AS burst\n  FROM w\n) x WHERE burst >= 5\nORDER BY account_id, txn_date;",
    explanation: "RANGE BETWEEN with a numeric offset lets a window span a real time interval, not a row count. 86 400 seconds = 24 hours.",
    complexity: "O(n log n)", learned: ["Time-range windows", "Fraud detection pattern"],
  }),
  mk({
    id: "bk-06", title: "Running balance per account",
    topic: "window-functions", difficulty: "Advanced", minutes: 10, xp: 55,
    domain: "Banking", concepts: ["SUM OVER", "signed amount"], tags: ["window","running-total"],
    problem: "For each transaction on account_id = 42, return txn_date, amount (signed: +deposit / −withdrawal / −fee, 0 otherwise), and the running balance after that transaction.",
    dbDescription: BANKING_SCHEMA,
    expected: "txn_date, signed_amount, running_balance.",
    hints: ["Build the signed amount with CASE first.", "SUM OVER (ORDER BY txn_date ROWS UNBOUNDED PRECEDING) gives a running total."],
    solution: "SELECT txn_date,\n       CASE WHEN txn_type = 'Deposit' THEN amount\n            WHEN txn_type IN ('Withdrawal','Fee') THEN -amount\n            ELSE 0 END AS signed_amount,\n       SUM(CASE WHEN txn_type = 'Deposit' THEN amount\n                WHEN txn_type IN ('Withdrawal','Fee') THEN -amount\n                ELSE 0 END)\n         OVER (ORDER BY txn_date ROWS UNBOUNDED PRECEDING) AS running_balance\nFROM transactions\nWHERE account_id = 42\nORDER BY txn_date;",
    explanation: "Running totals are the canonical use case for SUM OVER with an unbounded-preceding frame.",
    complexity: "O(n log n)", learned: ["Running totals"],
  }),
];

// ============================================================
// HR  · employees / attendance / projects
// ============================================================
const HR_SCHEMA =
  "employees(employee_id, name, department, hire_date, salary, manager_id)\nattendance(record_id, employee_id, work_date, hours, project_id, status)\nprojects(project_id, name, department, budget, status)";

const HR: Challenge[] = [
  mk({
    id: "hr-01", title: "2023 engineering hires",
    topic: "where-filtering", difficulty: "Beginner", minutes: 3, xp: 15,
    domain: "Human Resources", concepts: ["date range", "AND"], tags: ["filter","date"],
    problem: "Return employee_id, name, and hire_date for every employee in the 'Engineering' department hired during 2023.",
    dbDescription: HR_SCHEMA,
    expected: "Engineering hires with hire_date in 2023.",
    hints: ["hire_date >= '2023-01-01' AND hire_date < '2024-01-01'.", "Combine with department = 'Engineering'."],
    solution: "SELECT employee_id, name, hire_date\nFROM employees\nWHERE department = 'Engineering'\n  AND hire_date >= '2023-01-01'\n  AND hire_date <  '2024-01-01'\nORDER BY hire_date;",
    explanation: "Half-open date ranges (>= start, < end-of-next) are safer than BETWEEN when times are stored — no accidental boundary omissions.",
    complexity: "O(n)", learned: ["Half-open date ranges"],
  }),
  mk({
    id: "hr-02", title: "Payroll by department",
    topic: "group-by", difficulty: "Beginner", minutes: 4, xp: 20,
    domain: "Human Resources", concepts: ["SUM", "GROUP BY"], tags: ["aggregation"],
    problem: "Return each department, total salary, and headcount. Sort by total salary descending.",
    dbDescription: HR_SCHEMA,
    expected: "department, total_salary, headcount.",
    hints: ["COUNT(*) for headcount.", "GROUP BY department."],
    solution: "SELECT department,\n       SUM(salary)  AS total_salary,\n       COUNT(*)     AS headcount\nFROM employees\nGROUP BY department\nORDER BY total_salary DESC;",
    explanation: "SUM and COUNT are both aggregates and can appear in the same SELECT.",
    complexity: "O(n)", learned: ["Multi-aggregate GROUP BY"],
  }),
  mk({
    id: "hr-03", title: "Employees earning more than their manager",
    topic: "self-join", difficulty: "Intermediate", minutes: 8, xp: 45,
    domain: "Human Resources", concepts: ["Self-join", "manager_id"], tags: ["self-join","hierarchy"],
    problem: "Return the name and salary of each employee whose salary is strictly greater than their manager's salary, along with the manager's name.",
    dbDescription: HR_SCHEMA,
    expected: "employee_name, employee_salary, manager_name, manager_salary.",
    hints: ["Join employees to itself on e.manager_id = m.employee_id.", "Compare salaries in WHERE."],
    solution: "SELECT e.name    AS employee_name,\n       e.salary  AS employee_salary,\n       m.name    AS manager_name,\n       m.salary  AS manager_salary\nFROM employees e\nJOIN employees m ON m.employee_id = e.manager_id\nWHERE e.salary > m.salary\nORDER BY e.salary DESC;",
    explanation: "A self-join treats one table as two logical rows — the alias is what disambiguates them.",
    complexity: "O(n)", learned: ["Self-joins", "Hierarchical comparisons"],
  }),
  mk({
    id: "hr-04", title: "Average hours per project",
    topic: "multi-table-joins", difficulty: "Intermediate", minutes: 7, xp: 40,
    domain: "Human Resources", concepts: ["JOIN", "AVG"], tags: ["join","aggregation"],
    problem: "For each Active project, return project name and the average daily hours logged against it. Exclude projects with fewer than 10 attendance rows.",
    dbDescription: HR_SCHEMA,
    expected: "project_name, avg_hours (rounded to 2).",
    hints: ["JOIN attendance to projects on project_id.", "Filter projects.status='Active' and HAVING COUNT(*) >= 10."],
    solution: "SELECT p.name AS project_name,\n       ROUND(AVG(a.hours), 2) AS avg_hours\nFROM attendance a\nJOIN projects p ON p.project_id = a.project_id\nWHERE p.status = 'Active'\nGROUP BY p.name\nHAVING COUNT(*) >= 10\nORDER BY avg_hours DESC;",
    explanation: "Rounding at the reporting boundary keeps intermediate precision. HAVING is applied after aggregation.",
    complexity: "O(n)", learned: ["JOIN + GROUP + HAVING"],
  }),
  mk({
    id: "hr-05", title: "Second highest salary per department",
    topic: "dense-rank", difficulty: "Advanced", minutes: 10, xp: 55,
    domain: "Human Resources", concepts: ["DENSE_RANK", "PARTITION BY"], tags: ["window","top-n","interview"],
    problem: "Return the second-highest distinct salary in each department, along with everyone earning it. Columns: department, name, salary.",
    dbDescription: HR_SCHEMA,
    expected: "One row per employee tied at rank 2 within their department.",
    hints: ["DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) treats ties as one rank.", "Filter rank = 2 in an outer query."],
    solution: "WITH r AS (\n  SELECT department, name, salary,\n         DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rk\n  FROM employees\n)\nSELECT department, name, salary\nFROM r\nWHERE rk = 2\nORDER BY department, salary DESC;",
    explanation: "DENSE_RANK is preferred over ROW_NUMBER for 'Nth distinct salary' because it collapses ties into one rank.",
    complexity: "O(n log n)", learned: ["DENSE_RANK vs ROW_NUMBER", "Second-highest pattern"],
  }),
  mk({
    id: "hr-06", title: "Sick leave clusters",
    topic: "window-functions", difficulty: "Advanced", minutes: 13, xp: 65,
    domain: "Human Resources", concepts: ["COUNT window", "RANGE"], tags: ["window","time-range"],
    problem: "Identify employees who took 5 or more Sick days within any rolling 30-day window. Return employee_id and the first sick date in each cluster.",
    dbDescription: HR_SCHEMA,
    expected: "employee_id, cluster_start.",
    hints: ["Filter to sick days, then COUNT(*) OVER (PARTITION BY employee_id ORDER BY work_date_epoch RANGE BETWEEN 30*86400 PRECEDING AND CURRENT ROW).", "Take MIN(work_date) per employee where count >= 5."],
    solution: "WITH sick AS (\n  SELECT employee_id, work_date,\n         CAST(strftime('%s', work_date) AS INTEGER) AS ts\n  FROM attendance WHERE status = 'Sick'\n),\nwin AS (\n  SELECT employee_id, work_date,\n         COUNT(*) OVER (PARTITION BY employee_id ORDER BY ts\n                        RANGE BETWEEN 2592000 PRECEDING AND CURRENT ROW) AS cnt\n  FROM sick\n)\nSELECT employee_id, MIN(work_date) AS cluster_start\nFROM win WHERE cnt >= 5\nGROUP BY employee_id;",
    explanation: "Time-range windows measured in seconds compose cleanly with epoch timestamps. 2 592 000 s = 30 days.",
    complexity: "O(n log n)", learned: ["Rolling counts", "Epoch-based windows"],
  }),
];

// ============================================================
// FINANCE  · investors / trades / securities
// ============================================================
const FIN_SCHEMA =
  "investors(investor_id, name, country, risk_profile, join_date)\ntrades(trade_id, investor_id, security_id, trade_time, quantity, price, side)\nsecurities(security_id, symbol, sector, last_price, market_cap)";

const FINANCE: Challenge[] = [
  mk({
    id: "fn-01", title: "Today's trades",
    topic: "date-functions", difficulty: "Beginner", minutes: 3, xp: 15,
    domain: "Finance", concepts: ["DATE()", "WHERE"], tags: ["filter","date"],
    problem: "Return trade_id, investor_id, symbol, and price for every trade whose trade_time falls on today's date.",
    dbDescription: FIN_SCHEMA,
    expected: "One row per today's trade with the symbol joined in.",
    hints: ["DATE(trade_time) = DATE('now') is portable in SQLite.", "JOIN securities to expose symbol."],
    solution: "SELECT t.trade_id, t.investor_id, s.symbol, t.price\nFROM trades t\nJOIN securities s ON s.security_id = t.security_id\nWHERE DATE(t.trade_time) = DATE('now')\nORDER BY t.trade_time DESC;",
    explanation: "Applying DATE() to both sides is safe but non-sargable; on hot paths, prefer a half-open range on trade_time.",
    complexity: "O(n)", learned: ["Date truncation", "Sargability"],
  }),
  mk({
    id: "fn-02", title: "Buy volume per security",
    topic: "group-by", difficulty: "Beginner", minutes: 4, xp: 20,
    domain: "Finance", concepts: ["SUM", "filtered aggregate"], tags: ["aggregation"],
    problem: "For each security, return symbol and total buy quantity (side='Buy'). Order by total quantity descending. Include securities with zero buys as 0.",
    dbDescription: FIN_SCHEMA,
    expected: "symbol, buy_quantity.",
    hints: ["LEFT JOIN securities to trades to keep zero-buy securities.", "SUM(CASE WHEN side='Buy' THEN quantity ELSE 0 END)."],
    solution: "SELECT s.symbol,\n       COALESCE(SUM(CASE WHEN t.side='Buy' THEN t.quantity ELSE 0 END), 0) AS buy_quantity\nFROM securities s\nLEFT JOIN trades t ON t.security_id = s.security_id\nGROUP BY s.symbol\nORDER BY buy_quantity DESC;",
    explanation: "LEFT JOIN preserves the left side even when the right has no matches — COALESCE turns NULL sums into 0.",
    complexity: "O(n)", learned: ["Filtered aggregation", "Zero-preserving joins"],
  }),
  mk({
    id: "fn-03", title: "Investor PnL by sector",
    topic: "case-when", difficulty: "Intermediate", minutes: 10, xp: 45,
    domain: "Finance", concepts: ["JOIN", "signed CASE"], tags: ["pnl"],
    problem: "For each (investor, sector) pair, compute signed cash flow: SUM(quantity*price) with Buys negative and Sells positive. Return investor_id, sector, pnl. Only include rows where |pnl| > 0.",
    dbDescription: FIN_SCHEMA,
    expected: "investor_id, sector, pnl.",
    hints: ["SUM(CASE side WHEN 'Buy' THEN -quantity*price ELSE quantity*price END).", "GROUP BY investor_id, sector."],
    solution: "SELECT t.investor_id, s.sector,\n       SUM(CASE t.side WHEN 'Buy'  THEN -t.quantity*t.price\n                       WHEN 'Sell' THEN  t.quantity*t.price\n                       ELSE 0 END) AS pnl\nFROM trades t\nJOIN securities s ON s.security_id = t.security_id\nGROUP BY t.investor_id, s.sector\nHAVING ABS(SUM(CASE t.side WHEN 'Buy'  THEN -t.quantity*t.price\n                             WHEN 'Sell' THEN  t.quantity*t.price ELSE 0 END)) > 0\nORDER BY t.investor_id, pnl DESC;",
    explanation: "Cash flow is the trade-level building block for PnL. Use HAVING with the same expression (or wrap in a CTE) when you need to filter on an aggregate.",
    complexity: "O(n)", learned: ["Signed CASE aggregates"],
  }),
  mk({
    id: "fn-04", title: "Top 5 securities last week",
    topic: "limit-offset", difficulty: "Intermediate", minutes: 6, xp: 35,
    domain: "Finance", concepts: ["Date range", "ORDER BY", "LIMIT"], tags: ["ranking"],
    problem: "Return the 5 symbols with the highest total traded quantity during the last 7 days (excluding today). Columns: symbol, quantity_traded.",
    dbDescription: FIN_SCHEMA,
    expected: "5 rows sorted by quantity_traded DESC.",
    hints: ["trade_time >= DATE('now','-7 day') AND trade_time < DATE('now').", "GROUP BY symbol, ORDER BY total DESC, LIMIT 5."],
    solution: "SELECT s.symbol, SUM(t.quantity) AS quantity_traded\nFROM trades t\nJOIN securities s ON s.security_id = t.security_id\nWHERE t.trade_time >= DATE('now','-7 day')\n  AND t.trade_time <  DATE('now')\nGROUP BY s.symbol\nORDER BY quantity_traded DESC\nLIMIT 5;",
    explanation: "'Last 7 days excluding today' is the analyst's standard reporting window — it avoids partial-day skew.",
    complexity: "O(n)", learned: ["Reporting windows", "LIMIT top-N"],
  }),
  mk({
    id: "fn-05", title: "Consecutive up-days streak",
    topic: "lag", difficulty: "Advanced", minutes: 14, xp: 65,
    domain: "Finance", concepts: ["LAG", "gaps-and-islands"], tags: ["window","streak"],
    problem: "For symbol 'ACME', find the longest run of consecutive trading days where the daily average trade price strictly increased vs the prior day. Return the streak's start_date, end_date, and length_days.",
    dbDescription: FIN_SCHEMA,
    expected: "start_date, end_date, length_days for the single longest streak.",
    hints: ["Aggregate to daily avg first.", "Use LAG + a group key (ROW_NUMBER - streak_id) to identify consecutive runs."],
    solution: "WITH daily AS (\n  SELECT DATE(trade_time) AS d, AVG(price) AS avg_p\n  FROM trades t\n  JOIN securities s ON s.security_id = t.security_id\n  WHERE s.symbol = 'ACME'\n  GROUP BY DATE(trade_time)\n),\nflagged AS (\n  SELECT d, avg_p,\n         CASE WHEN avg_p > LAG(avg_p) OVER (ORDER BY d) THEN 1 ELSE 0 END AS up\n  FROM daily\n),\ngrouped AS (\n  SELECT d, up,\n         SUM(CASE WHEN up = 0 THEN 1 ELSE 0 END) OVER (ORDER BY d) AS grp\n  FROM flagged\n)\nSELECT MIN(d) AS start_date, MAX(d) AS end_date, COUNT(*) AS length_days\nFROM grouped\nWHERE up = 1\nGROUP BY grp\nORDER BY length_days DESC\nLIMIT 1;",
    explanation: "Classic gaps-and-islands: assign a bucket that increments every time the streak breaks, then aggregate per bucket.",
    complexity: "O(n log n)", learned: ["Gaps-and-islands", "LAG for streaks"],
  }),
  mk({
    id: "fn-06", title: "Investor portfolio value over time",
    topic: "window-functions", difficulty: "Advanced", minutes: 12, xp: 60,
    domain: "Finance", concepts: ["SUM OVER", "signed quantity"], tags: ["portfolio","window"],
    problem: "For investor_id = 7, compute the cumulative dollar value of holdings after each trade: sum of (signed_quantity * price) where Buy is positive and Sell is negative. Return trade_time, symbol, delta, portfolio_value.",
    dbDescription: FIN_SCHEMA,
    expected: "Rows sorted by trade_time with a running total.",
    hints: ["Signed quantity = CASE side WHEN 'Buy' THEN quantity ELSE -quantity END.", "SUM OVER (ORDER BY trade_time ROWS UNBOUNDED PRECEDING)."],
    solution: "WITH t AS (\n  SELECT tr.trade_time, s.symbol,\n         CASE tr.side WHEN 'Buy' THEN tr.quantity ELSE -tr.quantity END * tr.price AS delta\n  FROM trades tr\n  JOIN securities s ON s.security_id = tr.security_id\n  WHERE tr.investor_id = 7\n)\nSELECT trade_time, symbol, delta,\n       SUM(delta) OVER (ORDER BY trade_time ROWS UNBOUNDED PRECEDING) AS portfolio_value\nFROM t\nORDER BY trade_time;",
    explanation: "Running totals over signed values are the workhorse of portfolio and inventory analytics.",
    complexity: "O(n log n)", learned: ["Running signed totals"],
  }),
];

// ============================================================
// RETAIL  · customers / sales / products
// ============================================================
const RETAIL_SCHEMA =
  "customers(customer_id, name, city, membership_level, join_date)\nsales(sale_id, customer_id, product_id, sale_date, quantity, total_amount, status)\nproducts(product_id, name, category, price, stock)";

const RETAIL: Challenge[] = [
  mk({
    id: "rt-01", title: "Low-stock products",
    topic: "where-filtering", difficulty: "Beginner", minutes: 3, xp: 15,
    domain: "Retail", concepts: ["WHERE", "ORDER BY"], tags: ["filter","inventory"],
    problem: "List product_id, name, category, and stock for products with stock < 10, sorted by stock ascending (lowest first).",
    dbDescription: RETAIL_SCHEMA,
    expected: "Products at risk of running out.",
    hints: ["Simple WHERE stock < 10.", "ORDER BY stock ASC."],
    solution: "SELECT product_id, name, category, stock\nFROM products\nWHERE stock < 10\nORDER BY stock ASC;",
    explanation: "Numeric filtering is straightforward — sorting ascending puts the most urgent items first.",
    complexity: "O(n)", learned: ["Sorted filters"],
  }),
  mk({
    id: "rt-02", title: "Category revenue",
    topic: "group-by", difficulty: "Beginner", minutes: 5, xp: 20,
    domain: "Retail", concepts: ["JOIN", "SUM"], tags: ["aggregation"],
    problem: "For each product category, return total revenue from Paid sales only, sorted descending.",
    dbDescription: RETAIL_SCHEMA,
    expected: "category, revenue.",
    hints: ["Filter sales.status='Paid'.", "JOIN products to get category."],
    solution: "SELECT p.category, SUM(s.total_amount) AS revenue\nFROM sales s\nJOIN products p ON p.product_id = s.product_id\nWHERE s.status = 'Paid'\nGROUP BY p.category\nORDER BY revenue DESC;",
    explanation: "Aggregating post-filter avoids inflating totals with refunds or pending orders.",
    complexity: "O(n)", learned: ["Filtered totals"],
  }),
  mk({
    id: "rt-03", title: "Refund rate per category",
    topic: "case-when", difficulty: "Intermediate", minutes: 8, xp: 40,
    domain: "Retail", concepts: ["CASE", "AVG"], tags: ["rate"],
    problem: "For each category, compute the refund rate as (refunded orders / total orders) * 100, rounded to 2 decimals. Only include categories with at least 50 orders.",
    dbDescription: RETAIL_SCHEMA,
    expected: "category, refund_pct.",
    hints: ["AVG(CASE WHEN status='Refunded' THEN 1.0 ELSE 0 END).", "HAVING COUNT(*) >= 50."],
    solution: "SELECT p.category,\n       ROUND(100.0 * AVG(CASE WHEN s.status='Refunded' THEN 1.0 ELSE 0 END), 2) AS refund_pct\nFROM sales s\nJOIN products p ON p.product_id = s.product_id\nGROUP BY p.category\nHAVING COUNT(*) >= 50\nORDER BY refund_pct DESC;",
    explanation: "Averaging a boolean CASE is the idiomatic way to compute a rate in a single pass.",
    complexity: "O(n)", learned: ["Boolean AVG", "Statistical significance filter"],
  }),
  mk({
    id: "rt-04", title: "Repeat customers",
    topic: "having", difficulty: "Intermediate", minutes: 6, xp: 35,
    domain: "Retail", concepts: ["HAVING", "COUNT"], tags: ["cohort"],
    problem: "Return customers who placed strictly more than 1 Paid order. Columns: customer_id, name, order_count. Sort by order_count DESC.",
    dbDescription: RETAIL_SCHEMA,
    expected: "Multi-order customers only.",
    hints: ["JOIN customers to sales.", "HAVING COUNT(*) > 1."],
    solution: "SELECT c.customer_id, c.name, COUNT(*) AS order_count\nFROM customers c\nJOIN sales s ON s.customer_id = c.customer_id\nWHERE s.status = 'Paid'\nGROUP BY c.customer_id, c.name\nHAVING COUNT(*) > 1\nORDER BY order_count DESC;",
    explanation: "HAVING is applied after the aggregate is computed — the correct place to filter on COUNT.",
    complexity: "O(n)", learned: ["Repeat-purchase cohort"],
  }),
  mk({
    id: "rt-05", title: "Rank products with ties",
    topic: "dense-rank", difficulty: "Advanced", minutes: 8, xp: 50,
    domain: "Retail", concepts: ["DENSE_RANK", "PARTITION BY"], tags: ["window","ranking"],
    problem: "Within each category, rank products by total Paid revenue (highest = 1). Products tied on revenue share a rank. Return category, product_name, revenue, rank_in_category.",
    dbDescription: RETAIL_SCHEMA,
    expected: "Full ranking per category with ties collapsed.",
    hints: ["Aggregate to (category, product) first.", "DENSE_RANK to collapse ties."],
    solution: "WITH rev AS (\n  SELECT p.category, p.name AS product_name, SUM(s.total_amount) AS revenue\n  FROM sales s\n  JOIN products p ON p.product_id = s.product_id\n  WHERE s.status = 'Paid'\n  GROUP BY p.category, p.name\n)\nSELECT category, product_name, revenue,\n       DENSE_RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rank_in_category\nFROM rev\nORDER BY category, rank_in_category;",
    explanation: "DENSE_RANK preserves the ordinal meaning — two rank-1 products means no rank-2 gap; the next is rank 2. ROW_NUMBER would break ties arbitrarily.",
    complexity: "O(n log n)", learned: ["Ties and ranking"],
  }),
  mk({
    id: "rt-06", title: "3-month rolling revenue",
    topic: "window-functions", difficulty: "Advanced", minutes: 12, xp: 60,
    domain: "Retail", concepts: ["SUM OVER ROWS BETWEEN"], tags: ["window","rolling"],
    problem: "For each (category, month), compute the 3-month rolling revenue (current month + prior two). Return category, month, revenue, rolling_3mo.",
    dbDescription: RETAIL_SCHEMA,
    expected: "One row per (category, month) with the rolling total.",
    hints: ["Aggregate to (category, month) with strftime('%Y-%m').", "SUM OVER (PARTITION BY category ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)."],
    solution: "WITH m AS (\n  SELECT p.category,\n         strftime('%Y-%m', s.sale_date) AS month,\n         SUM(s.total_amount) AS revenue\n  FROM sales s\n  JOIN products p ON p.product_id = s.product_id\n  WHERE s.status = 'Paid'\n  GROUP BY p.category, strftime('%Y-%m', s.sale_date)\n)\nSELECT category, month, revenue,\n       SUM(revenue) OVER (PARTITION BY category ORDER BY month\n                          ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling_3mo\nFROM m\nORDER BY category, month;",
    explanation: "ROWS BETWEEN N PRECEDING assumes contiguous rows — safe here because monthly buckets are dense. For sparse data, prefer RANGE with an interval.",
    complexity: "O(n log n)", learned: ["Rolling aggregates"],
  }),
];

// ============================================================
// COMPANY — AMAZON (uses Retail schema)
// ============================================================
const AMAZON: Challenge[] = [
  mk({
    id: "co-amazon-01", title: "Amazon · Weekly gross sales",
    topic: "date-functions", difficulty: "Interview", minutes: 6, xp: 30,
    domain: "Retail", company: "Amazon", interviewRound: "Screen",
    concepts: ["date bucket", "SUM"], tags: ["amazon","reporting"],
    problem: "Report gross Paid revenue per ISO week for the last 12 weeks. Columns: week_start (Monday of week), gross_revenue.",
    dbDescription: RETAIL_SCHEMA,
    expected: "12 rows, chronological.",
    hints: ["Compute week_start with date(sale_date, 'weekday 1', '-7 day') (SQLite).", "Filter to the last 12 weeks."],
    solution: "SELECT DATE(sale_date, 'weekday 1', '-7 day') AS week_start,\n       SUM(total_amount) AS gross_revenue\nFROM sales\nWHERE status = 'Paid'\n  AND sale_date >= DATE('now','-84 day')\nGROUP BY DATE(sale_date, 'weekday 1', '-7 day')\nORDER BY week_start;",
    explanation: "Aligning to Monday-of-week gives a reproducible bucket. Retailers report on ISO weeks so period-over-period comparisons stay honest.",
    complexity: "O(n)", learned: ["ISO week bucketing"],
  }),
  mk({
    id: "co-amazon-02", title: "Amazon · New vs returning revenue split",
    topic: "cte", difficulty: "Interview", minutes: 12, xp: 55,
    domain: "Retail", company: "Amazon", interviewRound: "Phone",
    concepts: ["CTE", "first purchase"], tags: ["amazon","cohort"],
    problem: "For Q4 last year, compute total revenue from NEW customers (first-ever Paid purchase in Q4) vs RETURNING (had prior Paid purchases). Return two rows: bucket, revenue.",
    dbDescription: RETAIL_SCHEMA,
    expected: "bucket ∈ {'New','Returning'}, revenue.",
    hints: ["MIN(sale_date) per customer gives the first-purchase date.", "Bucket by whether first purchase falls inside the Q4 range."],
    solution: "WITH firsts AS (\n  SELECT customer_id, MIN(sale_date) AS first_purchase\n  FROM sales WHERE status = 'Paid'\n  GROUP BY customer_id\n),\nq4 AS (\n  SELECT s.customer_id, s.total_amount,\n         CASE WHEN f.first_purchase BETWEEN '2025-10-01' AND '2025-12-31'\n              THEN 'New' ELSE 'Returning' END AS bucket\n  FROM sales s\n  JOIN firsts f ON f.customer_id = s.customer_id\n  WHERE s.status = 'Paid'\n    AND s.sale_date BETWEEN '2025-10-01' AND '2025-12-31'\n)\nSELECT bucket, SUM(total_amount) AS revenue\nFROM q4\nGROUP BY bucket;",
    explanation: "Classifying customers by their first-purchase date is the canonical new-vs-returning split. CTEs make the two-stage logic legible.",
    complexity: "O(n)", learned: ["First-purchase pattern", "Cohort splits"],
  }),
  mk({
    id: "co-amazon-03", title: "Amazon · Top 3 products per category",
    topic: "window-functions", difficulty: "Interview", minutes: 10, xp: 55,
    domain: "Retail", company: "Amazon", interviewRound: "Onsite",
    concepts: ["ROW_NUMBER", "PARTITION BY"], tags: ["amazon","top-n"],
    problem: "Return the 3 highest-revenue products in each category (Paid only). Break ties by product name ascending. Columns: category, product_name, revenue, rn.",
    dbDescription: RETAIL_SCHEMA,
    expected: "Up to 3 rows per category.",
    hints: ["Aggregate first.", "ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC, product_name)."],
    solution: "WITH rev AS (\n  SELECT p.category, p.name AS product_name, SUM(s.total_amount) AS revenue\n  FROM sales s\n  JOIN products p ON p.product_id = s.product_id\n  WHERE s.status = 'Paid'\n  GROUP BY p.category, p.name\n),\nrk AS (\n  SELECT category, product_name, revenue,\n         ROW_NUMBER() OVER (PARTITION BY category\n                            ORDER BY revenue DESC, product_name) AS rn\n  FROM rev\n)\nSELECT * FROM rk WHERE rn <= 3\nORDER BY category, rn;",
    explanation: "ROW_NUMBER + explicit tiebreak column makes results deterministic — a common interview pitfall.",
    complexity: "O(n log n)", learned: ["Deterministic top-N"],
  }),
  mk({
    id: "co-amazon-04", title: "Amazon · Sessionize purchase events",
    topic: "window-functions", difficulty: "Interview", minutes: 15, xp: 75,
    domain: "Retail", company: "Amazon", interviewRound: "Final",
    concepts: ["LAG", "session gap", "SUM OVER"], tags: ["amazon","sessionization"],
    problem: "Group each customer's purchases into sessions where consecutive purchases within 60 minutes belong to the same session. Return sale_id, customer_id, sale_date, session_id (1-indexed per customer).",
    dbDescription: RETAIL_SCHEMA,
    expected: "Every sale row with an assigned session_id.",
    hints: ["Compute gap seconds between consecutive sales per customer with LAG.", "Flag new sessions where gap > 3600 or the row is the first; cumulative SUM of flag = session_id."],
    solution: "WITH ord AS (\n  SELECT sale_id, customer_id, sale_date,\n         CAST(strftime('%s', sale_date) AS INTEGER) AS ts,\n         LAG(CAST(strftime('%s', sale_date) AS INTEGER))\n           OVER (PARTITION BY customer_id ORDER BY sale_date) AS prev_ts\n  FROM sales\n),\nflagged AS (\n  SELECT sale_id, customer_id, sale_date,\n         CASE WHEN prev_ts IS NULL OR (ts - prev_ts) > 3600 THEN 1 ELSE 0 END AS new_session\n  FROM ord\n)\nSELECT sale_id, customer_id, sale_date,\n       SUM(new_session) OVER (PARTITION BY customer_id ORDER BY sale_date\n                              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_id\nFROM flagged\nORDER BY customer_id, sale_date;",
    explanation: "Sessionization = flag boundaries + running sum. This is the exact pattern used for web analytics, ride hailing, and streaming.",
    complexity: "O(n log n)", learned: ["Sessionization", "Flag + cumulative sum"],
  }),
];

// ============================================================
// COMPANY — GOOGLE (uses Music schema as a proxy for search/query logs)
// ============================================================
const GOOGLE_SCHEMA =
  "listeners(listener_id, name, country, plan, signup_date)\nplays(play_id, listener_id, track_id, play_time, seconds_played, skipped)\ntracks(track_id, title, artist, genre, duration_seconds)";

const GOOGLE: Challenge[] = [
  mk({
    id: "co-google-01", title: "Google · Multi-country users",
    topic: "having", difficulty: "Interview", minutes: 6, xp: 30,
    domain: "Music", company: "Google", interviewRound: "Screen",
    concepts: ["COUNT DISTINCT", "HAVING"], tags: ["google","distinct"],
    problem: "Return listener_id and country_count for listeners who have plays originating from more than 1 country. (Assume plays carries a country via join to listeners — model it as the listener's country changing over time via multiple listener rows if needed; for this dataset use listeners.country plus any historical rows.)",
    dbDescription: GOOGLE_SCHEMA,
    expected: "listener_id, country_count (>= 2).",
    hints: ["COUNT(DISTINCT country) counts unique values.", "HAVING > 1."],
    solution: "SELECT listener_id, COUNT(DISTINCT country) AS country_count\nFROM listeners\nGROUP BY listener_id\nHAVING COUNT(DISTINCT country) > 1;",
    explanation: "COUNT(DISTINCT) is often the cheapest way to detect 'variety' — no self-join needed.",
    complexity: "O(n)", learned: ["COUNT DISTINCT"],
  }),
  mk({
    id: "co-google-02", title: "Google · Daily skip rate",
    topic: "case-when", difficulty: "Interview", minutes: 8, xp: 40,
    domain: "Music", company: "Google", interviewRound: "Phone",
    concepts: ["Rate metric", "date bucket"], tags: ["google","engagement"],
    problem: "Compute the daily skip rate: fraction of plays where skipped='Y', per day, for the last 14 days. Return day, plays, skip_rate rounded to 4 decimals.",
    dbDescription: GOOGLE_SCHEMA,
    expected: "One row per day in the window.",
    hints: ["DATE(play_time) buckets to a day.", "AVG(CASE WHEN skipped='Y' THEN 1.0 ELSE 0 END)."],
    solution: "SELECT DATE(play_time) AS day,\n       COUNT(*) AS plays,\n       ROUND(AVG(CASE WHEN skipped='Y' THEN 1.0 ELSE 0 END), 4) AS skip_rate\nFROM plays\nWHERE play_time >= DATE('now','-14 day')\nGROUP BY DATE(play_time)\nORDER BY day;",
    explanation: "Rate metrics (skip rate, click-through rate) all follow the same AVG-of-boolean pattern.",
    complexity: "O(n)", learned: ["Daily rate reporting"],
  }),
  mk({
    id: "co-google-03", title: "Google · D7 retention cohort",
    topic: "cte", difficulty: "Interview", minutes: 15, xp: 70,
    domain: "Music", company: "Google", interviewRound: "Onsite",
    concepts: ["Cohort", "date diff", "AVG"], tags: ["google","retention"],
    problem: "For each signup week last quarter, compute D7 retention: fraction of that cohort's listeners who had at least one play between day 7 and day 13 after signup. Columns: cohort_week, cohort_size, retained, d7_rate.",
    dbDescription: GOOGLE_SCHEMA,
    expected: "One row per signup week.",
    hints: ["Cohort key = DATE(signup_date, 'weekday 1', '-7 day').", "EXISTS a play with (play_time - signup_date) in [7,14) days."],
    solution: "WITH cohort AS (\n  SELECT listener_id, signup_date,\n         DATE(signup_date, 'weekday 1', '-7 day') AS cohort_week\n  FROM listeners\n  WHERE signup_date >= DATE('now','-90 day')\n),\nretained AS (\n  SELECT c.cohort_week, c.listener_id,\n         CASE WHEN EXISTS (\n           SELECT 1 FROM plays p\n           WHERE p.listener_id = c.listener_id\n             AND julianday(p.play_time) - julianday(c.signup_date) BETWEEN 7 AND 13.9999\n         ) THEN 1 ELSE 0 END AS d7\n  FROM cohort c\n)\nSELECT cohort_week,\n       COUNT(*)                 AS cohort_size,\n       SUM(d7)                  AS retained,\n       ROUND(AVG(d7*1.0), 4)    AS d7_rate\nFROM retained\nGROUP BY cohort_week\nORDER BY cohort_week;",
    explanation: "Retention is a two-CTE problem: define the cohort, then check the retention condition per member. AVG on a 0/1 flag gives the rate.",
    complexity: "O(n·k)", learned: ["Retention curves", "EXISTS pattern"],
  }),
  mk({
    id: "co-google-04", title: "Google · Median session duration",
    topic: "window-functions", difficulty: "Interview", minutes: 12, xp: 60,
    domain: "Music", company: "Google", interviewRound: "Final",
    concepts: ["Median", "PERCENT_RANK / ROW_NUMBER"], tags: ["google","statistics"],
    problem: "For each country, return the median play duration (seconds_played) across all plays. Columns: country, median_seconds.",
    dbDescription: GOOGLE_SCHEMA,
    expected: "One row per country.",
    hints: ["Portable median: number rows ASC and DESC per country, keep rows where |asc - desc| <= 1, then AVG.", "SQLite lacks PERCENTILE_CONT; the ROW_NUMBER trick works everywhere."],
    solution: "WITH j AS (\n  SELECT l.country, p.seconds_played\n  FROM plays p JOIN listeners l ON l.listener_id = p.listener_id\n),\nranked AS (\n  SELECT country, seconds_played,\n         ROW_NUMBER() OVER (PARTITION BY country ORDER BY seconds_played)      AS a,\n         ROW_NUMBER() OVER (PARTITION BY country ORDER BY seconds_played DESC) AS d\n  FROM j\n)\nSELECT country, AVG(seconds_played*1.0) AS median_seconds\nFROM ranked\nWHERE ABS(a - d) <= 1\nGROUP BY country\nORDER BY country;",
    explanation: "Ranking asc and desc together isolates the middle 1 (odd n) or 2 (even n) rows — averaging gives the median without a percentile function.",
    complexity: "O(n log n)", learned: ["Portable median"],
  }),
];

// ============================================================
// COMPANY — META (uses Social Media schema)
// ============================================================
const META_SCHEMA =
  "users(user_id, handle, country, signup_date, followers)\nposts(post_id, user_id, hashtag_id, post_time, likes, comments, post_type)\nhashtags(hashtag_id, tag, category, uses_count, trending)";

const META: Challenge[] = [
  mk({
    id: "co-meta-01", title: "Meta · Power users",
    topic: "where-filtering", difficulty: "Interview", minutes: 4, xp: 25,
    domain: "Social Media", company: "Meta", interviewRound: "Screen",
    concepts: ["WHERE", "threshold"], tags: ["meta","filter"],
    problem: "Return user_id, handle, followers for users with more than 10 000 followers, sorted highest first, top 20 only.",
    dbDescription: META_SCHEMA,
    expected: "20 rows.",
    hints: ["Simple WHERE + ORDER BY + LIMIT.", "Descending for 'highest first'."],
    solution: "SELECT user_id, handle, followers\nFROM users\nWHERE followers > 10000\nORDER BY followers DESC\nLIMIT 20;",
    explanation: "Warm-up problem — but recruiters read LIMIT+ORDER usage very carefully.",
    complexity: "O(n log n)", learned: ["Top-N filter"],
  }),
  mk({
    id: "co-meta-02", title: "Meta · Reels engagement rate",
    topic: "case-when", difficulty: "Interview", minutes: 8, xp: 40,
    domain: "Social Media", company: "Meta", interviewRound: "Phone",
    concepts: ["Ratio", "CASE"], tags: ["meta","engagement"],
    problem: "For each country, compute average engagement rate on Reels: (likes + comments) / followers, taken only over Reels posts and averaged across posts. Include only countries with >= 100 Reels.",
    dbDescription: META_SCHEMA,
    expected: "country, avg_engagement_rate.",
    hints: ["JOIN posts to users to expose followers and country.", "Filter post_type='Reel', GROUP BY country, HAVING COUNT(*) >= 100."],
    solution: "SELECT u.country,\n       AVG( (p.likes + p.comments) * 1.0 / NULLIF(u.followers, 0) ) AS avg_engagement_rate\nFROM posts p\nJOIN users u ON u.user_id = p.user_id\nWHERE p.post_type = 'Reel'\nGROUP BY u.country\nHAVING COUNT(*) >= 100\nORDER BY avg_engagement_rate DESC;",
    explanation: "NULLIF prevents divide-by-zero. Averaging per-post rates (rather than dividing sums) is a modeling choice — call it out in the interview.",
    complexity: "O(n)", learned: ["NULLIF", "Rate metrics"],
  }),
  mk({
    id: "co-meta-03", title: "Meta · Mutual-friend suggestions",
    topic: "self-join", difficulty: "Interview", minutes: 15, xp: 70,
    domain: "Social Media", company: "Meta", interviewRound: "Onsite",
    concepts: ["Self-join", "graph"], tags: ["meta","graph"],
    problem: "Given a friendships(user_a, user_b) edge table (undirected, one row per pair), for user_id = 42 return every other user X and count of mutual friends with 42 — where X is NOT already friends with 42. Sort by mutual_count DESC, top 10.",
    dbDescription: "friendships(user_a, user_b) — one row per undirected pair.",
    expected: "candidate_user_id, mutual_count — up to 10 rows.",
    hints: ["Normalize edges so each friendship appears both directions in a CTE.", "Friends of 42's friends, excluding 42 and 42's direct friends."],
    solution: "WITH edges AS (\n  SELECT user_a AS u, user_b AS v FROM friendships\n  UNION ALL\n  SELECT user_b AS u, user_a AS v FROM friendships\n),\nmy_friends AS (\n  SELECT v AS friend_id FROM edges WHERE u = 42\n)\nSELECT e.v AS candidate_user_id, COUNT(*) AS mutual_count\nFROM edges e\nJOIN my_friends m ON m.friend_id = e.u\nWHERE e.v <> 42\n  AND e.v NOT IN (SELECT friend_id FROM my_friends)\nGROUP BY e.v\nORDER BY mutual_count DESC\nLIMIT 10;",
    explanation: "Modeling an undirected graph as a bidirectional edge CTE lets you traverse it with plain joins. This is one of Meta's most-asked SQL questions.",
    complexity: "O(E · avg_degree)", learned: ["Graph traversal in SQL", "Bidirectional edges"],
  }),
  mk({
    id: "co-meta-04", title: "Meta · DAU / MAU ratio",
    topic: "cte", difficulty: "Interview", minutes: 12, xp: 60,
    domain: "Social Media", company: "Meta", interviewRound: "Final",
    concepts: ["Rolling active users", "DISTINCT"], tags: ["meta","stickiness"],
    problem: "For each day in the last 30, compute DAU (distinct users posting that day) and MAU (distinct users posting in the trailing 30 days including that day), then report the ratio DAU/MAU. Columns: day, dau, mau, stickiness.",
    dbDescription: META_SCHEMA,
    expected: "30 rows, one per day.",
    hints: ["Per-day CTE with COUNT(DISTINCT user_id).", "For MAU, self-join to sum distinct users in trailing 30 days — or use a window with a range."],
    solution: "WITH days AS (\n  SELECT DISTINCT DATE(post_time) AS d\n  FROM posts\n  WHERE post_time >= DATE('now','-30 day')\n),\ndaily AS (\n  SELECT DATE(post_time) AS d, user_id\n  FROM posts\n  GROUP BY DATE(post_time), user_id\n)\nSELECT d.d AS day,\n       (SELECT COUNT(DISTINCT user_id) FROM daily WHERE d = d.d)                                                    AS dau,\n       (SELECT COUNT(DISTINCT user_id) FROM daily WHERE d BETWEEN DATE(d.d,'-29 day') AND d.d)                       AS mau,\n       ROUND(\n         (SELECT COUNT(DISTINCT user_id) FROM daily WHERE d = d.d) * 1.0 /\n         NULLIF((SELECT COUNT(DISTINCT user_id) FROM daily WHERE d BETWEEN DATE(d.d,'-29 day') AND d.d), 0),\n         4\n       ) AS stickiness\nFROM days d\nORDER BY day;",
    explanation: "DAU/MAU is a stickiness metric. Correlated subqueries are readable here; on very large tables, prefer a window-function rewrite over rolling distinct-count approximations (HLL).",
    complexity: "O(n·30)", learned: ["DAU / MAU", "Stickiness"],
  }),
];

// ============================================================
// EXPORT
// ============================================================
export const CURATED_EXTRA: Challenge[] = [
  ...HEALTHCARE,
  ...BANKING,
  ...HR,
  ...FINANCE,
  ...RETAIL,
  ...AMAZON,
  ...GOOGLE,
  ...META,
];
