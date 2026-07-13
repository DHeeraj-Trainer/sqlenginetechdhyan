export interface DocChapter {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  sections: {
    title: string;
    description: string;
    syntax?: string;
    example?: string;
    tableData?: {
      headers: string[];
      rows: string[][];
    };
    tips?: string[];
  }[];
}

export const sqlChapters: DocChapter[] = [
  {
    id: "intro-databases",
    title: "1. Introduction to Database Systems",
    subtitle: "Core concepts, evolution, file system comparison, and practical applications.",
    description: "Before writing SQL, it is crucial to understand why databases exist, how they evolved, and the fundamental shift from traditional file-based storage systems to modern Database Management Systems (DBMS).",
    sections: [
      {
        title: "Data vs Information & Core Concepts",
        description: "In computer science, 'Data' and 'Information' are related but distinct concepts. Data represents raw, unorganized facts, while Information is processed, structured data that carries meaning.",
        tableData: {
          headers: ["Concept", "Definition", "Characteristics", "Example"],
          rows: [
            ["Data", "Raw, unformatted, and unorganized facts, figures, or symbols.", "Has no context or meaning on its own; highly atomic.", "The raw numbers: 120, 80, 1024."],
            ["Information", "Processed, structured, and organized data that is meaningful.", "Contextual, useful, and helps in decision making.", "A patient's blood pressure is 120/80 mmHg, indicating healthy stats."],
            ["Database", "An organized, structured collection of data stored electronically.", "Ensures easy access, management, and modification.", "A healthcare clinical database tracking thousands of patient profiles."],
            ["DBMS", "Software system that enables users to define, create, maintain, and control access to a database.", "Provides an interface between database files and end-users.", "MySQL, PostgreSQL, Oracle, SQLite, AlaSQL."]
          ]
        }
      },
      {
        title: "Evolution of Database Systems",
        description: "Database systems have undergone several major paradigm shifts over the last 60 years to cope with increasing data sizes, performance needs, and complex relationships.",
        tableData: {
          headers: ["Era / Model", "Core Architecture", "Key Characteristics", "Main Drawback / Limitation"],
          rows: [
            ["Flat File System (1960s)", "Data stored in sequential, unlinked plain text files.", "Very simple, direct filesystem storage.", "Massive data redundancy, zero integrity rules, hard to search."],
            ["Hierarchical Model (1965+)", "Data organized in a tree-like, parent-child structure.", "Efficient one-to-many relationship traversal.", "Cannot represent many-to-many links; highly rigid structure."],
            ["Network Model (1970s)", "Data organized as a graph where a child record can have multiple parents.", "Supports complex many-to-many links.", "Extremely complex queries and structural maintenance overhead."],
            ["Relational Model (1970+)", "Data organized in standard tabular formats (Tables with Rows and Columns).", "Uses relational calculus; highly flexible and standardized (SQL).", "Requires careful optimization (indexing) for ultra-massive scale."],
            ["NoSQL / Non-Relational (2000s+)", "Data stored as key-values, JSON documents, column-families, or graphs.", "Horizontal scalability, schemaless, high write throughput.", "Lacks standard ACID transaction compliance in several distributed systems."]
          ]
        }
      },
      {
        title: "File Systems vs. DBMS: Why we shifted",
        description: "Traditional file systems store data in flat files managed directly by the Operating System. A DBMS introduces an abstraction layer that solves file-system structural dependencies and concurrency issues.",
        tableData: {
          headers: ["Comparison Metric", "Operating OS File System", "Database Management System (DBMS)"],
          rows: [
            ["Redundancy & Duplication", "High. The same file or field must be cloned across multiple departments.", "Minimal. Managed via database normalization and foreign keys."],
            ["Data Integrity", "Unenforced. Programs can write text where numbers belong.", "Strict. Column datatypes and constraints reject corrupt rows."],
            ["Concurrency Control", "Hard file locks. Only one user can write to a file at a time.", "Concurrent read/write streams managed via transactions and lock managers."],
            ["Ad-hoc Querying", "Extremely slow. Requires custom shell scripts or file scanning.", "Instantaneous. Supported via standard structured queries (SQL)."],
            ["Security & Authorization", "Coarse-grained OS file permissions.", "Fine-grained permissions on tables, views, and individual columns."]
          ]
        },
        tips: [
          "The main advantages of a DBMS are data independence, efficient data access, data integrity, security, concurrent access, backup-recovery procedures, and transaction support.",
          "Common real-world applications of databases include Banking (transactions), Aviation (reservations), Healthcare (patient electronic records), E-commerce (orders, catalogs, customer carts), and Social Media (user profiles, message threads)."
        ]
      }
    ]
  },
  {
    id: "rdbms-concepts-datatypes",
    title: "2. RDBMS Architecture & Core Datatypes",
    subtitle: "RDBMS components, rows, columns, domains, and SQL physical data types.",
    description: "A Relational Database Management System (RDBMS) represents data as mathematical relations (tables). Below is the precise terminology and the physical datatypes used to store varying types of information.",
    sections: [
      {
        title: "RDBMS Core Terminologies",
        description: "Relational database terms have formal mathematical names and corresponding common database labels. Understanding both is standard for interview and system design environments.",
        tableData: {
          headers: ["Database Term", "Mathematical Term", "Logical Definition", "Example"],
          rows: [
            ["Table", "Relation", "A two-dimensional grid consisting of rows and columns.", "The 'patients' table."],
            ["Row / Record", "Tuple", "A single row representing a specific individual entity.", "Patient with ID 105: 'Jane Doe', Age 32."],
            ["Column / Attribute", "Attribute", "A vertical field representing a property of the table.", "'email' or 'admission_date'."],
            ["Domain", "Domain", "The set of allowable values for an attribute, bounded by datatype.", "Age must be an integer between 0 and 150."],
            ["Schema", "Intension", "The structural metadata defining table structures, keys, and links.", "patients(id INT, name VARCHAR, age INT)"],
            ["Instance", "Extension", "The actual state and records stored in the database at a specific time.", "The 5,420 rows currently populated in the patients table."]
          ]
        }
      },
      {
        title: "Standard SQL Physical Datatypes",
        description: "Before writing DDL schemas, you must declare appropriate datatypes for every column. Choosing correct types optimizes memory, indexing, and prevents data clipping.",
        tableData: {
          headers: ["Category", "Datatype", "Description & Usage", "Syntax & Example"],
          rows: [
            ["Numeric", "INT / INTEGER", "Stores whole numbers (positive or negative).", "id INT"],
            ["Numeric", "DECIMAL(p,s) / NUMERIC", "Fixed precision decimal. Highly recommended for monetary assets.", "salary DECIMAL(10, 2) (up to 10 digits total, 2 after decimal)"],
            ["Numeric", "FLOAT / DOUBLE", "Floating precision number. Used for scientific metrics.", "weight DOUBLE"],
            ["Character", "CHAR(N)", "Fixed-length string. Space padded if value is shorter than N.", "state CHAR(2) (always reserves 2 characters)"],
            ["Character", "VARCHAR(N)", "Variable-length string. Dynamic padding up to size limit N.", "name VARCHAR(100) (takes only active character size)"],
            ["Date & Time", "DATE", "Stores a calendar date without a time portion.", "birth_date DATE ('YYYY-MM-DD')"],
            ["Date & Time", "TIME", "Stores a precise clock time without calendar date.", "appointment_time TIME ('HH:MM:SS')"],
            ["Date & Time", "TIMESTAMP / DATETIME", "Stores both calendar date and precise clock time.", "created_at TIMESTAMP (saves year, month, day, hours, seconds)"],
            ["Boolean", "BOOLEAN", "Stores truth values. Evaluates to TRUE, FALSE, or NULL.", "is_active BOOLEAN"],
            ["Enumerated", "ENUM", "A custom string object with a value chosen from a static list.", "status ENUM('Pending', 'Active', 'Discharged')"]
          ]
        },
        tips: [
          "Always prefer VARCHAR over CHAR unless you are storing strictly fixed-length codes (like state codes, country ISO keys, or hash keys).",
          "Never store financial values (such as prices, account balances) in FLOAT or DOUBLE, as floating-point binary approximations lead to rounding errors. Always use DECIMAL / NUMERIC."
        ]
      }
    ]
  },
  {
    id: "ddl-commands-constraints",
    title: "3. DDL Commands, Constraints & ALTER TABLE",
    subtitle: "Creating schemas, primary keys, foreign links, and modifying live structures.",
    description: "Data Definition Language (DDL) is used to establish and modify the physical database layout. DDL changes structural state and is auto-committed in most SQL engines.",
    sections: [
      {
        title: "Core DDL Commands Reference",
        description: "DDL commands dictate database and table lifecycles. They operate on metadata blocks and physical directories.",
        tableData: {
          headers: ["DDL Command", "Syntactic Objective", "Physical Action on Disk", "Risk Profile"],
          rows: [
            ["CREATE DATABASE", "Instantiates a new logical database instance.", "Allocates memory structures and disk storage folders.", "Safe. Does not alter existing files."],
            ["CREATE TABLE", "Estantiates a new tabular relation with columns, keys, and types.", "Saves column schemas to system catalog structures.", "Safe. Fails if table name already exists."],
            ["DROP", "Permanently deletes a table or database entirely.", "Destroys schema, indexes, and clears all row files.", "CRITICAL. Instantly purges structure and contents."],
            ["TRUNCATE", "Empties a table's contents completely while retaining the structural outline.", "De-allocates disk block mappings. Faster than DELETE.", "HIGH. Empties the table without row-by-row logs."],
            ["RENAME", "Changes the physical name of an active table.", "Modifies table reference label inside database catalogs.", "MEDIUM. Breaks active references in software code."]
          ]
        },
        syntax: "-- CREATE DATABASE Syntax:\nCREATE DATABASE school_db;\n\n-- CREATE TABLE Syntax:\nCREATE TABLE students (\n  student_id INT PRIMARY KEY,\n  student_name VARCHAR(100)\n);\n\n-- DROP and TRUNCATE:\nTRUNCATE TABLE old_activity_logs;\nDROP TABLE temp_results_table;"
      },
      {
        title: "Relational Schema Constraints",
        description: "Constraints guarantee data safety and referential hygiene. They prevent corrupt inserts and safeguard parent-child links.",
        tableData: {
          headers: ["Constraint", "Logical Rule Enforced", "Syntax Example", "Real-World Purpose"],
          rows: [
            ["PRIMARY KEY", "Enforces non-nullability and strict uniqueness.", "id INT PRIMARY KEY", "Guarantees each patient has a unique identifier."],
            ["FOREIGN KEY", "Validates that child cells exist in the parent table.", "FOREIGN KEY (doc_id) REFERENCES doctors(id)", "Prevents appointments with non-existent doctors."],
            ["UNIQUE", "Guarantees no two records contain duplicate entries in this column.", "email VARCHAR(150) UNIQUE", "Prevents duplicate accounts with the same email."],
            ["NOT NULL", "Rejects inserts leaving the target cell blank/NULL.", "first_name VARCHAR(50) NOT NULL", "Ensures human records always contain names."],
            ["DEFAULT", "Injects fallback values automatically if omitted in INSERT.", "status VARCHAR(30) DEFAULT 'Scheduled'", "Initializes new appointments as 'Scheduled' by default."],
            ["CHECK", "Validates that a cell meets custom algebraic conditions.", "CHECK (age >= 0 AND age <= 150)", "Blocks negative ages or unreal values on write."],
            ["AUTO_INCREMENT", "Automatically increments cell values sequentially on row inserts.", "id INT AUTO_INCREMENT PRIMARY KEY", "Handles unique ID sequencing automatically without manual math."]
          ]
        },
        tips: [
          "A table can only have ONE Primary Key, which can consist of a single column or multiple columns combined (Composite Primary Key).",
          "A Foreign Key ensures Referential Integrity, meaning child values must point to valid, existing parent values. If a parent record is deleted, ON DELETE CASCADE can automatically purge linked children."
        ]
      },
      {
        title: "ALTER TABLE Schema Modifications",
        description: "ALTER TABLE commands allow administrators to adapt active database structures without losing existing rows of data.",
        tableData: {
          headers: ["Alter Task", "Action Clause", "ANSI SQL Syntax Pattern", "Use Case Example"],
          rows: [
            ["Add Column", "ADD COLUMN", "ALTER TABLE patients ADD email VARCHAR(150);", "Adding email communication to an existing patient roster."],
            ["Modify Column", "MODIFY / ALTER COLUMN", "ALTER TABLE patients MODIFY age INT NOT NULL;", "Changing column size, nullable constraints, or types."],
            ["Rename Column", "RENAME COLUMN", "ALTER TABLE patients RENAME COLUMN birth_date TO dob;", "Fixing naming conventions or column typos."],
            ["Drop Column", "DROP COLUMN", "ALTER TABLE patients DROP COLUMN middle_name;", "Removing redundant attributes from a database structure."]
          ]
        },
        example: "-- Complete Schema Alteration Example:\nALTER TABLE doctors ADD certification_code VARCHAR(50);\nALTER TABLE doctors MODIFY experience_years INT DEFAULT 0;\nALTER TABLE doctors RENAME COLUMN salary TO base_salary;\nALTER TABLE doctors DROP COLUMN temporary_notes;"
      }
    ]
  },
  {
    id: "dml-dql-mastery",
    title: "4. DML Commands, SELECT Projection & Operators",
    subtitle: "Inserting, updating, deleting rows, filtering, and operator precedence.",
    description: "Data Manipulation Language (DML) manages active records inside schemas, while Data Query Language (DQL) retrieves rows based on criteria.",
    sections: [
      {
        title: "DML Row Operations (INSERT, UPDATE, DELETE)",
        description: "These three commands edit rows. In a DBMS, they require strict targets and transaction safeguards to avoid bulk corruption.",
        tableData: {
          headers: ["Operation", "Syntax Pattern", "Safety Principle", "Standard Implementation"],
          rows: [
            ["INSERT", "INSERT INTO table (cols) VALUES (vals);", "Ensure columns and values match in quantity and types.", "INSERT INTO patients (id, name, age) VALUES (201, 'John Doe', 34);"],
            ["UPDATE", "UPDATE table SET col = val WHERE criteria;", "NEVER omit the WHERE clause unless updating every single row.", "UPDATE patients SET age = 35 WHERE id = 201;"],
            ["DELETE", "DELETE FROM table WHERE criteria;", "Always filter carefully. Use SELECT to verify rows before deleting.", "DELETE FROM patients WHERE id = 201;"]
          ]
        }
      },
      {
        title: "SELECT Statement: Projection, Filtering, Sorting & Limits",
        description: "DQL lets you query specific columns (Projection) and restrict rows (Filtering) to isolate desired records.",
        tableData: {
          headers: ["Query Clause", "Purpose", "Syntax Pattern", "Standard Implementation"],
          rows: [
            ["Projection", "Selects subset of columns to print.", "SELECT col1, col2 FROM table;", "SELECT name, specialty FROM doctors;"],
            ["Filtering", "Restricts rows returned using conditions.", "SELECT * FROM table WHERE condition;", "SELECT * FROM doctors WHERE salary > 90000;"],
            ["DISTINCT", "Removes duplicate rows from the output.", "SELECT DISTINCT col FROM table;", "SELECT DISTINCT specialty FROM doctors;"],
            ["Sorting", "Orders output ascending or descending.", "ORDER BY col1 [ASC|DESC]", "SELECT name, salary FROM doctors ORDER BY salary DESC;"],
            ["LIMIT", "Restricts the count of output rows.", "LIMIT quantity OFFSET offset_val", "SELECT * FROM doctors ORDER BY name ASC LIMIT 5;"],
            ["Aliases", "Renames columns or tables for ease of use.", "col_name AS custom_alias", "SELECT name AS doctor_name, salary * 1.10 AS updated_salary FROM doctors;"]
          ]
        },
        syntax: "SELECT DISTINCT specialty AS department, AVG(salary) AS average_sal \nFROM doctors \nWHERE status = 'Active' \nGROUP BY specialty \nHAVING AVG(salary) > 80000 \nORDER BY average_sal DESC \nLIMIT 3;"
      },
      {
        title: "SQL Operators Reference",
        description: "Operators combine conditions inside SELECT, WHERE, and HAVING blocks. Knowing operator classes is key to writing accurate filters.",
        tableData: {
          headers: ["Operator Class", "Operators", "Purpose", "Syntactic Implementation"],
          rows: [
            ["Arithmetic", "+, -, *, /, %", "Executes mathematical operations inside projections.", "SELECT salary + 500 AS adjusted_salary"],
            ["Comparison", "=, !=, <>, <, >, <=, >=", "Compares fields against parameters.", "WHERE experience_years >= 10"],
            ["Logical", "AND, OR, NOT", "Combines multiple search criteria.", "WHERE status = 'Active' AND NOT salary < 50000"],
            ["Range / Sets", "BETWEEN [A] AND [B]", "Matches elements within bounds inclusive.", "WHERE admission_date BETWEEN '2026-01-01' AND '2026-06-30'"],
            ["Membership", "IN (value_list)", "Matches any item within a defined set.", "WHERE city IN ('Chicago', 'New York', 'Seattle')"],
            ["Fuzzy Search", "LIKE", "Matches strings using wildcards: % (multi-char), _ (single-char).", "WHERE name LIKE 'Dr. %' (starts with 'Dr. ')"],
            ["Null Checks", "IS NULL / IS NOT NULL", "Locates absent values on disk. Do not use '= NULL'.", "WHERE discharge_date IS NULL"]
          ]
        },
        example: "SELECT name, age, city FROM patients \nWHERE city IN ('Chicago', 'Miami') \n  AND age BETWEEN 18 AND 65 \n  AND (email LIKE '%@gmail.com' OR email IS NULL);"
      }
    ]
  },
  {
    id: "sql-functions-deep-dive",
    title: "5. Comprehensive Built-in Function Reference",
    subtitle: "String, Numeric, and Date & Time functions with real-world examples.",
    description: "Database engines provide built-in functions to clean, parse, and calculate data directly on the database server before delivering results to application code.",
    sections: [
      {
        title: "String Functions Mastery",
        description: "String functions manipulate text fields. They are critical for formatting names, extracting codes, and trimming blank spaces.",
        tableData: {
          headers: ["String Function", "Expected Argument Types", "Behavior & Result", "Syntax & Example"],
          rows: [
            ["CONCAT(s1, s2, ...)", "Multiple string fields", "Combines multiple strings into one continuous string.", "CONCAT(first_name, ' ', last_name) AS full_name"],
            ["LENGTH(str)", "String column", "Returns the character count of the string.", "LENGTH(phone_number) AS phone_len"],
            ["SUBSTRING(str, pos, len)", "String, start position, count", "Extracts a portion of a string starting at index pos.", "SUBSTRING(phone_number, 1, 3) AS area_code"],
            ["UPPER(str)", "String field", "Converts all characters to uppercase.", "UPPER(city) AS upper_city"],
            ["LOWER(str)", "String field", "Converts all characters to lowercase.", "LOWER(email) AS lower_email"],
            ["REPLACE(str, from, to)", "String, search target, replacement", "Swaps occurrences of a substring with a new text.", "REPLACE(phone_number, '-', '') AS clean_phone"],
            ["TRIM(str)", "String field", "Removes leading and trailing white spaces.", "TRIM(input_text) AS trimmed_text"]
          ]
        },
        example: "SELECT \n  CONCAT('DR. ', UPPER(TRIM(name))) AS formal_name, \n  SUBSTRING(email, 1, 4) AS email_prefix, \n  REPLACE(specialty, ' ', '_') AS formatted_specialty \nFROM doctors;"
      },
      {
        title: "Numeric Functions Mastery",
        description: "Numeric functions run advanced math on continuous data points, useful for rounding averages, calculating totals, and parsing metrics.",
        tableData: {
          headers: ["Numeric Function", "Expected Argument Types", "Behavior & Result", "Syntax & Example"],
          rows: [
            ["ROUND(num, dec)", "Number, decimal places", "Rounds a decimal to a specified number of places.", "ROUND(AVG(salary), 2) AS rounded_avg"],
            ["FLOOR(num)", "Number", "Rounds a decimal down to the nearest integer.", "FLOOR(4.9) -> returns 4"],
            ["CEIL(num) / CEILING", "Number", "Rounds a decimal up to the nearest integer.", "CEIL(4.1) -> returns 5"],
            ["MOD(n, m)", "Two integers", "Returns the remainder of dividing n by m.", "MOD(id, 2) = 0 (finds even IDs)"],
            ["POWER(base, exp)", "Two numbers", "Raises a base number to a specified power exponent.", "POWER(2, 3) -> returns 8"]
          ]
        },
        syntax: "SELECT \n  ROUND(base_salary * 1.123, 2) AS precise_bonus, \n  FLOOR(base_salary / 1000) * 1000 AS rounded_down_tier, \n  CEIL(rating) AS ceiling_score, \n  MOD(doctor_id, 5) AS rota_shift_index \nFROM doctors;"
      },
      {
        title: "Date & Time Functions Mastery",
        description: "Date functions calculate intervals, formats, and capture current times, which is vital for scheduling and history logs.",
        tableData: {
          headers: ["Date Function", "Parameters", "Behavior & Result", "Syntax & Example"],
          rows: [
            ["NOW()", "None", "Returns the current database date and clock time.", "SELECT NOW() AS current_system_timestamp"],
            ["CURDATE()", "None", "Returns the current database date (without time).", "SELECT CURDATE() AS today_date"],
            ["DATE_ADD(date, INTERVAL)", "Date, quantity unit", "Adds a specified time interval to a date.", "DATE_ADD(appointment_date, INTERVAL 7 DAY)"],
            ["DATE_SUB(date, INTERVAL)", "Date, quantity unit", "Subtracts a specified time interval from a date.", "DATE_SUB(NOW(), INTERVAL 30 DAY)"],
            ["MONTH(date)", "Date", "Extracts the month integer (1 to 12) from a date.", "MONTH(admission_date) = 12 (finds December events)"],
            ["YEAR(date)", "Date", "Extracts the year portion from a date.", "YEAR(hire_date) AS hire_year"],
            ["DATEDIFF(d1, d2)", "Two dates", "Returns the integer difference in days between two dates.", "DATEDIFF(discharge_date, admission_date) AS days_admitted"]
          ]
        },
        example: "SELECT \n  appointment_id, \n  appointment_date, \n  CURDATE() AS today, \n  DATEDIFF(appointment_date, CURDATE()) AS days_until_visit, \n  DATE_ADD(appointment_date, INTERVAL 1 YEAR) AS annual_followup \nFROM appointments \nWHERE MONTH(appointment_date) = MONTH(CURDATE()) \n  AND YEAR(appointment_date) = YEAR(CURDATE());"
      }
    ]
  },
  {
    id: "advanced-grouping-joins",
    title: "6. Advanced Grouping & Relational JOINs",
    subtitle: "Aggregate functions, GROUP BY, HAVING, and multi-table joins.",
    description: "These concepts represent the true strength of relational databases, combining records from separate normalized tables and aggregating them for reports.",
    sections: [
      {
        title: "Aggregate Functions, GROUP BY & HAVING",
        description: "Aggregations process values across a column to return a single summarized result.",
        tableData: {
          headers: ["Aggregate", "Action", "Ignore NULLs?", "Syntax Example"],
          rows: [
            ["COUNT()", "Counts rows or non-null values. COUNT(*) counts all rows.", "No for COUNT(*), Yes for COUNT(column)", "COUNT(id) AS total_patients"],
            ["SUM()", "Adds numeric column values together.", "Yes", "SUM(salary) AS total_payroll"],
            ["AVG()", "Calculates the mathematical average of a column.", "Yes", "AVG(experience_years) AS avg_exp"],
            ["MAX()", "Identifies the highest value in a column.", "Yes", "MAX(salary) AS highest_pay"],
            ["MIN()", "Identifies the lowest value in a column.", "Yes", "MIN(salary) AS lowest_pay"]
          ]
        },
        tips: [
          "GROUP BY aggregates rows sharing a column into unified buckets. Every non-aggregated column in the SELECT clause must be listed in GROUP BY.",
          "WHERE filters rows before grouping. HAVING filters the grouped results after GROUP BY is processed."
        ]
      },
      {
        title: "Relational JOIN Types in SQL",
        description: "JOINs connect columns from multiple tables by matching key fields (usually Primary Key linked to Foreign Key).",
        tableData: {
          headers: ["JOIN Type", "Logical Behavior", "Matched Rows", "Unmatched Rows (Left Table)", "Unmatched Rows (Right Table)"],
          rows: [
            ["INNER JOIN", "Returns rows only when keys match in BOTH tables.", "Included", "Discarded", "Discarded"],
            ["LEFT JOIN", "Returns ALL rows from Left, plus matching values from Right. Unmatched Right values become NULL.", "Included", "Included (with NULLs)", "Discarded"],
            ["RIGHT JOIN", "Returns ALL rows from Right, plus matching values from Left. Unmatched Left values become NULL.", "Included", "Discarded", "Included (with NULLs)"],
            ["CROSS JOIN", "Produces a Cartesian product. Pairs every left row with every right row.", "All Paired", "N/A (No key match required)", "N/A (No key match required)"],
            ["SELF JOIN", "Joins a table to itself. Useful for hierarchical relationships (e.g., matching employees to managers).", "Included if match", "Discarded if inner", "Discarded if inner"]
          ]
        },
        syntax: "-- SELF JOIN Syntax Example (Matching employee to their manager): \nSELECT e.name AS employee, m.name AS manager \nFROM staff e \nLEFT JOIN staff m ON e.manager_id = m.staff_id;\n\n-- Multi-Table Join Syntax:\nSELECT p.name, d.name, a.appointment_date \nFROM appointments a \nJOIN patients p ON a.patient_id = p.id \nJOIN doctors d ON a.doctor_id = d.id;"
      }
    ]
  },
  {
    id: "subqueries-set-operators",
    title: "7. Subqueries, Membership & Set Operators",
    subtitle: "Nested queries, correlated logic, existential clauses, and sets.",
    description: "Subqueries nest queries inside other SQL statements to perform multi-step operations. Set operators combine results from separate SELECT statements.",
    sections: [
      {
        title: "Subquery Categories & Correlated Queries",
        description: "Subqueries are queries nested within SELECT, FROM, or WHERE clauses.",
        tableData: {
          headers: ["Subquery Type", "Expected Return Value", "Evaluation Method", "Standard SQL Use Case"],
          rows: [
            ["Single Row", "Returns a single value (one cell).", "Evaluates once. Uses =, !=, <, >.", "WHERE salary > (SELECT AVG(salary) FROM doctors)"],
            ["Multiple Row", "Returns a single column with multiple rows.", "Evaluates once. Uses IN, ANY, ALL.", "WHERE id IN (SELECT doctor_id FROM appointments)"],
            ["Correlated", "Returns values that change based on outer query columns.", "Evaluates once per row in the outer query. Slow on large tables.", "Finding patients whose age exceeds their specialty's average."]
          ]
        },
        example: "-- Correlated Subquery Example:\nSELECT d1.name, d1.specialty, d1.salary \nFROM doctors d1 \nWHERE d1.salary > (\n  SELECT AVG(d2.salary) \n  FROM doctors d2 \n  WHERE d2.specialty = d1.specialty\n);\n-- Finds doctors earning more than their specific specialty's average salary."
      },
      {
        title: "Existential & Set Membership Operators",
        description: "Existential and set membership operators validate if records exist inside subqueries.",
        tableData: {
          headers: ["Operator", "Logical Action", "Primary Advantage", "ANSI Example Syntax"],
          rows: [
            ["IN", "Checks if a value is present in a static set or subquery.", "Very readable and intuitive.", "WHERE city IN ('Chicago', 'New York')"],
            ["EXISTS", "Returns TRUE if the subquery returns at least one row.", "Fast. Stops scanning once a match is found.", "WHERE EXISTS (SELECT 1 FROM orders o WHERE o.c_id = c.id)"],
            ["NOT EXISTS", "Returns TRUE if the subquery returns zero rows.", "Great for locating missing links.", "WHERE NOT EXISTS (SELECT 1 FROM audits a WHERE a.p_id = p.id)"],
            ["ANY / SOME", "Returns TRUE if any row in the subquery meets the condition.", "Useful for dynamic boundary checks.", "WHERE salary > ANY (SELECT base_salary FROM peers)"],
            ["ALL", "Returns TRUE only if all rows in the subquery meet the condition.", "Useful for strict boundary checks.", "WHERE salary > ALL (SELECT salary FROM trainees)"]
          ]
        },
        tips: [
          "EXISTS does not return data cells; it only checks for the existence of matching rows. It is highly optimized because the database can stop execution immediately once a matching record is found.",
          "When using NOT IN with subqueries, if the subquery returns even a single NULL value, the entire outer query will return zero records. Use NOT EXISTS instead to avoid this issue."
        ]
      },
      {
        title: "Set Operators (UNION, EXCEPT, INTERSECT)",
        description: "Set operators combine results from separate queries vertically, whereas JOINs connect columns horizontally.",
        tableData: {
          headers: ["Set Operator", "Set Theory Logic", "Duplicate Handling", "Structural Requirement"],
          rows: [
            ["UNION", "Combines results of both queries (A ∪ B).", "Removes duplicate rows.", "Queries must have matching column counts and datatypes in order."],
            ["UNION ALL", "Combines results of both queries (A ∪ B).", "Retains duplicate rows (Faster).", "Queries must have matching column counts and datatypes in order."],
            ["INTERSECT", "Returns only rows present in both queries (A ∩ B).", "Removes duplicates (Concept).", "Supported conceptually; queries must have identical projections."],
            ["EXCEPT / MINUS", "Returns rows present in Left but missing in Right (A - B).", "Removes duplicates (Concept).", "Supported conceptually; queries must have identical projections."]
          ]
        },
        syntax: "-- UNION Example:\nSELECT name, email, 'Staff' AS role FROM employees\nUNION\nSELECT name, email, 'Client' AS role FROM customers\nORDER BY name ASC;"
      }
    ]
  },
  {
    id: "advanced-objects-transactions",
    title: "8. Views, Indexes, Transactions & Window Functions",
    subtitle: "Virtual tables, database indexes, ACID properties, and analytic window functions.",
    description: "These advanced concepts manage performance, enforce transaction safety, and enable complex analytics over partitions of data.",
    sections: [
      {
        title: "Database Objects: Views & Indexes",
        description: "Views and Indexes are virtual structures built on top of physical tables to secure data and optimize query performance.",
        tableData: {
          headers: ["Database Object", "Logical Definition", "Physical Action", "Primary Advantage"],
          rows: [
            ["View", "A saved SELECT statement that acts as a virtual table.", "Does not store copy data on disk; queries base tables dynamically.", "Simplifies complex queries and secures column access."],
            ["Index", "A physical data structure (usually B-Tree or Hash) that maps column keys to row locations.", "Saves a sorted key list to speed up searches.", "Transforms full table scans into fast index searches."]
          ]
        },
        syntax: "-- CREATE VIEW Syntax:\nCREATE VIEW active_cardiology_patients AS\nSELECT p.id, p.name, a.appointment_date \nFROM patients p\nJOIN appointments a ON p.id = a.patient_id\nWHERE a.department = 'Cardiology' AND a.status = 'Active';\n\n-- CREATE INDEX Syntax:\nCREATE INDEX idx_patients_email ON patients(email);"
      },
      {
        title: "Transactions, SAVEPOINTs & ACID Properties",
        description: "A transaction is a series of SQL operations treated as a single unit of work. Transactions ensure data integrity and prevent partial writes.",
        tableData: {
          headers: ["Command / Property", "Concept Type", "Logical Behavior", "Real-World Context"],
          rows: [
            ["BEGIN TRANSACTION", "SQL Command", "Starts a new transaction block.", "Begins the transfer of funds between accounts."],
            ["COMMIT", "SQL Command", "Permanently saves all changes made in the transaction to disk.", "Completes the money transfer safely."],
            ["ROLLBACK", "SQL Command", "Undoes all changes made within the current transaction block.", "Rolls back changes if a network error occurs mid-transfer."],
            ["SAVEPOINT", "SQL Command", "Sets a checkpoint inside a transaction block to roll back to.", "Splits a multi-step upload into checkpointed steps."],
            ["Atomicity (A)", "ACID Property", "All operations in a transaction succeed, or the entire transaction fails.", "Prevents money from being debited without being credited."],
            ["Consistency (C)", "ACID Property", "Transactions must move the database from one valid state to another.", "Ensures account balances never drop below zero during transfers."],
            ["Isolation (I)", "ACID Property", "Concurrent transactions execute independently without interference.", "Prevents two users from buying the same seat simultaneously."],
            ["Durability (D)", "ACID Property", "Once committed, changes are safe from system crashes or failures.", "Ensures transaction logs are saved to non-volatile disk storage."]
          ]
        },
        example: "-- Transaction Example:\nBEGIN TRANSACTION;\nUPDATE accounts SET balance = balance - 100 WHERE account_id = 101;\nSAVEPOINT post_debit;\nUPDATE accounts SET balance = balance + 100 WHERE account_id = 102;\n-- If transfer fails here:\nROLLBACK TO SAVEPOINT post_debit;\n-- If transfer succeeds:\nCOMMIT;"
      },
      {
        title: "Window Functions & Analytic Partitions",
        description: "Window functions calculate values across a set of rows related to the current row, without grouping them into a single output row.",
        tableData: {
          headers: ["Window Function", "Analytic Purpose", "Syntax Structure", "Use Case Context"],
          rows: [
            ["ROW_NUMBER()", "Assigns a unique sequential integer to each row in a partition.", "ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)", "Assigning rank numbers to patient visits in order."],
            ["RANK()", "Assigns rank with gaps if duplicate values exist.", "RANK() OVER (PARTITION BY ... ORDER BY ...)", "Ranking doctors by salary, with tied salaries sharing ranks."],
            ["DENSE_RANK()", "Assigns rank without gaps for duplicate values.", "DENSE_RANK() OVER (PARTITION BY ... ORDER BY ...)", "Ranking departments by budget tiers without skipping rank integers."],
            ["LEAD(col, offset)", "Accesses data from subsequent rows without a self-join.", "LEAD(salary, 1) OVER (ORDER BY ...)", "Comparing a doctor's salary directly with the next highest earner."],
            ["LAG(col, offset)", "Accesses data from preceding rows without a self-join.", "LAG(appointment_date, 1) OVER (ORDER BY ...)", "Calculating days elapsed since a patient's last appointment."]
          ]
        },
        example: "SELECT \n  name, specialty, salary,\n  ROW_NUMBER() OVER (PARTITION BY specialty ORDER BY salary DESC) AS spec_rank,\n  LAG(salary, 1) OVER (PARTITION BY specialty ORDER BY salary ASC) AS prev_lower_sal\nFROM doctors;",
        tips: [
          "Triggers are special stored programs automatically run by the DBMS in response to specific events (INSERT, UPDATE, DELETE) on a table. They are used to audit history logs, update statistics, or enforce complex data rules."
        ]
      }
    ]
  },
  {
    id: "er-modeling-normalization",
    title: "9. ER Diagrams, Relationships & Normalization (1NF to BCNF)",
    subtitle: "Entity-Relationship modeling, relationship cardinality, and normalization normal forms.",
    description: "Database design ensures data is organized efficiently. Normalization eliminates data redundancy and prevents anomalies on write.",
    sections: [
      {
        title: "Entity-Relationship (ER) Modeling Concepts",
        description: "An ER Diagram represents the logical layout of a database by defining entities, attributes, and relationships.",
        tableData: {
          headers: ["Concept", "ER Diagram Element", "Logical Meaning", "Example Case"],
          rows: [
            ["Entity", "Rectangle Box", "A real-world object or concept stored in the database.", "Patient, Doctor, Appointment."],
            ["Attribute", "Oval Ellipse", "A property or characteristic of an entity.", "Patient Name, Doctor Specialty."],
            ["Relationship", "Diamond Shape", "An association or link between entities.", "Patient 'schedules' an Appointment."],
            ["Cardinality", "Connecting Lines", "Describes the numerical limits of relationships (1:1, 1:N, N:M).", "One Doctor can treat many Patients (1:N relationship)."]
          ]
        },
        tips: [
          "1:1 (One-to-One): A user has exactly one profile.",
          "1:N (One-to-Many): A department has many employees.",
          "N:M (Many-to-Many): Students enroll in many classes. Many-to-Many relationships require a bridge/junction table to resolve links in a relational database."
        ]
      },
      {
        title: "Database Normalization Forms (1NF to BCNF)",
        description: "Normalization structures database tables to remove duplicate data anomalies (Insertion, Update, and Deletion anomalies).",
        tableData: {
          headers: ["Normal Form", "Core Rule & Requirement", "Anomalies Prevented", "Practical Implementation"],
          rows: [
            ["1NF (First Normal Form)", "All cells must contain atomic (indivisible) values. No repeating groups or comma-separated lists.", "Insertion. Prevents storing multiple phone numbers in a single cell.", "Split comma-separated values into individual, dedicated rows."],
            ["2NF (Second Normal Form)", "Must be in 1NF, and all non-key columns must fully depend on the entire Primary Key (No partial dependencies).", "Update. Prevents repeating static master data across child tables.", "Move columns depending on only part of a composite key to a separate table."],
            ["3NF (Third Normal Form)", "Must be in 2NF, and no non-key columns can depend on other non-key columns (No transitive dependencies).", "Deletion. Prevents losing master category details when a child record is deleted.", "Move transitive dependencies (e.g., zip_code determining city) to their own lookup table."],
            ["BCNF (Boyce-Codd Normal Form)", "Must be in 3NF, and for every functional dependency A -> B, A must be a super key. A stricter version of 3NF.", "Redundancy in complex overlapping composite keys.", "Decompose overlapping key relationships into separate independent tables."]
          ]
        },
        example: "-- De-normalization anomaly example (Non-Atomic 1NF failure):\n-- INCORRECT: Patient(id, name, phones: '555-0192, 555-0193')\n-- CORRECT 1NF: Row 1: Patient(101, 'Jane', '555-0192') | Row 2: Patient(101, 'Jane', '555-0193')\n\n-- Transitive dependency example (3NF failure):\n-- INCORRECT: Doctor(id, name, department_id, department_name)\n-- Here, department_name depends on department_id, which depends on id. department_name is transitively dependent!\n-- CORRECT 3NF: Table 1: Doctor(id, name, department_id) | Table 2: Department(department_id, department_name)"
      }
    ]
  }
];
