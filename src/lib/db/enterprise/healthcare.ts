// Enterprise Healthcare (Hospital Management) sample database.
import type { SampleDatabase } from "../sample-builder";

const SQL = /* sql */ `
PRAGMA foreign_keys = ON;

CREATE TABLE hospitals (
  hospital_id  INTEGER PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  city         TEXT,
  state        TEXT,
  country      TEXT DEFAULT 'IN',
  beds         INTEGER,
  opened_at    DATE,
  status       TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE departments (
  dept_id      INTEGER PRIMARY KEY,
  hospital_id  INTEGER NOT NULL REFERENCES hospitals(hospital_id),
  name         TEXT NOT NULL,
  head_doctor_id INTEGER,
  floor        TEXT
);
CREATE INDEX idx_dept_hospital ON departments(hospital_id);

CREATE TABLE doctors (
  doctor_id    INTEGER PRIMARY KEY,
  doc_code     TEXT NOT NULL UNIQUE,
  full_name    TEXT NOT NULL,
  specialty    TEXT,                            -- cardio|neuro|ortho|pedia|onco|general
  qualification TEXT,
  reg_number   TEXT,
  hospital_id  INTEGER REFERENCES hospitals(hospital_id),
  dept_id      INTEGER REFERENCES departments(dept_id),
  years_experience INTEGER,
  consultation_fee REAL,
  email        TEXT,
  phone        TEXT,
  status       TEXT NOT NULL DEFAULT 'active',   -- active|on_leave|inactive
  joined_at    DATE
);
CREATE INDEX idx_doc_dept ON doctors(dept_id);
CREATE INDEX idx_doc_specialty ON doctors(specialty);

CREATE TABLE nurses (
  nurse_id     INTEGER PRIMARY KEY,
  full_name    TEXT NOT NULL,
  dept_id      INTEGER REFERENCES departments(dept_id),
  shift        TEXT,                             -- day|night|rotating
  hired_at     DATE,
  status       TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE patients (
  patient_id     INTEGER PRIMARY KEY,
  mrn            TEXT NOT NULL UNIQUE,           -- Medical Record Number
  full_name      TEXT NOT NULL,
  dob            DATE,
  gender         TEXT,
  blood_group    TEXT,
  email          TEXT,
  phone          TEXT,
  address        TEXT,
  city           TEXT,
  state          TEXT,
  country        TEXT DEFAULT 'IN',
  registered_at  DATE,
  emergency_contact TEXT,
  status         TEXT NOT NULL DEFAULT 'active'  -- active|deceased|inactive
);

CREATE TABLE insurance_providers (
  provider_id  INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  code         TEXT NOT NULL UNIQUE,
  contact      TEXT
);

CREATE TABLE patient_insurance (
  policy_id     INTEGER PRIMARY KEY,
  patient_id    INTEGER NOT NULL REFERENCES patients(patient_id),
  provider_id   INTEGER NOT NULL REFERENCES insurance_providers(provider_id),
  policy_number TEXT NOT NULL,
  coverage_amt  REAL,
  valid_from    DATE,
  valid_to      DATE,
  status        TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE appointments (
  appt_id       INTEGER PRIMARY KEY,
  patient_id    INTEGER NOT NULL REFERENCES patients(patient_id),
  doctor_id     INTEGER NOT NULL REFERENCES doctors(doctor_id),
  dept_id       INTEGER REFERENCES departments(dept_id),
  scheduled_at  TEXT NOT NULL,
  duration_min  INTEGER DEFAULT 30,
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'scheduled', -- scheduled|completed|cancelled|no_show
  is_followup   INTEGER NOT NULL DEFAULT 0,
  parent_appt_id INTEGER REFERENCES appointments(appt_id),  -- for follow-ups
  fee_charged   REAL
);
CREATE INDEX idx_appt_patient ON appointments(patient_id);
CREATE INDEX idx_appt_doctor ON appointments(doctor_id);
CREATE INDEX idx_appt_status ON appointments(status);
CREATE INDEX idx_appt_when ON appointments(scheduled_at);

CREATE TABLE admissions (
  admission_id  INTEGER PRIMARY KEY,
  patient_id    INTEGER NOT NULL REFERENCES patients(patient_id),
  hospital_id   INTEGER NOT NULL REFERENCES hospitals(hospital_id),
  dept_id       INTEGER REFERENCES departments(dept_id),
  attending_doctor_id INTEGER REFERENCES doctors(doctor_id),
  admission_type TEXT NOT NULL,                    -- planned|emergency|referral
  admitted_at   TEXT NOT NULL,
  discharged_at TEXT,
  ward          TEXT,                              -- general|semi|private|icu|emergency
  bed_number    TEXT,
  is_icu        INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'admitted', -- admitted|discharged|transferred|absconded|expired
  discharge_summary TEXT
);
CREATE INDEX idx_adm_patient ON admissions(patient_id);
CREATE INDEX idx_adm_status ON admissions(status);

CREATE TABLE diagnoses (
  diagnosis_id  INTEGER PRIMARY KEY,
  admission_id  INTEGER REFERENCES admissions(admission_id),
  appt_id       INTEGER REFERENCES appointments(appt_id),
  patient_id    INTEGER NOT NULL REFERENCES patients(patient_id),
  doctor_id     INTEGER REFERENCES doctors(doctor_id),
  icd10_code    TEXT,
  description   TEXT,
  severity      TEXT,                              -- mild|moderate|severe|critical
  diagnosed_at  TEXT
);

CREATE TABLE procedures (
  procedure_id  INTEGER PRIMARY KEY,
  admission_id  INTEGER REFERENCES admissions(admission_id),
  patient_id    INTEGER NOT NULL REFERENCES patients(patient_id),
  doctor_id     INTEGER REFERENCES doctors(doctor_id),
  code          TEXT,
  name          TEXT NOT NULL,
  performed_at  TEXT,
  outcome       TEXT,
  cost          REAL
);

CREATE TABLE medicines (
  medicine_id   INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  generic_name  TEXT,
  manufacturer  TEXT,
  unit_price    REAL,
  stock_qty     INTEGER DEFAULT 0,
  expiry_date   DATE,
  is_controlled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE prescriptions (
  prescription_id INTEGER PRIMARY KEY,
  appt_id       INTEGER REFERENCES appointments(appt_id),
  admission_id  INTEGER REFERENCES admissions(admission_id),
  patient_id    INTEGER NOT NULL REFERENCES patients(patient_id),
  doctor_id     INTEGER REFERENCES doctors(doctor_id),
  medicine_id   INTEGER NOT NULL REFERENCES medicines(medicine_id),
  dosage        TEXT,
  frequency     TEXT,
  duration_days INTEGER,
  prescribed_at TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE lab_tests (
  test_id       INTEGER PRIMARY KEY,
  patient_id    INTEGER NOT NULL REFERENCES patients(patient_id),
  doctor_id     INTEGER REFERENCES doctors(doctor_id),
  admission_id  INTEGER REFERENCES admissions(admission_id),
  test_name     TEXT NOT NULL,
  test_type     TEXT,                              -- blood|urine|xray|mri|ct|ecg
  ordered_at    TEXT,
  result_at     TEXT,
  result_value  TEXT,
  is_abnormal   INTEGER,
  cost          REAL
);

CREATE TABLE surgeries (
  surgery_id    INTEGER PRIMARY KEY,
  admission_id  INTEGER REFERENCES admissions(admission_id),
  patient_id    INTEGER NOT NULL REFERENCES patients(patient_id),
  primary_surgeon_id INTEGER REFERENCES doctors(doctor_id),
  name          TEXT NOT NULL,
  scheduled_at  TEXT,
  performed_at  TEXT,
  duration_min  INTEGER,
  outcome       TEXT,                              -- successful|complications|failed
  cost          REAL
);

CREATE TABLE bills (
  bill_id       INTEGER PRIMARY KEY,
  bill_number   TEXT NOT NULL UNIQUE,
  patient_id    INTEGER NOT NULL REFERENCES patients(patient_id),
  admission_id  INTEGER REFERENCES admissions(admission_id),
  bill_date     DATE NOT NULL,
  total_amount  REAL NOT NULL,
  insurance_amt REAL DEFAULT 0,
  patient_amt   REAL DEFAULT 0,
  paid_amt      REAL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending'    -- pending|paid|partial|overdue|written_off
);
CREATE INDEX idx_bills_patient ON bills(patient_id);
CREATE INDEX idx_bills_status ON bills(status);

CREATE TABLE claims (
  claim_id      INTEGER PRIMARY KEY,
  claim_number  TEXT NOT NULL UNIQUE,
  bill_id       INTEGER NOT NULL REFERENCES bills(bill_id),
  policy_id     INTEGER NOT NULL REFERENCES patient_insurance(policy_id),
  claimed_amt   REAL NOT NULL,
  approved_amt  REAL,
  submitted_at  DATE,
  decision_at   DATE,
  status        TEXT NOT NULL DEFAULT 'submitted',  -- submitted|approved|partial|rejected|pending
  rejection_reason TEXT
);

CREATE TABLE allergies (
  allergy_id    INTEGER PRIMARY KEY,
  patient_id    INTEGER NOT NULL REFERENCES patients(patient_id),
  allergen      TEXT NOT NULL,
  severity      TEXT,
  noted_at      DATE
);

CREATE TABLE vaccinations (
  vaccination_id INTEGER PRIMARY KEY,
  patient_id     INTEGER NOT NULL REFERENCES patients(patient_id),
  vaccine        TEXT NOT NULL,
  dose_number    INTEGER,
  administered_at DATE,
  administered_by INTEGER REFERENCES doctors(doctor_id)
);

CREATE TABLE blood_bank (
  unit_id      INTEGER PRIMARY KEY,
  blood_group  TEXT NOT NULL,
  hospital_id  INTEGER REFERENCES hospitals(hospital_id),
  collected_at DATE,
  expires_at   DATE,
  status       TEXT NOT NULL DEFAULT 'available'   -- available|used|expired|discarded
);

CREATE TABLE ambulance_calls (
  call_id      INTEGER PRIMARY KEY,
  patient_id   INTEGER REFERENCES patients(patient_id),
  hospital_id  INTEGER REFERENCES hospitals(hospital_id),
  called_at    TEXT,
  arrived_at   TEXT,
  origin       TEXT,
  destination  TEXT,
  status       TEXT NOT NULL DEFAULT 'dispatched'
);

CREATE TABLE audit_log (
  audit_id     INTEGER PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    INTEGER NOT NULL,
  action       TEXT NOT NULL,
  actor_id     INTEGER,
  changed_at   TEXT,
  old_value    TEXT,
  new_value    TEXT
);

-- Views
CREATE VIEW v_icu_patients AS
SELECT a.admission_id, a.patient_id, p.full_name, a.admitted_at, a.ward, a.status,
       d.full_name AS attending
FROM admissions a
JOIN patients p ON p.patient_id = a.patient_id
LEFT JOIN doctors d ON d.doctor_id = a.attending_doctor_id
WHERE a.is_icu = 1 AND a.status = 'admitted';

CREATE VIEW v_readmissions AS
SELECT patient_id, COUNT(*) AS admissions_count
FROM admissions
GROUP BY patient_id
HAVING COUNT(*) > 1;

CREATE VIEW v_insurance_rejections AS
SELECT c.claim_id, c.claim_number, b.patient_id, c.claimed_amt, c.approved_amt, c.status, c.rejection_reason
FROM claims c
JOIN bills b ON b.bill_id = c.bill_id
WHERE c.status IN ('rejected','partial');

CREATE VIEW v_expired_medicines AS
SELECT * FROM medicines WHERE expiry_date < DATE('now');

-- Seed
INSERT INTO hospitals VALUES
 (1,'H001','Apollo Bengaluru','Bengaluru','KA','IN',450,'1998-01-01','active'),
 (2,'H002','Fortis Mumbai','Mumbai','MH','IN',380,'2005-06-01','active'),
 (3,'H003','AIIMS Delhi','New Delhi','DL','IN',900,'1956-01-01','active');

INSERT INTO departments VALUES
 (1,1,'Cardiology',NULL,'3F'),
 (2,1,'Emergency',NULL,'1F'),
 (3,1,'ICU',NULL,'4F'),
 (4,1,'Pediatrics',NULL,'2F'),
 (5,2,'Cardiology',NULL,'5F'),
 (6,2,'Oncology',NULL,'6F'),
 (7,2,'Emergency',NULL,'1F'),
 (8,3,'Neurology',NULL,'4F'),
 (9,3,'Emergency',NULL,'1F');

INSERT INTO doctors VALUES
 (1,'DR0001','Dr. Anil Rao','cardio','MD, DM','MCI12345',1,1,20,1500,'anil@apollo.in','9800100001','active','2005-06-01'),
 (2,'DR0002','Dr. Priya Menon','pedia','MD','MCI12346',1,4,12,1000,'priya@apollo.in','9800100002','active','2013-04-01'),
 (3,'DR0003','Dr. Vikram Shah','emergency','MBBS','MCI12347',1,2,8,800,'vikram@apollo.in','9800100003','on_leave','2017-01-01'),
 (4,'DR0004','Dr. Neha Iyer','onco','MD, DM','MCI12348',2,6,15,2500,'neha@fortis.in','9800100004','active','2010-07-01'),
 (5,'DR0005','Dr. Rohan Das','cardio','MD','MCI12349',2,5,18,2000,'rohan@fortis.in','9800100005','active','2007-05-01'),
 (6,'DR0006','Dr. Sana Malik','neuro','MD, DM','MCI12350',3,8,22,3000,'sana@aiims.in','9800100006','active','2003-08-01'),
 (7,'DR0007','Dr. Karthik B','emergency','MBBS','MCI12351',3,9,5,700,NULL,'9800100007','active','2020-11-01');

UPDATE departments SET head_doctor_id = 1 WHERE dept_id = 1;
UPDATE departments SET head_doctor_id = 3 WHERE dept_id = 2;
UPDATE departments SET head_doctor_id = 5 WHERE dept_id = 5;
UPDATE departments SET head_doctor_id = 4 WHERE dept_id = 6;

INSERT INTO nurses VALUES
 (1,'Nurse A. Kumar',1,'day','2015-01-01','active'),
 (2,'Nurse B. Rao',3,'night','2018-04-01','active'),
 (3,'Nurse C. Nair',2,'rotating','2020-06-01','active'),
 (4,'Nurse D. Sen',6,'day','2016-08-01','active'),
 (5,'Nurse E. Shah',8,'night','2019-01-01','on_leave');

INSERT INTO patients VALUES
 (1,'MRN000001','Aarav Sharma','1985-05-12','M','O+','aarav@example.com','9900000001','12 Palm St','Bengaluru','KA','IN','2015-03-01','Sita 9900000010','active'),
 (2,'MRN000002','Bhavna Patel','1990-08-22','F','A-','bhavna@example.com','9900000002','7 Elm Rd','Mumbai','MH','IN','2018-06-15','Ramesh 9900000020','active'),
 (3,'MRN000003','Chetan Gupta','1972-11-30','M','B+',NULL,'9900000003','1 Rose Ln','New Delhi','DL','IN','2010-01-01','Meena 9900000030','deceased'),
 (4,'MRN000004','Diya Rao','2015-07-04','F','O-','diya.parent@example.com','9900000004','5 Oak Ave','Bengaluru','KA','IN','2016-01-10','Priya 9900000040','active'),
 (5,'MRN000005','Aarav Sharma','1985-05-12','M','O+','aarav.dup@example.com','9900000005','12 Palm St','Bengaluru','KA','IN','2020-04-01','Sita 9900000010','active'),  -- duplicate record
 (6,'MRN000006','Farhan Khan','1965-03-18','M','AB+','farhan@example.com','9900000006','8 Neem Rd','Mumbai','MH','IN','2012-09-01','Zara 9900000060','active'),
 (7,'MRN000007','Gita Nair','1988-12-05','F','B-','gita@example.com','9900000007','9 Teak St','Chennai','TN','IN','2019-05-01','Krishnan 9900000070','active'),
 (8,'MRN000008','Harsh Singh','2000-06-15','M','O+','harsh@example.com','9900000008','2 Cedar Ln','New Delhi','DL','IN','2022-11-01','Ravi 9900000080','active'),
 (9,'MRN000009','Ira Sen','1995-02-28','F','A+','ira@example.com',NULL,'6 Birch Rd','Mumbai','MH','IN','2023-01-25',NULL,'active'),
 (10,'MRN000010','Jai Malhotra','1978-10-10','M','O+','jai@example.com','9900000010','4 Palm St','Bengaluru','KA','IN','2014-11-01','Anu 9900000100','active');

INSERT INTO insurance_providers VALUES
 (1,'Star Health','STAR','support@star.in'),
 (2,'ICICI Lombard','ICICL','claims@icici.in'),
 (3,'HDFC Ergo','HDFCE','claims@hdfcergo.in');

INSERT INTO patient_insurance VALUES
 (1,1,1,'STAR-P-1001',500000,'2024-01-01','2025-12-31','active'),
 (2,2,2,'ICICL-P-2001',1000000,'2023-06-01','2025-05-31','active'),
 (3,6,3,'HDFCE-P-3001',2000000,'2020-01-01','2024-12-31','active'),
 (4,7,1,'STAR-P-1002',300000,'2024-05-01','2025-04-30','active'),
 (5,10,2,'ICICL-P-2002',800000,'2023-11-01','2024-10-31','active');   -- expired

INSERT INTO appointments VALUES
 (1,1,1,1,'2025-10-15 09:00:00',30,'Chest pain follow-up','completed',1,NULL,1500),
 (2,2,4,6,'2025-10-15 10:00:00',30,'Oncology consult','completed',0,NULL,2500),
 (3,4,2,4,'2025-10-15 11:00:00',20,'Fever','completed',0,NULL,1000),
 (4,6,5,5,'2025-10-16 09:00:00',30,'Follow-up','scheduled',1,NULL,NULL),
 (5,7,6,8,'2025-10-16 10:00:00',45,'Migraine','scheduled',0,NULL,NULL),
 (6,8,3,2,'2025-10-14 22:00:00',15,'Injury','completed',0,NULL,800),
 (7,9,2,4,'2025-10-14 15:00:00',30,'Rash','cancelled',0,NULL,NULL),
 (8,10,1,1,'2025-10-13 09:00:00',30,'Hypertension','no_show',0,NULL,NULL),
 (9,1,1,1,'2025-10-01 09:00:00',30,'Chest pain','completed',0,NULL,1500),  -- parent of #1
 (10,2,4,6,'2025-11-01 10:00:00',30,'Chemo review','scheduled',1,2,NULL);

INSERT INTO admissions VALUES
 (1,3,1,3,1,'planned','2020-11-01 08:00:00','2020-11-15 12:00:00','icu','ICU-3',1,'discharged','Recovered post-op'),
 (2,3,1,2,3,'emergency','2020-06-05 22:30:00','2020-06-06 04:00:00','emergency','ER-2',0,'expired','Cardiac arrest'), -- deceased
 (3,6,2,6,4,'planned','2025-09-20 08:00:00','2025-10-05 10:00:00','private','P-101',0,'discharged','Chemo cycle 3 complete'),
 (4,4,1,4,2,'emergency','2025-10-14 21:00:00',NULL,'general','G-12',0,'admitted','High fever'),
 (5,8,1,2,3,'emergency','2025-10-14 22:30:00','2025-10-15 02:00:00','emergency','ER-1',0,'discharged','Sutures'),
 (6,2,2,6,4,'planned','2025-10-10 09:00:00',NULL,'icu','ICU-1',1,'admitted','Chemo cycle 4'),
 (7,10,1,1,1,'referral','2024-08-01 10:00:00','2024-08-03 15:00:00','semi','S-05',0,'discharged','Stable'),
 (8,7,3,8,6,'emergency','2025-10-13 04:00:00','2025-10-13 05:00:00','emergency','ER-3',0,'absconded',NULL);

INSERT INTO diagnoses VALUES
 (1,1,NULL,3,1,'I25.1','Chronic ischaemic heart disease','severe','2020-11-01 09:00:00'),
 (2,2,NULL,3,3,'I46.9','Cardiac arrest','critical','2020-06-05 22:45:00'),
 (3,3,NULL,6,4,'C50.9','Breast cancer, unspecified','severe','2025-09-20 09:00:00'),
 (4,4,NULL,4,2,'A09','Gastroenteritis','moderate','2025-10-14 21:15:00'),
 (5,NULL,1,1,1,'I10','Essential hypertension','moderate','2025-10-01 09:15:00'),
 (6,NULL,5,7,6,'G43.9','Migraine','mild','2025-10-16 10:00:00'),
 (7,6,NULL,2,4,'C50.9','Breast cancer','severe','2025-10-10 09:15:00');

INSERT INTO procedures VALUES
 (1,1,3,1,'ANGIO','Angioplasty','2020-11-02 10:00:00','successful',150000),
 (2,3,6,4,'CHEMO','Chemotherapy Cycle 3','2025-09-22 10:00:00','successful',80000),
 (3,5,8,3,'SUTURE','Wound suturing','2025-10-14 23:00:00','successful',3000),
 (4,6,2,4,'CHEMO','Chemotherapy Cycle 4','2025-10-11 10:00:00','complications',85000);

INSERT INTO medicines VALUES
 (1,'Paracetamol 500','Acetaminophen','Sun Pharma',2,10000,'2026-12-31',0),
 (2,'Amoxicillin 500','Amoxicillin','Cipla',5,5000,'2025-08-31',0),  -- expired
 (3,'Atorvastatin 10','Atorvastatin','Dr Reddys',8,3000,'2027-01-31',0),
 (4,'Morphine 10mg','Morphine','Sun Pharma',150,200,'2026-06-30',1),
 (5,'Metformin 500','Metformin','Cipla',3,8000,'2025-11-30',0),
 (6,'Ondansetron 4','Ondansetron','Dr Reddys',12,1500,'2025-09-15',0);  -- expired

INSERT INTO prescriptions VALUES
 (1,1,NULL,1,1,3,'10mg','1-0-1',30,'2025-10-15 09:15:00',1),
 (2,9,NULL,1,1,3,'10mg','1-0-1',30,'2025-10-01 09:15:00',0),
 (3,3,NULL,4,2,1,'500mg','1-0-1-0',5,'2025-10-15 11:15:00',1),
 (4,NULL,3,6,4,4,'10mg','SOS',7,'2025-09-22 10:30:00',1),
 (5,NULL,6,2,4,6,'4mg','1-0-1',5,'2025-10-11 10:30:00',1),
 (6,6,NULL,8,3,1,'500mg','SOS',3,'2025-10-14 23:15:00',0);

INSERT INTO lab_tests VALUES
 (1,3,1,1,'Troponin','blood','2020-11-01 08:30:00','2020-11-01 09:15:00','2.1',1,800),
 (2,3,3,2,'ECG','ecg','2020-06-05 22:35:00','2020-06-05 22:40:00','VFib',1,500),
 (3,6,4,3,'CBC','blood','2025-09-20 08:30:00','2025-09-20 09:15:00','WBC low',1,600),
 (4,4,2,4,'Stool','urine','2025-10-14 21:20:00','2025-10-14 22:00:00','Rotavirus+',1,400),
 (5,1,1,NULL,'Lipid Panel','blood','2025-10-15 09:00:00','2025-10-15 10:00:00','LDL 160',1,900),
 (6,2,4,NULL,'CT','ct','2025-10-15 10:00:00',NULL,NULL,NULL,4500);

INSERT INTO surgeries VALUES
 (1,1,3,1,'Angioplasty','2020-11-02 09:00:00','2020-11-02 10:30:00',90,'successful',150000),
 (2,6,2,4,'Port insertion','2025-10-11 08:00:00','2025-10-11 09:30:00',90,'complications',60000);

INSERT INTO bills VALUES
 (1,'INV20201115-001',3,1,'2020-11-15',245000,200000,45000,45000,'paid'),
 (2,'INV20200606-002',3,2,'2020-06-06',85000, 60000,25000,25000,'paid'),
 (3,'INV20251005-003',6,3,'2025-10-05',312000,250000,62000,30000,'partial'),
 (4,'INV20251015-004',8,5,'2025-10-15', 12500,     0,12500,12500,'paid'),
 (5,'INV20251015-005',4,4,'2025-10-15',  8500,     0, 8500,    0,'pending'),
 (6,'INV20240803-006',10,7,'2024-08-03', 45000, 30000,15000,    0,'overdue');

INSERT INTO claims VALUES
 (1,'CL20201115-1',1,1,200000,200000,'2020-11-16','2020-12-01','approved',NULL),
 (2,'CL20200606-2',2,1, 60000, 60000,'2020-06-07','2020-06-20','approved',NULL),
 (3,'CL20251005-3',3,3,300000,250000,'2025-10-06',NULL,       'partial','Non-covered chemo drug'),
 (4,'CL20240803-6',6,5, 30000,     0,'2024-08-04','2024-08-25','rejected','Policy lapsed');

INSERT INTO allergies VALUES
 (1,1,'Penicillin','severe','2015-04-01'),
 (2,4,'Peanuts','moderate','2016-05-01'),
 (3,6,'Aspirin','mild','2012-10-01');

INSERT INTO vaccinations VALUES
 (1,4,'MMR',1,'2016-02-01',2),
 (2,4,'MMR',2,'2020-06-01',2),
 (3,8,'HPV',1,'2015-06-01',2),
 (4,1,'COVID-19',1,'2021-05-01',1),
 (5,1,'COVID-19',2,'2021-08-01',1);

INSERT INTO blood_bank VALUES
 (1,'O+',1,'2025-10-01','2025-11-12','available'),
 (2,'A-',1,'2025-09-15','2025-10-27','available'),
 (3,'B+',2,'2025-08-01','2025-09-12','expired'),
 (4,'O-',3,'2025-10-05','2025-11-16','available'),
 (5,'AB+',1,'2025-09-20','2025-11-01','used');

INSERT INTO ambulance_calls VALUES
 (1,3,1,'2020-06-05 22:00:00','2020-06-05 22:25:00','Home','Apollo ER','completed'),
 (2,4,1,'2025-10-14 20:30:00','2025-10-14 20:55:00','School','Apollo ER','completed'),
 (3,NULL,2,'2025-10-15 06:00:00',NULL,'Highway','Fortis ER','dispatched');

INSERT INTO audit_log VALUES
 (1,'admission',2,'update',1,'2020-06-06 04:00:00','admitted','expired'),
 (2,'patient',3,'update',NULL,'2020-06-06 04:05:00','active','deceased'),
 (3,'claim',4,'update',NULL,'2024-08-25 10:00:00','submitted','rejected'),
 (4,'appointment',7,'update',NULL,'2025-10-14 08:00:00','scheduled','cancelled');
`;

export const enterpriseHealthcare: SampleDatabase = {
  id: "enterprise_healthcare",
  name: "🏥 Enterprise Healthcare",
  description:
    "Hospital management ecosystem: patients, doctors, admissions, ICU/ER, prescriptions, lab tests, surgeries, insurance claims, and billing. Includes emergency admissions, duplicate patient records, cancelled appointments, expired medicines, and insurance rejections.",
  tables: [],
  raw: { default: SQL, sqlite: SQL, mysql: SQL },
};
