// @ts-nocheck
export interface SQLCommandCategory {
  category: string;
  fullName: string;
  description: string;
  commands: { name: string; description: string; example: string }[];
}

export const sqlCommandCategories: SQLCommandCategory[] = [
  {
    category: "DQL",
    fullName: "Data Query Language",
    description: "Used exclusively to fetch or retrieve query data models from existing tables.",
    commands: [
      { name: "SELECT", description: "Retrieves specific columns and rows of record data", example: "SELECT name, age FROM patients;" }
    ]
  },
  {
    category: "DDL",
    fullName: "Data Definition Language",
    description: "Defines, alters, or destroys structural schemas of database tables.",
    commands: [
      { name: "CREATE", description: "Creates a brand new database table, index, or constraint", example: "CREATE TABLE doctors (id INT, specialty TEXT);" },
      { name: "ALTER", description: "Modifies an existing table's schema (e.g., adds a column)", example: "ALTER TABLE patients ADD email VARCHAR(100);" },
      { name: "DROP", description: "Permanently deletes an entire table and all its contents", example: "DROP TABLE status_logs;" },
      { name: "TRUNCATE", description: "Empties all rows from a table but keeps the column structure", example: "TRUNCATE TABLE appointment_history;" }
    ]
  },
  {
    category: "DML",
    fullName: "Data Manipulation Language",
    description: "Enables manipulation of individual records within a defined schema.",
    commands: [
      { name: "INSERT", description: "Appends new rows of record values into a table", example: "INSERT INTO patients (id, name) VALUES (1, 'Alice');" },
      { name: "UPDATE", description: "Modifies or updates values of existing rows based on a filter", example: "UPDATE doctors SET salary = 12000 WHERE id = 205;" },
      { name: "DELETE", description: "Deletes specific rows based on a WHERE criteria condition", example: "DELETE FROM appointments WHERE status = 'Cancelled';" }
    ]
  },
  {
    category: "TCL",
    fullName: "Transaction Control Language",
    description: "Manages transactions to guarantee ACID compliance (atomicity and consistency).",
    commands: [
      { name: "COMMIT", description: "Saves transaction changes permanently to disk", example: "COMMIT;" },
      { name: "ROLLBACK", description: "Undoes all transaction modifications made since last save", example: "ROLLBACK;" },
      { name: "SAVEPOINT", description: "Establishes a temporary checkpoint within a transaction", example: "SAVEPOINT sp1;" }
    ]
  },
  {
    category: "DCL",
    fullName: "Data Control Language",
    description: "Handles administrative rights, permissions, and security roles.",
    commands: [
      { name: "GRANT", description: "Authorizes specific users to run query statements", example: "GRANT SELECT, INSERT ON patients TO clinical_staff;" },
      { name: "REVOKE", description: "Removes specific access privileges from database users", example: "REVOKE DELETE ON doctors FROM temporary_interns;" }
    ]
  }
];

export interface SQLStatementTopic {
  title: string;
  syntax: string;
  definition: string;
  example: string;
  outputDescription: string;
}

export const basicQueriesSyllabus: SQLStatementTopic[] = [
  {
    title: "SELECT",
    syntax: "SELECT column1, column2 FROM table_name;",
    definition: "Specifies the precise fields to retrieve from a target database table. Using SELECT * acts as a quick wildcard matching all columns.",
    example: "SELECT name, specialty FROM doctors;",
    outputDescription: "Fetches a tabular result showing only the name and specialty columns for all doctors."
  },
  {
    title: "DISTINCT",
    syntax: "SELECT DISTINCT column1 FROM table_name;",
    definition: "Filters the query outputs to remove adjacent and non-adjacent logical duplicate rows, returning only unique values.",
    example: "SELECT DISTINCT country FROM guests;",
    outputDescription: "Retrieves a clean list of guest countries without duplicates, reporting each nationality exactly once."
  },
  {
    title: "WHERE",
    syntax: "SELECT column FROM table_name WHERE condition;",
    definition: "Applies conditions to filter individual rows. Only records satisfying the conditions are included in the output.",
    example: "SELECT * FROM patients WHERE age > 60;",
    outputDescription: "Displays demographic profiles of patients who are strictly senior (older than 60)."
  },
  {
    title: "ORDER BY",
    syntax: "SELECT columns FROM table_name ORDER BY column [ASC | DESC];",
    definition: "Sorts the results chronologically, numerically, or alphabetically. Default sorting is ascending (ASC). Use DESC for descending.",
    example: "SELECT name, experience_years FROM doctors ORDER BY experience_years DESC;",
    outputDescription: "Lists all physical doctors sorted from the highest years of clinical experience down to the lowest."
  },
  {
    title: "GROUP BY",
    syntax: "SELECT column1, COUNT(*) FROM table_name GROUP BY column1;",
    definition: "Combines rows sharing the same values in specified columns into summary rows (e.g., getting the average per department). Any column in the SELECT clause that is not part of an aggregate function must be included in the GROUP BY clause.",
    example: "SELECT department, COUNT(*) FROM doctors GROUP BY department;",
    outputDescription: "Compresses rows to provide the total number of doctors staffed inside each clinical department."
  },
  {
    title: "HAVING",
    syntax: "SELECT column1, SUM(column2) FROM table_name GROUP BY column1 HAVING SUM(column2) > threshold;",
    definition: "Works exactly like a WHERE clause but filters groups created by the GROUP BY clause based on aggregate function values. WHERE cannot be used for aggregate conditions.",
    example: "SELECT city, COUNT(*) FROM patients GROUP BY city HAVING COUNT(*) > 3;",
    outputDescription: "Filters the grouped city results to display only cities that have strictly more than 3 registered residents."
  },
  {
    title: "LIMIT / TOP",
    syntax: "SELECT columns FROM table_name LIMIT max_rows;",
    definition: "Restricts the absolute number of records returned. Highly optimized for large databases to save on networking overhead.",
    example: "SELECT * FROM products ORDER BY price DESC LIMIT 3;",
    outputDescription: "Retrieves only the top three most expensive inventory products available on the shelves."
  }
];

export const operatorDetailsSyllabus = [
  {
    category: "Arithmetic Operators",
    symbols: "+, -, *, /",
    definition: "Performs mathematical calculations directly on column data inside select blocks.",
    example: "SELECT monthly_salary, monthly_salary * 12 AS annual_salary FROM employees;",
    explanation: "Multiplies monthly salary by 12 to project annual baseline compensation."
  },
  {
    category: "Comparison Operators",
    symbols: "=, <>, >, <, >=, <=",
    definition: "Tests relationships between column variables and target criteria values.",
    example: "SELECT * FROM vehicles WHERE capacity_tons >= 10.0;",
    explanation: "Extracts only cargo vehicles rated for heavy-duty freight payload limits."
  },
  {
    category: "Logical Operators",
    symbols: "AND, OR, NOT",
    definition: "Combines multiple search criteria within a single WHERE clause filter.",
    example: "SELECT * FROM clients WHERE age >= 40 AND smoke_status = 'No';",
    explanation: "Matches mid-aged policyholders who state they are non-smokers (satisfying both conditions)."
  },
  {
    category: "BETWEEN",
    symbols: "BETWEEN val1 AND val2",
    definition: "Selects values within an inclusive range. Works smoothly on numbers, text, and dates.",
    example: "SELECT * FROM appointments WHERE appointment_date BETWEEN '2026-01-01' AND '2026-01-31';",
    explanation: "Fetches scheduled clinical appointments occurring specifically in January."
  },
  {
    category: "IN",
    symbols: "IN (val1, val2, ...)",
    definition: "Specifies multiple discrete options within a comma-separated list. Acts as a shorthand for multiple OR conditions.",
    example: "SELECT * FROM subscribers WHERE state IN ('NY', 'CA', 'TX');",
    explanation: "Isolates users living specifically in New York, California, or Texas."
  },
  {
    category: "LIKE",
    symbols: ", % (any chars), _ (one char)",
    definition: "Implements fuzzy pattern matching for string fields. Uses '%' as a wildcard for multiple letters.",
    example: "SELECT * FROM employees WHERE position LIKE '%Engineer';",
    explanation: "Indexes workers whose job role title ends with 'Engineer' (e.g. Software Engineer, DevOps Engineer)."
  },
  {
    category: "IS NULL",
    symbols: "IS NULL, IS NOT NULL",
    definition: "Scans columns specifically for empty values. Never use '= NULL' as NULL represents the absence of a value.",
    example: "SELECT * FROM patients WHERE discharge_date IS NULL;",
    explanation: "Returns a roster of patients currently admitted who have not been discharged."
  },
  {
    category: "ANY / ALL",
    symbols: "ANY, ALL with comparisons",
    definition: "Compares a single value against a list or query result set. e.g., value > ALL (1, 2, 3) must be greater than all items in that list.",
    example: "SELECT * FROM salaries WHERE monthly_salary > ALL (3000, 4000, 5000);",
    explanation: "Displays employee records whose salary is strictly superior to the maximum of the comparative array ($5000)."
  }
];

export const aggregateFunctionsSyllabus = [
  {
    name: "COUNT()",
    syntax: "COUNT(*), COUNT(column)",
    definition: "Counts the number of non-NULL occurrences inside a selected column. COUNT(*) counts all matching rows including NULLs.",
    example: "SELECT COUNT(client_id) FROM clients WHERE city = 'Chicago';",
    explanation: "Tallies the total number of insurance clients registered in Chicago."
  },
  {
    name: "SUM()",
    syntax: "SUM(column)",
    definition: "Calculates the total mathematical sum of a numerical column's values.",
    example: "SELECT SUM(billing_amount) FROM appointments WHERE status = 'Completed';",
    explanation: "Calculates the total clinic revenue generated from completed outpatient visits."
  },
  {
    name: "AVG()",
    syntax: "AVG(column)",
    definition: "Calculates the average (arithmetic mean) value of a numeric column.",
    example: "SELECT AVG(rating_score) FROM salaries WHERE rating_score IS NOT NULL;",
    explanation: "Computes the average rating across employee files to baseline staff performance."
  },
  {
    name: "MAX()",
    syntax: "MAX(column)",
    definition: "Identifies the highest (maximum) value within a selected field.",
    example: "SELECT MAX(price_per_night) FROM rooms WHERE is_occupied = 0;",
    explanation: "Discovers the most expensive room currently vacant and available for booking."
  },
  {
    name: "MIN()",
    syntax: "MIN(column)",
    definition: "Identifies the lowest (minimum) value within a selected field.",
    example: "SELECT MIN(experience_years) FROM doctors;",
    explanation: "Discovers the minimum experience level among all registered clinical staff."
  }
];