// @ts-nocheck
import { DomainData } from "../types";

export const healthcareData: DomainData = {
  id: "healthcare",
  name: "Healthcare",
  icon: "Activity",
  businessScenario: "You are the Lead Data Analyst for 'Apex General Hospital'. The hospital manages a growing database of patients, doctors, appointments, and billing transactions. Management wants to optimize patient flow, track staff productivity, analyze revenue channels, and find patient demographics without using joins.",
  realWorldUse: "Healthcare institutions rely on SQL to track patient outcomes, manage scheduling systems, verify insurance coverage, calculate billings, and generate reports for clinical audits and regulatory compliance.",
  importance: "Clinical analysts use SQL daily to find high-risk patient subgroups, monitor occupancy rates, evaluate doctor performance metrics, and audit billing transactions for discrepancies.",
  tables: [
    {
      name: "patients",
      description: "Stores demographic and clinical registration info of patients admitted/registered at the clinic.",
      columns: [
        { name: "patient_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique identifier for the patient" },
        { name: "name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Full name of the patient" },
        { name: "age", type: "INT", constraints: "CHECK (age >= 0)", description: "Age of the patient in years" },
        { name: "gender", type: "VARCHAR(10)", constraints: "NOT NULL", description: "Gender of the patient" },
        { name: "city", type: "VARCHAR(50)", constraints: "DEFAULT 'Unknown'", description: "City of residence" },
        { name: "blood_group", type: "VARCHAR(5)", constraints: "NOT NULL", description: "Patient's blood group" },
        { name: "admission_date", type: "DATE", constraints: "NOT NULL", description: "Date of admission/registration" },
        { name: "discharge_date", type: "DATE", constraints: "NULL", description: "Date of discharge from the facility" }
      ],
      createScript: `CREATE TABLE patients (
  patient_id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  age INT CHECK (age >= 0),
  gender VARCHAR(10) NOT NULL,
  city VARCHAR(50) DEFAULT 'Unknown',
  blood_group VARCHAR(5) NOT NULL,
  admission_date DATE NOT NULL,
  discharge_date DATE NULL
);`,
      insertScript: `INSERT INTO patients (patient_id, name, age, gender, city, blood_group, admission_date, discharge_date) VALUES
(101, 'Robert Johnson', 45, 'Male', 'New York', 'A+', '2026-01-10', '2026-01-15'),
(102, 'Emily Davis', 28, 'Female', 'Boston', 'O-', '2026-01-12', '2026-01-14'),
(103, 'Michael Smith', 62, 'Male', 'Chicago', 'B+', '2026-01-15', '2026-01-22'),
(104, 'Sarah Connor', 35, 'Female', 'Los Angeles', 'AB-', '2026-01-18', '2026-01-20'),
(105, 'David Miller', 50, 'Male', 'Boston', 'A-', '2026-01-22', '2026-01-28'),
(106, 'Jessica Taylor', 19, 'Female', 'New York', 'O+', '2026-02-01', NULL),
(107, 'James Wilson', 71, 'Male', 'Chicago', 'O+', '2026-02-05', '2026-02-12'),
(108, 'Patricia Brown', 42, 'Female', 'Atlanta', 'B-', '2026-02-10', '2026-02-12'),
(109, 'John Doe', 31, 'Male', 'New York', 'A+', '2026-02-14', '2026-02-15'),
(110, 'Linda Thomas', 58, 'Female', 'Miami', 'AB+', '2026-02-18', NULL),
(111, 'William Jackson', 67, 'Male', 'Dallas', 'O-', '2026-02-22', '2026-03-01'),
(112, 'Elizabeth White', 24, 'Female', 'Atlanta', 'B+', '2026-02-25', '2026-02-26'),
(113, 'Charles Harris', 49, 'Male', 'Boston', 'O+', '2026-03-02', '2026-03-10'),
(114, 'Barbara Martin', 73, 'Female', 'Chicago', 'A-', '2026-03-05', NULL),
(115, 'Richard Thompson', 53, 'Male', 'Seattle', 'AB-', '2026-03-12', '2026-03-15'),
(116, 'Susan Garcia', 41, 'Female', 'Miami', 'O+', '2026-03-15', '2026-03-18'),
(117, 'Thomas Martinez', 30, 'Male', 'Seattle', 'B+', '2026-03-18', '2026-03-19'),
(118, 'Margaret Robinson', 65, 'Female', 'Dallas', 'A+', '2026-03-20', '2026-03-25'),
(119, 'Christopher Clark', 38, 'Male', 'Los Angeles', 'O-', '2026-03-22', '2026-03-24'),
(120, 'Nancy Rodriguez', 81, 'Female', 'New York', 'B-', '2026-03-24', NULL);`,
      rawRows: [
        { patient_id: 101, name: "Robert Johnson", age: 45, gender: "Male", city: "New York", blood_group: "A+", admission_date: "2026-01-10", discharge_date: "2026-01-15" },
        { patient_id: 102, name: "Emily Davis", age: 28, gender: "Female", city: "Boston", blood_group: "O-", admission_date: "2026-01-12", discharge_date: "2026-01-14" },
        { patient_id: 103, name: "Michael Smith", age: 62, gender: "Male", city: "Chicago", blood_group: "B+", admission_date: "2026-01-15", discharge_date: "2026-01-22" },
        { patient_id: 104, name: "Sarah Connor", age: 35, gender: "Female", city: "Los Angeles", blood_group: "AB-", admission_date: "2026-01-18", discharge_date: "2026-01-20" },
        { patient_id: 105, name: "David Miller", age: 50, gender: "Male", city: "Boston", blood_group: "A-", admission_date: "2026-01-22", discharge_date: "2026-01-28" },
        { patient_id: 106, name: "Jessica Taylor", age: 19, gender: "Female", city: "New York", blood_group: "O+", admission_date: "2026-02-01", discharge_date: null },
        { patient_id: 107, name: "James Wilson", age: 71, gender: "Male", city: "Chicago", blood_group: "O+", admission_date: "2026-02-05", discharge_date: "2026-02-12" },
        { patient_id: 108, name: "Patricia Brown", age: 42, gender: "Female", city: "Atlanta", blood_group: "B-", admission_date: "2026-02-10", discharge_date: "2026-02-12" },
        { patient_id: 109, name: "John Doe", age: 31, gender: "Male", city: "New York", blood_group: "A+", admission_date: "2026-02-14", discharge_date: "2026-02-15" },
        { patient_id: 110, name: "Linda Thomas", age: 58, gender: "Female", city: "Miami", blood_group: "AB+", admission_date: "2026-02-18", discharge_date: null },
        { patient_id: 111, name: "William Jackson", age: 67, gender: "Male", city: "Dallas", blood_group: "O-", admission_date: "2026-02-22", discharge_date: "2026-03-01" },
        { patient_id: 112, name: "Elizabeth White", age: 24, gender: "Female", city: "Atlanta", blood_group: "B+", admission_date: "2026-02-25", discharge_date: "2026-02-26" },
        { patient_id: 113, name: "Charles Harris", age: 49, gender: "Male", city: "Boston", blood_group: "O+", admission_date: "2026-03-02", discharge_date: "2026-03-10" },
        { patient_id: 114, name: "Barbara Martin", age: 73, gender: "Female", city: "Chicago", blood_group: "A-", admission_date: "2026-03-05", discharge_date: null },
        { patient_id: 115, name: "Richard Thompson", age: 53, gender: "Male", city: "Seattle", blood_group: "AB-", admission_date: "2026-03-12", discharge_date: "2026-03-15" },
        { patient_id: 116, name: "Susan Garcia", age: 41, gender: "Female", city: "Miami", blood_group: "O+", admission_date: "2026-03-15", discharge_date: "2026-03-18" },
        { patient_id: 117, name: "Thomas Martinez", age: 30, gender: "Male", city: "Seattle", blood_group: "B+", admission_date: "2026-03-18", discharge_date: "2026-03-19" },
        { patient_id: 118, name: "Margaret Robinson", age: 65, gender: "Female", city: "Dallas", blood_group: "A+", admission_date: "2026-03-20", discharge_date: "2026-03-25" },
        { patient_id: 119, name: "Christopher Clark", age: 38, gender: "Male", city: "Los Angeles", blood_group: "O-", admission_date: "2026-03-22", discharge_date: "2026-03-24" },
        { patient_id: 120, name: "Nancy Rodriguez", age: 81, gender: "Female", city: "New York", blood_group: "B-", admission_date: "2026-03-24", discharge_date: null }
      ]
    },
    {
      name: "doctors",
      description: "Stores clinical experience, specialization, and administrative metrics of physicians.",
      columns: [
        { name: "doctor_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique physician ID" },
        { name: "name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Full name of the doctor" },
        { name: "specialty", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Medical specialization" },
        { name: "department", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Medical department" },
        { name: "experience_years", type: "INT", constraints: "CHECK (experience_years >= 0)", description: "Years of active clinic experience" },
        { name: "salary", type: "DECIMAL(10,2)", constraints: "NOT NULL", description: "Monthly base salary" },
        { name: "consultation_fee", type: "DECIMAL(6,2)", constraints: "NOT NULL", description: "Direct fee charged for an appointment" }
      ],
      createScript: `CREATE TABLE doctors (
  doctor_id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  specialty VARCHAR(50) NOT NULL,
  department VARCHAR(50) NOT NULL,
  experience_years INT CHECK (experience_years >= 0),
  salary DECIMAL(10,2) NOT NULL,
  consultation_fee DECIMAL(6,2) NOT NULL
);`,
      insertScript: `INSERT INTO doctors (doctor_id, name, specialty, department, experience_years, salary, consultation_fee) VALUES
(201, 'Dr. Alice Carter', 'Cardiology', 'Cardiology Dept', 14, 12500.00, 150.00),
(202, 'Dr. Brian Evans', 'Pediatrics', 'Pediatrics Dept', 8, 9500.00, 80.00),
(203, 'Dr. Clara Vance', 'Neurology', 'Neurology Dept', 18, 16000.00, 200.00),
(204, 'Dr. Daniel Kim', 'Dermatology', 'Dermatology Dept', 5, 8000.00, 75.00),
(205, 'Dr. Evelyn Martinez', 'Cardiology', 'Cardiology Dept', 11, 11800.00, 140.00),
(206, 'Dr. Franklin Hope', 'Orthopedics', 'Surgery Dept', 16, 14500.00, 175.00),
(207, 'Dr. Grace Lee', 'Oncology', 'Oncology Dept', 12, 13500.00, 190.00),
(208, 'Dr. Harold Smith', 'General Medicine', 'Internal Medicine', 20, 11000.00, 60.00),
(209, 'Dr. Irene Adler', 'Pediatrics', 'Pediatrics Dept', 6, 9000.00, 85.00),
(210, 'Dr. Jeremy Fisher', 'Gastroenterology', 'Internal Medicine', 9, 10500.00, 110.00),
(211, 'Dr. Karen Page', 'General Medicine', 'Internal Medicine', 4, 7500.00, 50.00),
(212, 'Dr. Lawrence Stark', 'Neurology', 'Neurology Dept', 15, 15000.00, 220.00),
(213, 'Dr. Monica Geller', 'Orthopedics', 'Surgery Dept', 7, 10000.00, 130.00),
(214, 'Dr. Neil Perry', 'Psychiatry', 'Psychiatry Dept', 13, 11500.00, 120.00),
(215, 'Dr. Olivia Wilde', 'Dermatology', 'Dermatology Dept', 10, 9200.00, 90.00);`,
      rawRows: [
        { doctor_id: 201, name: "Dr. Alice Carter", specialty: "Cardiology", department: "Cardiology Dept", experience_years: 14, salary: 12500, consultation_fee: 150 },
        { doctor_id: 202, name: "Dr. Brian Evans", specialty: "Pediatrics", department: "Pediatrics Dept", experience_years: 8, salary: 9500, consultation_fee: 80 },
        { doctor_id: 203, name: "Dr. Clara Vance", specialty: "Neurology", department: "Neurology Dept", experience_years: 18, salary: 16000, consultation_fee: 200 },
        { doctor_id: 204, name: "Dr. Daniel Kim", specialty: "Dermatology", department: "Dermatology Dept", experience_years: 5, salary: 8000, consultation_fee: 75 },
        { doctor_id: 205, name: "Dr. Evelyn Martinez", specialty: "Cardiology", department: "Cardiology Dept", experience_years: 11, salary: 11800, consultation_fee: 140 },
        { doctor_id: 206, name: "Dr. Franklin Hope", specialty: "Orthopedics", department: "Surgery Dept", experience_years: 16, salary: 14500, consultation_fee: 175 },
        { doctor_id: 207, name: "Dr. Grace Lee", specialty: "Oncology", department: "Oncology Dept", experience_years: 12, salary: 13500, consultation_fee: 190 },
        { doctor_id: 208, name: "Dr. Harold Smith", specialty: "General Medicine", department: "Internal Medicine", experience_years: 20, salary: 11000, consultation_fee: 60 },
        { doctor_id: 209, name: "Dr. Irene Adler", specialty: "Pediatrics", department: "Pediatrics Dept", experience_years: 6, salary: 9000, consultation_fee: 85 },
        { doctor_id: 210, name: "Dr. Jeremy Fisher", specialty: "Gastroenterology", department: "Internal Medicine", experience_years: 9, salary: 10500, consultation_fee: 110 },
        { doctor_id: 211, name: "Dr. Karen Page", specialty: "General Medicine", department: "Internal Medicine", experience_years: 4, salary: 7500, consultation_fee: 50 },
        { doctor_id: 212, name: "Dr. Lawrence Stark", specialty: "Neurology", department: "Neurology Dept", experience_years: 15, salary: 15000, consultation_fee: 220 },
        { doctor_id: 213, name: "Dr. Monica Geller", specialty: "Orthopedics", department: "Surgery Dept", experience_years: 7, salary: 10000, consultation_fee: 130 },
        { doctor_id: 214, name: "Dr. Neil Perry", specialty: "Psychiatry", department: "Psychiatry Dept", experience_years: 13, salary: 11500, consultation_fee: 120 },
        { doctor_id: 215, name: "Dr. Olivia Wilde", specialty: "Dermatology", department: "Dermatology Dept", experience_years: 10, salary: 9200, consultation_fee: 90 }
      ]
    },
    {
      name: "appointments",
      description: "Log of appointments, containing specific status, financial obligations, and clinical scheduling.",
      columns: [
        { name: "appointment_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique reference index" },
        { name: "patient_id", type: "INT", constraints: "FOREIGN KEY REFERENCES patients", description: "Associated patient (ID 101-120)" },
        { name: "doctor_id", type: "INT", constraints: "FOREIGN KEY REFERENCES doctors", description: "Physician handling the consultation (ID 201-215)" },
        { name: "appointment_date", type: "DATE", constraints: "NOT NULL", description: "Scheduled clinic appointment date" },
        { name: "status", type: "VARCHAR(20)", constraints: "CHECK (status IN ('Completed', 'Pending', 'Cancelled'))", description: "Execution status of appointment" },
        { name: "billing_amount", type: "DECIMAL(8,2)", constraints: "NOT NULL", description: "Charged amount for visit medicines & procedures" }
      ],
      createScript: `CREATE TABLE appointments (
  appointment_id INT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('Completed', 'Pending', 'Cancelled')),
  billing_amount DECIMAL(8,2) NOT NULL
);`,
      insertScript: `INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, status, billing_amount) VALUES
(3001, 101, 201, '2026-01-11', 'Completed', 450.00),
(3002, 102, 202, '2026-01-12', 'Completed', 180.00),
(3003, 103, 203, '2026-01-16', 'Completed', 1250.00),
(3004, 104, 204, '2026-01-19', 'Cancelled', 0.00),
(3005, 105, 201, '2026-01-23', 'Completed', 520.00),
(3006, 106, 205, '2026-02-02', 'Completed', 140.00),
(3007, 107, 208, '2026-02-06', 'Completed', 90.00),
(3008, 108, 209, '2026-02-11', 'Completed', 350.00),
(3009, 109, 201, '2026-02-14', 'Cancelled', 0.00),
(3010, 110, 207, '2026-02-20', 'Pending', 190.00),
(3011, 111, 206, '2026-02-23', 'Completed', 850.00),
(3012, 112, 202, '2026-02-25', 'Completed', 80.00),
(3013, 113, 205, '2026-03-03', 'Completed', 600.00),
(3014, 114, 208, '2026-03-06', 'Pending', 60.00),
(3015, 115, 212, '2026-03-13', 'Completed', 1100.00),
(3016, 116, 215, '2026-03-16', 'Completed', 220.00),
(3017, 117, 213, '2026-03-18', 'Completed', 410.00),
(3018, 118, 206, '2026-03-21', 'Completed', 780.00),
(3019, 119, 214, '2026-03-23', 'Cancelled', 0.00),
(3020, 120, 203, '2026-03-25', 'Completed', 1500.00);`,
      rawRows: [
        { appointment_id: 3001, patient_id: 101, doctor_id: 201, appointment_date: "2026-01-11", status: "Completed", billing_amount: 450 },
        { appointment_id: 3002, patient_id: 102, doctor_id: 202, appointment_date: "2026-01-12", status: "Completed", billing_amount: 180 },
        { appointment_id: 3003, patient_id: 103, doctor_id: 203, appointment_date: "2026-01-16", status: "Completed", billing_amount: 1250 },
        { appointment_id: 3004, patient_id: 104, doctor_id: 204, appointment_date: "2026-01-19", status: "Cancelled", billing_amount: 0 },
        { appointment_id: 3005, patient_id: 105, doctor_id: 201, appointment_date: "2026-01-23", status: "Completed", billing_amount: 520 },
        { appointment_id: 3006, patient_id: 106, doctor_id: 205, appointment_date: "2026-02-02", status: "Completed", billing_amount: 140 },
        { appointment_id: 3007, patient_id: 107, doctor_id: 208, appointment_date: "2026-02-06", status: "Completed", billing_amount: 90 },
        { appointment_id: 3008, patient_id: 108, doctor_id: 209, appointment_date: "2026-02-11", status: "Completed", billing_amount: 350 },
        { appointment_id: 3009, patient_id: 109, doctor_id: 201, appointment_date: "2026-02-14", status: "Cancelled", billing_amount: 0 },
        { appointment_id: 3010, patient_id: 110, doctor_id: 207, appointment_date: "2026-02-20", status: "Pending", billing_amount: 190 },
        { appointment_id: 3011, patient_id: 111, doctor_id: 206, appointment_date: "2026-02-23", status: "Completed", billing_amount: 850 },
        { appointment_id: 3012, patient_id: 112, doctor_id: 202, appointment_date: "2026-02-25", status: "Completed", billing_amount: 80 },
        { appointment_id: 3013, patient_id: 113, doctor_id: 205, appointment_date: "2026-03-03", status: "Completed", billing_amount: 600 },
        { appointment_id: 3014, patient_id: 114, doctor_id: 208, appointment_date: "2026-03-06", status: "Pending", billing_amount: 60 },
        { appointment_id: 3015, patient_id: 115, doctor_id: 212, appointment_date: "2026-03-13", status: "Completed", billing_amount: 1100 },
        { appointment_id: 3016, patient_id: 116, doctor_id: 215, appointment_date: "2026-03-16", status: "Completed", billing_amount: 220 },
        { appointment_id: 3017, patient_id: 117, doctor_id: 213, appointment_date: "2026-03-18", status: "Completed", billing_amount: 410 },
        { appointment_id: 3018, patient_id: 118, doctor_id: 206, appointment_date: "2026-03-21", status: "Completed", billing_amount: 780 },
        { appointment_id: 3019, patient_id: 119, doctor_id: 214, appointment_date: "2026-03-23", status: "Cancelled", billing_amount: 0 },
        { appointment_id: 3020, patient_id: 120, doctor_id: 203, appointment_date: "2026-03-25", status: "Completed", billing_amount: 1500 }
      ]
    }
  ],
  questions: [
    // --- 20 BASIC / BEGINNER QUESTIONS ---
    {
      id: "HC-B01",
      text: "Display all columns and rows from the patients table.",
      expectedQuery: "SELECT * FROM patients",
      difficulty: "Beginner",
      category: "SELECT & Filtering",
      hints: ["The wildcard symbol * selects all columns.", "The table is named patients."],
      explanation: "This query extracts all details for all registered patients."
    },
    {
      id: "HC-B02",
      text: "List only the distinct cities where our patients live.",
      expectedQuery: "SELECT DISTINCT city FROM patients",
      difficulty: "Beginner",
      category: "SELECT & Filtering",
      hints: ["Use the DISTINCT keyword before the column name.", "The column is called city."],
      explanation: "This displays each unique city represented in the database once."
    },
    {
      id: "HC-B03",
      text: "Find all patients who are strictly above 40 years of age.",
      expectedQuery: "SELECT * FROM patients WHERE age > 40",
      difficulty: "Beginner",
      category: "SELECT & Filtering",
      hints: ["Use the WHERE clause to check conditions.", "Use the greater-than operator > with number 40."],
      explanation: "Retrieves rows prioritizing senior patient demographics."
    },
    {
      id: "HC-B04",
      text: "List all patients who identify as Female.",
      expectedQuery: "SELECT * FROM patients WHERE gender = 'Female'",
      difficulty: "Beginner",
      category: "SELECT & Filtering",
      hints: ["Filter by gender = 'Female'.", "The query runs on the patients table."],
      explanation: "Applies a singular text constraint parameter under the WHERE clause."
    },
    {
      id: "HC-B05",
      text: "Find doctors who have 12 or more years of experience.",
      expectedQuery: "SELECT * FROM doctors WHERE experience_years >= 12",
      difficulty: "Beginner",
      category: "Comparison Operators",
      hints: ["Filter the doctors table.", "Target experience_years and use the operator >=."],
      explanation: "Filters the medical staff to target senior physicians."
    },
    {
      id: "HC-B06",
      text: "Show doctors whose specialty is 'Cardiology' and monthly salary is above $12,000.",
      expectedQuery: "SELECT * FROM doctors WHERE specialty = 'Cardiology' AND salary > 12000",
      difficulty: "Beginner",
      category: "Logical Operators",
      hints: ["Combine two filters using the logical AND operator.", "String parameters must be in single quotes."],
      explanation: "Discovers highly specialized staff meeting specific salary tiers."
    },
    {
      id: "HC-B07",
      text: "Show patients who are residents of either 'Boston', 'Chicago', or 'Atlanta'.",
      expectedQuery: "SELECT * FROM patients WHERE city IN ('Boston', 'Chicago', 'Atlanta')",
      difficulty: "Beginner",
      category: "Operators",
      hints: ["The IN operator is ideal for matching multiple values.", "Put city values in parentheses, separated by commas."],
      explanation: "Simplifies multiple OR conditions mapping specific operating cities."
    },
    {
      id: "HC-B08",
      text: "Find patients whose age is between 30 and 50 inclusive.",
      expectedQuery: "SELECT * FROM patients WHERE age BETWEEN 30 AND 50",
      difficulty: "Beginner",
      category: "Operators",
      hints: ["The BETWEEN operator includes both endpoints.", "Structure: WHERE age BETWEEN val1 AND val2."],
      explanation: "Selects patients mapping the mid-management age profile."
    },
    {
      id: "HC-B09",
      text: "Find patients whose names start with the letter 'R'.",
      expectedQuery: "SELECT * FROM patients WHERE name LIKE 'R%'",
      difficulty: "Beginner",
      category: "Operators",
      hints: ["Use the LIKE operator for pattern matching.", "The wildcard % represents zero or more characters."],
      explanation: "Performs prefix string scanning using standard wildcards."
    },
    {
      id: "HC-B10",
      text: "List all patients who have not been discharged yet (where discharge_date is blank).",
      expectedQuery: "SELECT * FROM patients WHERE discharge_date IS NULL",
      difficulty: "Beginner",
      category: "Operators",
      hints: ["Never use = NULL in SQL.", "Use the IS NULL operator to scan empty columns."],
      explanation: "Identifies patients currently occupying beds at the facility."
    },
    {
      id: "HC-B11",
      text: "List doctor names and consultations fees, ordered by consultation fee from highest to lowest.",
      expectedQuery: "SELECT name, consultation_fee FROM doctors ORDER BY consultation_fee DESC",
      difficulty: "Beginner",
      category: "ORDER BY",
      hints: ["Target specific column list, not *.", "Use ORDER BY with DESC keyword for descending order."],
      explanation: "Sorts active staff based on consultant pricing metrics."
    },
    {
      id: "HC-B12",
      text: "Display the 5 oldest patients registration records in the database.",
      expectedQuery: "SELECT * FROM patients ORDER BY age DESC LIMIT 5",
      difficulty: "Beginner",
      category: "LIMIT & TOP",
      hints: ["First order rows by age descending.", "Then append LIMIT 5 to constraint row output count."],
      explanation: "Queries the highest aged demographic profiles registered."
    },
    {
      id: "HC-B13",
      text: "List the unique blood types available in the clinic register, sorted alphabetically.",
      expectedQuery: "SELECT DISTINCT blood_group FROM patients ORDER BY blood_group ASC",
      difficulty: "Beginner",
      category: "ORDER BY",
      hints: ["Use DISTINCT on blood_group.", "Order alphabetically using ASC or default ordering."],
      explanation: "Provides blood banking inventory staff with sorted options."
    },
    {
      id: "HC-B14",
      text: "Find all completed appointments with a billing amount greater than $500.",
      expectedQuery: "SELECT * FROM appointments WHERE status = 'Completed' AND billing_amount > 500",
      difficulty: "Beginner",
      category: "Operators",
      hints: ["The table is appointments.", "Check status = 'Completed' and billing_amount > 500."],
      explanation: "Tracks high-value transactions completed with outpatient visits."
    },
    {
      id: "HC-B15",
      text: "Find all appointments scheduled in 'January 2026' (between '2026-01-01' and '2026-01-31').",
      expectedQuery: "SELECT * FROM appointments WHERE appointment_date BETWEEN '2026-01-01' AND '2026-01-31'",
      difficulty: "Beginner",
      category: "Operators",
      hints: ["Use BETWEEN for date parameters formatted as 'YYYY-MM-DD'.", "The source table is appointments."],
      explanation: "Extracts clinical volume metrics for the first month of the annual budget."
    },
    {
      id: "HC-B16",
      text: "List all patients whose names contain the sequence 'Smith' (case insensitive).",
      expectedQuery: "SELECT * FROM patients WHERE name LIKE '%Smith%'",
      difficulty: "Beginner",
      category: "Operators",
      hints: ["Percent wildcards should flank the search string: '%Smith%'.", "This scans for anywhere inside the field."],
      explanation: "Performs full-name substring fuzzy checks for clinical logs."
    },
    {
      id: "HC-B17",
      text: "Show the name and consultation fee of all doctors who charge between $50 and $100 for appointments.",
      expectedQuery: "SELECT name, consultation_fee FROM doctors WHERE consultation_fee BETWEEN 50 AND 100",
      difficulty: "Beginner",
      category: "Operators",
      hints: ["Filter column consultation_fee using BETWEEN.", "Only select name and consultation_fee in the result list."],
      explanation: "Assists customer support in finding doctors matching standard insurance tiers."
    },
    {
      id: "HC-B18",
      text: "Count the total number of doctors registered in the system.",
      expectedQuery: "SELECT COUNT(*) FROM doctors",
      difficulty: "Beginner",
      category: "Aggregate Functions",
      hints: ["The COUNT aggregate tallies matching records.", "Provide * inside parentheses to count active rows."],
      explanation: "Returns the staff count registered compiled via primary metadata."
    },
    {
      id: "HC-B19",
      text: "Find the maximum years of experience among all doctors.",
      expectedQuery: "SELECT MAX(experience_years) FROM doctors",
      difficulty: "Beginner",
      category: "Aggregate Functions",
      hints: ["Use the MAX aggregate function.", "Target column experience_years."],
      explanation: "Reveals the senior experience threshold recorded in personnel tables."
    },
    {
      id: "HC-B21", // Just standard index to fit
      text: "Calculate the total consultation fees if the clinic booked one appointment with every doctor.",
      expectedQuery: "SELECT SUM(consultation_fee) FROM doctors",
      difficulty: "Beginner",
      category: "Aggregate Functions",
      hints: ["The aggregate formula to add numeric values is SUM.", "Apply it to details on consultation_fee."],
      explanation: "Projects base administrative capacity costs."
    },

    // --- 10 INTERMEDIATE / ADVANCED (WITHOUT JOINS) ---
    {
      id: "HC-I01",
      text: "Show the average experience years of doctors, grouped by specialty.",
      expectedQuery: "SELECT specialty, AVG(experience_years) FROM doctors GROUP BY specialty",
      difficulty: "Intermediate",
      category: "GROUP BY",
      hints: ["GROUP BY specialty must be placed after SELECT.", "All non-aggregate columns chosen must appear in GROUP BY."],
      explanation: "Groups staff data into aggregate medical field statistics."
    },
    {
      id: "HC-I02",
      text: "Count the total number of appointments per patient_id from the appointments table, sorted highest to lowest.",
      expectedQuery: "SELECT patient_id, COUNT(appointment_id) FROM appointments GROUP BY patient_id ORDER BY COUNT(appointment_id) DESC",
      difficulty: "Intermediate",
      category: "GROUP BY & ORDER BY",
      hints: ["Group by patient_id.", "Count appointment_id or *.", "Order by COUNT result with DESC."],
      explanation: "Identifies recurring frequent patient populations for clinical support."
    },
    {
      id: "HC-I03",
      text: "Find departments whose total doctor salaries exceed $20,000.",
      expectedQuery: "SELECT department, SUM(salary) FROM doctors GROUP BY department HAVING SUM(salary) > 20000",
      difficulty: "Intermediate",
      category: "HAVING Clause",
      hints: ["Filters on aggregates require HAVING, not WHERE.", "Perform SQL as: GROUP BY department HAVING SUM(salary) > 20000."],
      explanation: "Applies a financial threshold constraint over grouped payroll aggregates."
    },
    {
      id: "HC-I04",
      text: "List cities having strictly more than 3 patients, reporting the city name and count.",
      expectedQuery: "SELECT city, COUNT(patient_id) FROM patients GROUP BY city HAVING COUNT(patient_id) > 3",
      difficulty: "Intermediate",
      category: "HAVING Clause",
      hints: ["Apply aggregate COUNT(patient_id).", "Write GROUP BY city HAVING COUNT(patient_id) > 3."],
      explanation: "Tracks geographical hubs demonstrating patient caseload volume."
    },
    {
      id: "HC-I05",
      text: "Determine the highest billing amount ever recorded among 'Completed' appointments.",
      expectedQuery: "SELECT MAX(billing_amount) FROM appointments WHERE status = 'Completed'",
      difficulty: "Intermediate",
      category: "Aggregate Functions",
      hints: ["Use WHERE to filter rows first before aggregates compile.", "Filter on status = 'Completed' then invoke MAX."],
      explanation: "Extracts peak revenue milestones on executed operational events."
    },
    {
      id: "HC-I06",
      text: "Display all patients with a name ends with 'son' or starts with 'Emily'.",
      expectedQuery: "SELECT * FROM patients WHERE name LIKE '%son' OR name LIKE 'Emily%'",
      difficulty: "Intermediate",
      category: "Operators",
      hints: ["Combine two LIKE predicates.", "Suffix search is '%son'. Prefix search is 'Emily%'."],
      explanation: "Filters patient columns utilizing a combination of regex-like string operators."
    },
    {
      id: "HC-I07",
      text: "Calculate the average billing_amount for all appointments excluding 'Cancelled' ones.",
      expectedQuery: "SELECT AVG(billing_amount) FROM appointments WHERE status <> 'Cancelled'",
      difficulty: "Intermediate",
      category: "Aggregate & Filters",
      hints: ["Filter rows with status != 'Cancelled' or status <> 'Cancelled'.", "Calculate average via AVG."],
      explanation: "Projects billing benchmarks representing actual care delivered."
    },
    {
      id: "HC-I08",
      text: "Group appointments by status and show status alongside the minimum, maximum, and average billing amounts.",
      expectedQuery: "SELECT status, MIN(billing_amount), MAX(billing_amount), AVG(billing_amount) FROM appointments GROUP BY status",
      difficulty: "Intermediate",
      category: "GROUP BY",
      hints: ["Select status and include three aggregates: MIN, MAX, AVG.", "GROUP BY status to execute correctly."],
      explanation: "Generates quick billing variance statistics mapped across operations status."
    },
    {
      id: "HC-I09",
      text: "Find doctors who are in Neurology or Cardiology and make less than $13,000 monthly.",
      expectedQuery: "SELECT * FROM doctors WHERE specialty IN ('Neurology', 'Cardiology') AND salary < 13000",
      difficulty: "Intermediate",
      category: "Logical Operators",
      hints: ["Use IN for specialties.", "Combine with salary test using logical AND."],
      explanation: "Performs highly specific staff segment scans."
    },
    {
      id: "HC-I10",
      text: "Display patients whose discharge_date is recorded, ordered by admission_date descending.",
      expectedQuery: "SELECT * FROM patients WHERE discharge_date IS NOT NULL ORDER BY admission_date DESC",
      difficulty: "Intermediate",
      category: "NULL handling & Sort",
      hints: ["Review NULL values using IS NOT NULL.", "Sort chronologically using ORDER BY with DESC."],
      explanation: "Assists discharge summary audits mapping archival entries."
    }
  ],
  miniQuiz: [
    {
      question: "Which keyword must be used to filter matching categories AFTER groups are structured in a query?",
      options: ["WHERE", "HAVING", "LIMIT", "GROUP BY"],
      correctIndex: 1,
      explanation: "The HAVING clause is specifically designed to apply conditions to aggregated items, whereas WHERE applies to individual rows before grouping."
    },
    {
      question: "What is the correct syntax to find patients whose blood group column contains NULL values?",
      options: ["WHERE blood_group = NULL", "WHERE blood_group IS NULL", "WHERE ISNULL(blood_group)", "WHERE blood_group EQUALS NULL"],
      correctIndex: 1,
      explanation: "In SQL, NULL represents an unknown value, not a literal value, so comparing it with standard equivalence (=) fails. Always use 'IS NULL'."
    },
    {
      question: "Which aggregate functions can be applied to string columns like patient names?",
      options: ["SUM, AVG", "COUNT, MAX, MIN", "MAX, MIN, SUM", "COUNT only"],
      correctIndex: 1,
      explanation: "COUNT counts occurrences, while MAX/MIN find alphabetical extremes in text columns. Math functions like SUM/AVG require numerical fields."
    }
  ]
};