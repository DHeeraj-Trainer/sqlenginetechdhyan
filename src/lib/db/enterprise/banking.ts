// Enterprise Banking sample database.
// Full DDL + edge-case seed data. SQLite-flavored SQL; the MySQL emulator
// translates as needed. Designed for beginner→expert SQL interview scenarios:
// dormant/frozen accounts, loan defaults, joint accounts, fraud flags,
// duplicate/reversed transactions, KYC/AML, and analytics views.

import type { SampleDatabase } from "../sample-builder";

const SQL = /* sql */ `
PRAGMA foreign_keys = ON;

-- ============================================================
-- Reference data
-- ============================================================
CREATE TABLE branches (
  branch_id      INTEGER PRIMARY KEY,
  branch_code    TEXT NOT NULL UNIQUE,           -- e.g. HDFC0001234
  name           TEXT NOT NULL,
  ifsc_code      TEXT NOT NULL UNIQUE,
  swift_code     TEXT,
  address        TEXT,
  city           TEXT,
  state          TEXT,
  country        TEXT DEFAULT 'IN',
  opened_at      DATE,
  status         TEXT NOT NULL DEFAULT 'active'  -- active|closed
);

CREATE TABLE employees (
  employee_id    INTEGER PRIMARY KEY,
  emp_code       TEXT NOT NULL UNIQUE,
  full_name      TEXT NOT NULL,
  email          TEXT,
  phone          TEXT,
  branch_id      INTEGER REFERENCES branches(branch_id),
  manager_id     INTEGER REFERENCES employees(employee_id),  -- self-join
  role           TEXT,                                       -- teller|manager|rm|ops
  hire_date      DATE,
  status         TEXT NOT NULL DEFAULT 'active'
);
CREATE INDEX idx_employees_branch ON employees(branch_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);

CREATE TABLE customers (
  customer_id     INTEGER PRIMARY KEY,
  cust_code       TEXT NOT NULL UNIQUE,           -- CUST0000123
  full_name       TEXT NOT NULL,
  dob             DATE,
  gender          TEXT,
  email           TEXT,                            -- some NULL / malformed
  phone           TEXT,
  pan             TEXT,
  aadhaar_last4   TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  country         TEXT DEFAULT 'IN',
  segment         TEXT,                            -- retail|priority|hnw|nri
  kyc_status      TEXT NOT NULL DEFAULT 'pending', -- pending|verified|rejected|expired
  aml_risk        TEXT DEFAULT 'low',              -- low|medium|high
  onboarded_at    DATE,
  home_branch_id  INTEGER REFERENCES branches(branch_id),
  status          TEXT NOT NULL DEFAULT 'active'   -- active|dormant|closed|blacklisted
);
CREATE INDEX idx_customers_branch ON customers(home_branch_id);
CREATE INDEX idx_customers_kyc ON customers(kyc_status);
CREATE INDEX idx_customers_status ON customers(status);

-- ============================================================
-- Accounts (savings / current / joint)
-- ============================================================
CREATE TABLE accounts (
  account_id       INTEGER PRIMARY KEY,
  account_number   TEXT NOT NULL UNIQUE,           -- 12–16 digits
  customer_id      INTEGER NOT NULL REFERENCES customers(customer_id),
  branch_id        INTEGER NOT NULL REFERENCES branches(branch_id),
  account_type     TEXT NOT NULL,                  -- savings|current|salary|nri
  currency         TEXT NOT NULL DEFAULT 'INR',
  balance          REAL NOT NULL DEFAULT 0,
  available_balance REAL NOT NULL DEFAULT 0,
  overdraft_limit  REAL NOT NULL DEFAULT 0,
  interest_rate    REAL DEFAULT 0,
  opened_at        DATE NOT NULL,
  last_txn_at      DATE,
  status           TEXT NOT NULL DEFAULT 'active', -- active|dormant|frozen|closed
  is_joint         INTEGER NOT NULL DEFAULT 0,
  CHECK (balance >= -overdraft_limit)
);
CREATE INDEX idx_accounts_customer ON accounts(customer_id);
CREATE INDEX idx_accounts_branch ON accounts(branch_id);
CREATE INDEX idx_accounts_status ON accounts(status);

CREATE TABLE account_holders (       -- many-to-many for joint accounts
  account_id   INTEGER NOT NULL REFERENCES accounts(account_id),
  customer_id  INTEGER NOT NULL REFERENCES customers(customer_id),
  holder_type  TEXT NOT NULL DEFAULT 'primary',  -- primary|secondary|nominee
  added_at     DATE,
  PRIMARY KEY (account_id, customer_id)
);

CREATE TABLE beneficiaries (
  beneficiary_id  INTEGER PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES customers(customer_id),
  name            TEXT NOT NULL,
  account_number  TEXT,
  ifsc            TEXT,
  nickname        TEXT,
  added_at        DATE,
  is_verified     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_benef_customer ON beneficiaries(customer_id);

-- ============================================================
-- Cards
-- ============================================================
CREATE TABLE cards (
  card_id         INTEGER PRIMARY KEY,
  card_number_hash TEXT NOT NULL UNIQUE,
  masked_number   TEXT NOT NULL,                  -- **** **** **** 1234
  card_type       TEXT NOT NULL,                  -- debit|credit
  network         TEXT,                           -- visa|mastercard|rupay|amex
  customer_id     INTEGER NOT NULL REFERENCES customers(customer_id),
  account_id      INTEGER REFERENCES accounts(account_id),
  issued_at       DATE,
  expires_at      DATE,
  credit_limit    REAL,
  status          TEXT NOT NULL DEFAULT 'active'  -- active|blocked|expired|lost|stolen
);
CREATE INDEX idx_cards_customer ON cards(customer_id);
CREATE INDEX idx_cards_status ON cards(status);

-- ============================================================
-- Deposits
-- ============================================================
CREATE TABLE fixed_deposits (
  fd_id            INTEGER PRIMARY KEY,
  customer_id      INTEGER NOT NULL REFERENCES customers(customer_id),
  account_id       INTEGER REFERENCES accounts(account_id),
  principal        REAL NOT NULL,
  interest_rate    REAL NOT NULL,
  tenure_months    INTEGER NOT NULL,
  opened_at        DATE NOT NULL,
  maturity_date    DATE NOT NULL,
  maturity_amount  REAL,
  status           TEXT NOT NULL DEFAULT 'active' -- active|matured|premature_closed
);
CREATE INDEX idx_fd_customer ON fixed_deposits(customer_id);

CREATE TABLE recurring_deposits (
  rd_id            INTEGER PRIMARY KEY,
  customer_id      INTEGER NOT NULL REFERENCES customers(customer_id),
  account_id       INTEGER REFERENCES accounts(account_id),
  monthly_amount   REAL NOT NULL,
  interest_rate    REAL NOT NULL,
  tenure_months    INTEGER NOT NULL,
  opened_at        DATE NOT NULL,
  maturity_date    DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active'
);

-- ============================================================
-- Loans
-- ============================================================
CREATE TABLE loans (
  loan_id         INTEGER PRIMARY KEY,
  loan_number     TEXT NOT NULL UNIQUE,
  customer_id     INTEGER NOT NULL REFERENCES customers(customer_id),
  loan_type       TEXT NOT NULL,                  -- home|auto|personal|edu|business
  principal       REAL NOT NULL,
  outstanding     REAL NOT NULL,
  interest_rate   REAL NOT NULL,
  tenure_months   INTEGER NOT NULL,
  emi_amount      REAL NOT NULL,
  disbursed_at    DATE,
  first_emi_date  DATE,
  next_emi_date   DATE,
  status          TEXT NOT NULL DEFAULT 'active'  -- active|closed|npa|written_off|defaulted
);
CREATE INDEX idx_loans_customer ON loans(customer_id);
CREATE INDEX idx_loans_status ON loans(status);

CREATE TABLE loan_payments (
  payment_id     INTEGER PRIMARY KEY,
  loan_id        INTEGER NOT NULL REFERENCES loans(loan_id),
  due_date       DATE NOT NULL,
  paid_date      DATE,
  emi_amount     REAL NOT NULL,
  principal_paid REAL,
  interest_paid  REAL,
  late_fee       REAL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending'  -- pending|paid|late|partial|missed
);
CREATE INDEX idx_loan_pay_loan ON loan_payments(loan_id);
CREATE INDEX idx_loan_pay_status ON loan_payments(status);

-- ============================================================
-- Transactions (unified ledger; channel = upi/imps/neft/rtgs/swift/atm/pos/merchant)
-- ============================================================
CREATE TABLE transactions (
  txn_id           INTEGER PRIMARY KEY,
  txn_ref          TEXT NOT NULL UNIQUE,           -- TXN20240115XYZ
  account_id       INTEGER NOT NULL REFERENCES accounts(account_id),
  counter_account  TEXT,                           -- destination account/UPI id
  txn_type         TEXT NOT NULL,                  -- debit|credit
  channel          TEXT NOT NULL,                  -- upi|imps|neft|rtgs|swift|atm|pos|merchant|cheque|cash
  amount           REAL NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'INR',
  fx_rate          REAL DEFAULT 1,
  fee              REAL DEFAULT 0,
  balance_after    REAL,
  merchant_id      INTEGER,
  narration         TEXT,
  txn_at           TEXT NOT NULL,                  -- ISO datetime
  value_date       DATE,
  status           TEXT NOT NULL DEFAULT 'success',-- success|failed|pending|reversed|disputed
  is_duplicate     INTEGER NOT NULL DEFAULT 0,
  reversed_of      INTEGER REFERENCES transactions(txn_id),
  fraud_flag       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_txn_account ON transactions(account_id);
CREATE INDEX idx_txn_channel ON transactions(channel);
CREATE INDEX idx_txn_status ON transactions(status);
CREATE INDEX idx_txn_at ON transactions(txn_at);

CREATE TABLE merchants (
  merchant_id    INTEGER PRIMARY KEY,
  merchant_code  TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  category       TEXT,                              -- retail|food|travel|utility|ecom
  mcc            TEXT,
  city           TEXT,
  country        TEXT DEFAULT 'IN',
  onboarded_at   DATE,
  status         TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE upi_ids (
  upi_id       TEXT PRIMARY KEY,                    -- alice@okhdfc
  customer_id  INTEGER NOT NULL REFERENCES customers(customer_id),
  account_id   INTEGER NOT NULL REFERENCES accounts(account_id),
  is_primary   INTEGER NOT NULL DEFAULT 0,
  created_at   DATE
);

-- ============================================================
-- Compliance & risk
-- ============================================================
CREATE TABLE kyc_documents (
  doc_id       INTEGER PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(customer_id),
  doc_type     TEXT NOT NULL,                       -- pan|aadhaar|passport|voter
  doc_number   TEXT,
  submitted_at DATE,
  verified_at  DATE,
  expires_at   DATE,
  status       TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE fraud_alerts (
  alert_id     INTEGER PRIMARY KEY,
  customer_id  INTEGER REFERENCES customers(customer_id),
  txn_id       INTEGER REFERENCES transactions(txn_id),
  alert_type   TEXT NOT NULL,                       -- velocity|geo|amount|blacklist|pattern
  severity     TEXT NOT NULL,                       -- low|medium|high|critical
  raised_at    TEXT NOT NULL,
  resolved_at  TEXT,
  disposition  TEXT                                 -- false_positive|confirmed|pending
);

CREATE TABLE audit_log (
  audit_id     INTEGER PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    INTEGER NOT NULL,
  action       TEXT NOT NULL,                       -- create|update|delete|freeze
  actor_id     INTEGER,
  actor_type   TEXT,                                -- employee|system|customer
  changed_at   TEXT NOT NULL,
  old_value    TEXT,
  new_value    TEXT
);

CREATE TABLE statements (
  statement_id INTEGER PRIMARY KEY,
  account_id   INTEGER NOT NULL REFERENCES accounts(account_id),
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  opening_bal  REAL,
  closing_bal  REAL,
  generated_at TEXT
);

CREATE TABLE charges (
  charge_id    INTEGER PRIMARY KEY,
  account_id   INTEGER NOT NULL REFERENCES accounts(account_id),
  charge_type  TEXT NOT NULL,                       -- amc|sms|atm|neft|penalty|non_maintenance
  amount       REAL NOT NULL,
  charged_at   DATE NOT NULL,
  waived       INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Analytical views (exercise CTEs / window functions / joins)
-- ============================================================
CREATE VIEW v_customer_balances AS
SELECT c.customer_id, c.cust_code, c.full_name, c.segment,
       COUNT(a.account_id)          AS num_accounts,
       COALESCE(SUM(a.balance),0)   AS total_balance,
       MAX(a.last_txn_at)           AS last_activity
FROM customers c
LEFT JOIN accounts a ON a.customer_id = c.customer_id AND a.status = 'active'
GROUP BY c.customer_id, c.cust_code, c.full_name, c.segment;

CREATE VIEW v_dormant_accounts AS
SELECT a.account_id, a.account_number, a.customer_id, a.balance,
       a.last_txn_at,
       CAST(julianday('now') - julianday(a.last_txn_at) AS INTEGER) AS days_since_txn
FROM accounts a
WHERE a.status IN ('active','dormant')
  AND (a.last_txn_at IS NULL OR julianday('now') - julianday(a.last_txn_at) > 365);

CREATE VIEW v_loan_delinquency AS
SELECT l.loan_id, l.loan_number, l.customer_id, l.outstanding,
       COUNT(CASE WHEN lp.status IN ('late','missed','partial') THEN 1 END) AS overdue_emis,
       MAX(CASE WHEN lp.status IN ('late','missed','partial') THEN lp.due_date END) AS latest_overdue
FROM loans l
LEFT JOIN loan_payments lp ON lp.loan_id = l.loan_id
GROUP BY l.loan_id, l.loan_number, l.customer_id, l.outstanding;

CREATE VIEW v_high_value_transactions AS
SELECT t.*, c.full_name, c.segment
FROM transactions t
JOIN accounts a ON a.account_id = t.account_id
JOIN customers c ON c.customer_id = a.customer_id
WHERE t.amount >= 200000 AND t.status = 'success';

-- ============================================================
-- Seed data — small, edge-case rich
-- ============================================================
INSERT INTO branches VALUES
 (1,'HDFC0000001','MG Road Branch','HDFC0000001','HDFCINBB','12 MG Road','Bengaluru','KA','IN','1998-04-01','active'),
 (2,'HDFC0000002','Bandra Branch','HDFC0000002','HDFCINBB','Linking Rd','Mumbai','MH','IN','2002-06-15','active'),
 (3,'HDFC0000003','Connaught Pl','HDFC0000003','HDFCINBB','CP Block A','New Delhi','DL','IN','2005-11-20','active'),
 (4,'HDFC0000004','Salt Lake','HDFC0000004','HDFCINBB','Sec V','Kolkata','WB','IN','2010-01-10','active'),
 (5,'HDFC0000099','Old Pune Br','HDFC0000099','HDFCINBB','FC Road','Pune','MH','IN','1995-03-01','closed');

INSERT INTO employees VALUES
 (1,'EMP0001','Ravi Kumar','ravi@bank.in','9800000001',1,NULL,'manager','2005-06-01','active'),
 (2,'EMP0002','Priya Shah','priya@bank.in','9800000002',1,1,'rm','2010-04-15','active'),
 (3,'EMP0003','Ankit Verma','ankit@bank.in','9800000003',1,1,'teller','2018-01-20','active'),
 (4,'EMP0004','Neha Iyer','neha@bank.in','9800000004',2,NULL,'manager','2007-09-01','active'),
 (5,'EMP0005','Rohan Das','rohan@bank.in','9800000005',2,4,'rm','2012-07-01','active'),
 (6,'EMP0006','Sana Malik','sana@bank.in','9800000006',3,NULL,'manager','2009-05-10','active'),
 (7,'EMP0007','Vivek Rao','vivek@bank.in','9800000007',3,6,'ops','2015-02-01','active'),
 (8,'EMP0008','Karthik B','karthik@bank.in',NULL,1,1,'teller','2020-11-10','active');

INSERT INTO customers VALUES
 (1,'CUST000001','Alice Sharma','1988-03-12','F','alice@example.com','9812340001','ABCPS1234A','1234','12 Palm St','Bengaluru','KA','IN','priority','verified','low','2019-01-15',1,'active'),
 (2,'CUST000002','Bob Menon','1975-07-04','M','bob@example.com','9812340002','BCDPM2345B','2345','7 Elm Rd','Mumbai','MH','IN','hnw','verified','low','2015-06-20',2,'active'),
 (3,'CUST000003','Carol Nair',NULL,'F','carol@example.com','9812340003','CDEPN3456C','3456','1 Rose Ln','New Delhi','DL','IN','retail','verified','low','2018-10-01',3,'active'),
 (4,'CUST000004','Dev Kapoor','1992-11-22','M',NULL,'9812340004','DEFPK4567D','4567','5 Oak Ave','Kolkata','WB','IN','retail','pending','medium','2023-05-15',4,'active'),
 (5,'CUST000005','Eshaan Patel','1985-05-05','M','not-an-email','9812340005','EFGPP5678E',NULL,'  22 Fig St ','Bengaluru','KA','IN','retail','expired','low','2016-02-10',1,'dormant'),
 (6,'CUST000006','Farah Khan','1990-09-30','F','farah@example.com',NULL,'FGHPK6789F','6789','8 Neem Rd','Mumbai','MH','IN','priority','verified','high','2017-12-05',2,'active'),
 (7,'CUST000007','Gopal Rao','1968-01-19','M','gopal@example.com','9812340007','GHIPR7890G','7890','9 Teak St','Chennai','TN','IN','hnw','verified','low','2010-08-01',NULL,'active'),
 (8,'CUST000008','Hina Sethi','1995-12-25','F','hina@example.com','9812340008','HIJPS8901H','8901','2 Cedar Ln','Bengaluru','KA','IN','retail','verified','low','2021-07-30',1,'active'),
 (9,'CUST000009','Imran Ali','1982-06-15','M','imran@example.com','9812340009','IJKPA9012I','9012','15 Pine St','New Delhi','DL','IN','retail','rejected','high','2022-03-11',3,'blacklisted'),
 (10,'CUST000010','Jaya Menon','1978-04-08','F','jaya@example.com','9812340010','JKLPM0123J','0123','4 Palm St','Bengaluru','KA','IN','priority','verified','low','2014-11-01',1,'active'),
 (11,'CUST000011','Kabir Sen','1993-02-28','M','kabir@EXAMPLE.com','9812340011','KLMPS1234K','1234','6 Birch Rd','Mumbai','MH','IN','retail','verified','low','2020-01-25',2,'active'),
 (12,'CUST000012','Leena Nair','1989-10-10','F','leena@example.com','9812340012',NULL,NULL,'18 Ash St','Pune','MH','IN','retail','pending','low','2024-03-01',5,'closed');

INSERT INTO accounts VALUES
 (100,'0011000000001',1,1,'savings','INR',245000.50,245000.50,0,3.5,'2019-01-15','2025-10-14','active',0),
 (101,'0011000000002',1,1,'current','INR',12500.00,12500.00,50000,0,'2020-05-01','2025-09-20','active',0),
 (102,'0011000000003',2,2,'savings','INR',1250000.00,1250000.00,0,3.5,'2015-06-20','2025-10-15','active',0),
 (103,'0011000000004',2,2,'current','INR',-15000.00,-15000.00,100000,0,'2016-07-10','2025-10-10','active',0),  -- overdraft usage
 (104,'0011000000005',3,3,'savings','INR',85000.00,85000.00,0,3.5,'2018-10-01','2025-08-01','active',0),
 (105,'0011000000006',4,4,'savings','INR',0.00,0.00,0,3.5,'2023-05-15',NULL,'frozen',0),                     -- pending KYC → frozen
 (106,'0011000000007',5,1,'savings','INR',1200.00,1200.00,0,3.5,'2016-02-10','2022-01-15','dormant',0),     -- no activity 3+ yrs
 (107,'0011000000008',6,2,'savings','INR',560000.00,560000.00,0,3.5,'2017-12-05','2025-10-15','active',0),
 (108,'0011000000009',7,2,'savings','INR',7800000.00,7800000.00,0,4.0,'2010-08-01','2025-10-15','active',0),-- HNW
 (109,'0011000000010',7,2,'nri','USD',150000.00,150000.00,0,2.0,'2011-01-01','2025-10-01','active',0),
 (110,'0011000000011',8,1,'salary','INR',68000.00,68000.00,0,3.5,'2021-07-30','2025-10-15','active',0),
 (111,'0011000000012',9,3,'savings','INR',0.00,0.00,0,3.5,'2022-03-11','2023-01-05','closed',0),           -- blacklisted → closed
 (112,'0011000000013',10,1,'savings','INR',420000.00,420000.00,0,3.5,'2014-11-01','2025-10-15','active',1),-- joint
 (113,'0011000000014',12,5,'savings','INR',0.00,0.00,0,3.5,'2024-03-01',NULL,'closed',0);

-- joint: account 112 held by cust 10 (primary) and cust 1 (secondary), nominee cust 8
INSERT INTO account_holders VALUES
 (112,10,'primary','2014-11-01'),
 (112,1,'secondary','2018-03-15'),
 (112,8,'nominee','2021-01-10');

INSERT INTO beneficiaries VALUES
 (1,1,'Mom',   '9988776655','HDFC0000001','Mom',       '2020-04-01',1),
 (2,1,'Landlord','0011000000003','HDFC0000002','Rent',  '2021-06-15',1),
 (3,2,'Vendor A','9911223344','HDFC0000003','Supplier', '2019-02-10',1),
 (4,7,'Son NRI','9800112233','HDFC0000001','Son',       '2018-08-01',0),
 (5,10,'Broker','7788990011','HDFC0000002','Broker',    '2023-01-20',1);

INSERT INTO cards VALUES
 (1,'hash-a01','**** **** **** 1001','debit','visa',1,100,'2019-01-20','2027-01-31',NULL,'active'),
 (2,'hash-a02','**** **** **** 1002','credit','visa',1,NULL,'2020-06-01','2024-05-31',200000,'expired'),
 (3,'hash-a03','**** **** **** 2001','debit','mastercard',2,102,'2015-07-01','2026-06-30',NULL,'active'),
 (4,'hash-a04','**** **** **** 2002','credit','amex',2,NULL,'2018-01-01','2028-12-31',1000000,'active'),
 (5,'hash-a05','**** **** **** 5001','debit','rupay',5,106,'2016-03-01','2024-02-28',NULL,'expired'),
 (6,'hash-a06','**** **** **** 6001','credit','visa',6,NULL,'2021-05-01','2027-04-30',500000,'blocked'),
 (7,'hash-a07','**** **** **** 9001','debit','visa',9,111,'2022-04-01','2026-03-31',NULL,'lost'),
 (8,'hash-a08','**** **** **** 8001','credit','mastercard',8,NULL,'2022-08-01','2027-07-31',150000,'active');

INSERT INTO fixed_deposits VALUES
 (1,1,100, 100000, 6.75, 12,'2024-01-15','2025-01-15',106750,'matured'),
 (2,2,102, 500000, 7.25, 24,'2023-03-01','2025-03-01',572500,'matured'),
 (3,7,108,2000000, 7.50, 60,'2022-09-01','2027-09-01',NULL,   'active'),
 (4,10,112,300000, 7.10, 36,'2023-06-01','2026-06-01',NULL,   'active'),
 (5,1,100,  50000, 6.90,  6,'2024-08-01','2025-02-01', 51725,'premature_closed');

INSERT INTO recurring_deposits VALUES
 (1,2,102,10000,7.00,24,'2023-01-01','2025-01-01','active'),
 (2,8,110, 5000,6.75,36,'2022-06-01','2025-06-01','active');

INSERT INTO loans VALUES
 (1,'LN2020HL0001',2,'home',   5000000,3200000,8.50,240,43391,'2020-01-15','2020-02-15','2025-11-15','active'),
 (2,'LN2021AL0002',1,'auto',    800000, 250000,9.25, 60,16700,'2021-06-01','2021-07-01','2025-11-01','active'),
 (3,'LN2019PL0003',5,'personal',300000,      0,12.50,36,10000,'2019-03-01','2019-04-01','2022-04-01','closed'),
 (4,'LN2022PL0004',9,'personal',500000, 480000,13.75,48,13900,'2022-05-01','2022-06-01','2024-06-01','npa'),
 (5,'LN2023EL0005',8,'edu',    1500000,1400000,10.00,84,24900,'2023-08-01','2023-09-01','2025-11-01','active'),
 (6,'LN2018BL0006',7,'business',10000000,   0, 9.50,120,127300,'2018-01-01','2018-02-01','2028-01-01','written_off');

INSERT INTO loan_payments VALUES
 (1,1,'2025-08-15','2025-08-15',43391,20000,23391,   0,'paid'),
 (2,1,'2025-09-15','2025-09-20',43391,20000,23391,500,'late'),
 (3,1,'2025-10-15',NULL,        43391,NULL,NULL,   0,'pending'),
 (4,2,'2025-09-01','2025-09-01',16700, 6000,10700,   0,'paid'),
 (5,2,'2025-10-01',NULL,        16700,NULL,NULL,   0,'pending'),
 (6,4,'2025-07-01',NULL,        13900,NULL,NULL,   0,'missed'),
 (7,4,'2025-08-01',NULL,        13900,NULL,NULL,   0,'missed'),
 (8,4,'2025-09-01','2025-09-25',13900, 3000,10900,1500,'partial'),
 (9,5,'2025-09-01','2025-09-01',24900,12000,12900,   0,'paid'),
 (10,5,'2025-10-01',NULL,       24900,NULL,NULL,   0,'pending');

INSERT INTO merchants VALUES
 (1,'MCH00001','Amazon India','ecom','5399','Bengaluru','IN','2015-01-01','active'),
 (2,'MCH00002','Swiggy','food','5812','Bengaluru','IN','2016-06-01','active'),
 (3,'MCH00003','BigBasket','retail','5411','Bengaluru','IN','2017-03-01','active'),
 (4,'MCH00004','IRCTC','travel','4722','New Delhi','IN','2014-01-01','active'),
 (5,'MCH00005','Reliance Fresh','retail','5411','Mumbai','IN','2015-05-01','active'),
 (6,'MCH00006','SuspiciousShop','ecom','5399','Unknown','XX','2024-01-01','active');

INSERT INTO upi_ids VALUES
 ('alice@okhdfc',   1,100,1,'2019-02-01'),
 ('bob@okhdfc',     2,102,1,'2015-07-01'),
 ('carol@okhdfc',   3,104,1,'2018-11-01'),
 ('farah@okhdfc',   6,107,1,'2018-01-01'),
 ('jaya@okhdfc',    10,112,1,'2015-01-01'),
 ('kabir@okhdfc',   11,NULL,0,'2020-02-01'),   -- orphan: no account link
 ('hina.pay@okhdfc',8,110,1,'2021-08-01');

INSERT INTO transactions VALUES
 (1,'TXN2025101500001',100,'alice@okhdfc','debit','upi',   1500,'INR',1,0,243500.50,2,'Swiggy order','2025-10-15 12:30:00','2025-10-15','success',0,NULL,0),
 (2,'TXN2025101500002',100,'bob@okhdfc',  'debit','upi',   5000,'INR',1,0,238500.50,NULL,'Rent split','2025-10-15 13:00:00','2025-10-15','success',0,NULL,0),
 (3,'TXN2025101500003',100,'MCH00001',    'debit','pos',   9999,'INR',1,0,228501.50,1,'Amazon','2025-10-15 14:00:00','2025-10-15','success',0,NULL,0),
 (4,'TXN2025101400010',102,'0011000000001','credit','neft',50000,'INR',1,0,1300000,NULL,'Bonus','2025-10-14 09:00:00','2025-10-14','success',0,NULL,0),
 (5,'TXN2025101400011',102,'0011000000003','debit','imps',  7500,'INR',1,5,1249495,NULL,'Utility','2025-10-14 10:00:00','2025-10-14','success',0,NULL,0),
 (6,'TXN2025101300020',103,'0011000000004','debit','atm',  20000,'INR',1,20,-15000,NULL,'ATM WDL','2025-10-13 18:00:00','2025-10-13','success',0,NULL,0),
 (7,'TXN2025101200030',104,'0011000000005','debit','pos',   3200,'INR',1,0,85000,3,'BigBasket','2025-10-12 20:00:00','2025-10-12','success',0,NULL,0),
 (8,'TXN2025101100040',107,'0011000000006','debit','rtgs',300000,'INR',1,50,260000,NULL,'Property','2025-10-11 11:00:00','2025-10-11','success',0,NULL,0),
 (9,'TXN2025101100041',108,'MCH00004',    'debit','pos',   45000,'INR',1,0,7755000,4,'Flight','2025-10-11 12:00:00','2025-10-11','success',0,NULL,0),
 (10,'TXN2025101000050',109,'0011000000008','credit','swift',2500,'USD',83.2,10,150000,NULL,'Remittance','2025-10-10 08:00:00','2025-10-10','success',0,NULL,0),
 (11,'TXN2025100900060',110,'MCH00002',    'debit','upi',   350,'INR',1,0,68000,2,'Swiggy','2025-10-09 21:00:00','2025-10-09','success',0,NULL,0),
 -- Failed / reversed / duplicates / fraud edge cases
 (12,'TXN2025100800070',100,'bob@okhdfc',  'debit','upi',   5000,'INR',1,0,NULL,NULL,'Rent split','2025-10-08 13:00:00','2025-10-08','failed',0,NULL,0),
 (13,'TXN2025100800071',100,'bob@okhdfc',  'debit','upi',   5000,'INR',1,0,NULL,NULL,'Rent split retry','2025-10-08 13:01:00','2025-10-08','success',1,NULL,0), -- flagged duplicate
 (14,'TXN2025100700080',102,'MCH00006',    'debit','pos', 199999,'INR',1,0,NULL,6,'Sus vendor','2025-10-07 03:00:00','2025-10-07','success',0,NULL,1),           -- fraud flag
 (15,'TXN2025100700081',102,'MCH00006',    'credit','pos',199999,'INR',1,0,NULL,6,'Reversal',   '2025-10-07 04:00:00','2025-10-07','reversed',0,14,0),
 (16,'TXN2025100600090',108,'MCH00001',    'debit','pos', 850000,'INR',1,0,NULL,1,'High value',  '2025-10-06 15:00:00','2025-10-06','success',0,NULL,0),
 (17,'TXN2025100600091',103,'0011000000004','debit','neft',30000,'INR',1,25,NULL,NULL,'Payroll',  '2025-10-06 10:00:00','2025-10-06','pending',0,NULL,0),
 (18,'TXN2025100500100',106,'MCH00003',    'debit','pos',   500,'INR',1,0,700,3,'Dormant acct spend','2022-01-15 16:00:00','2022-01-15','success',0,NULL,0),
 (19,'TXN2025100400110',111,'MCH00006',    'debit','upi', 100000,'INR',1,0,NULL,6,'Blacklisted', '2023-01-04 02:00:00','2023-01-04','success',0,NULL,1),
 (20,'TXN2025100300120',112,'0011000000001','credit','imps',75000,'INR',1,0,420000,NULL,'Rental income','2025-10-03 09:30:00','2025-10-03','success',0,NULL,0);

INSERT INTO kyc_documents VALUES
 (1,1,'pan','ABCPS1234A','2019-01-10','2019-01-15','2029-01-10','verified'),
 (2,1,'aadhaar','XXXX1234','2019-01-10','2019-01-15',NULL,'verified'),
 (3,2,'pan','BCDPM2345B','2015-06-15','2015-06-20','2025-06-15','verified'),
 (4,4,'pan','DEFPK4567D','2023-05-10',NULL,NULL,'pending'),
 (5,5,'pan','EFGPP5678E','2016-02-05','2016-02-10','2024-02-05','expired'),
 (6,9,'pan','IJKPA9012I','2022-03-08',NULL,NULL,'rejected'),
 (7,7,'passport','P1234567','2010-07-25','2010-08-01','2030-07-25','verified');

INSERT INTO fraud_alerts VALUES
 (1,2,14,'amount','high','2025-10-07 03:05:00','2025-10-07 04:00:00','confirmed'),
 (2,9,19,'blacklist','critical','2023-01-04 02:05:00',NULL,'pending'),
 (3,1,13,'velocity','medium','2025-10-08 13:05:00','2025-10-08 15:00:00','false_positive'),
 (4,7,16,'amount','medium','2025-10-06 15:10:00','2025-10-06 16:00:00','false_positive');

INSERT INTO audit_log VALUES
 (1,'account',105,'freeze',6,'employee','2023-06-01 10:00:00','active','frozen'),
 (2,'account',106,'update',NULL,'system','2022-06-01 00:00:00','active','dormant'),
 (3,'customer',9,'update',7,'employee','2023-01-01 12:00:00','active','blacklisted'),
 (4,'account',111,'update',7,'employee','2023-01-05 09:00:00','active','closed'),
 (5,'loan',6,'update',1,'employee','2021-04-01 11:00:00','npa','written_off');

INSERT INTO statements VALUES
 (1,100,'2025-09-01','2025-09-30',240000,245000.50,'2025-10-01 00:00:00'),
 (2,102,'2025-09-01','2025-09-30',1200000,1250000,'2025-10-01 00:00:00'),
 (3,108,'2025-09-01','2025-09-30',7500000,7800000,'2025-10-01 00:00:00');

INSERT INTO charges VALUES
 (1,101,'non_maintenance',500,'2025-09-30',0),
 (2,103,'penalty',1000,'2025-10-01',0),
 (3,106,'amc',350,'2024-04-01',0),
 (4,105,'penalty',750,'2025-08-01',1),
 (5,110,'sms',60,'2025-10-01',0);
`;

export const enterpriseBanking: SampleDatabase = {
  id: "enterprise_banking",
  name: "🏦 Enterprise Banking",
  description:
    "Full retail-banking ecosystem: customers, accounts (savings/current/joint/NRI), cards, loans, deposits, UPI/IMPS/NEFT/RTGS/SWIFT transactions, KYC/AML, fraud alerts, and analytical views. Seeded with dormant accounts, loan defaults, duplicate/reversed transactions, joint holders, and fraud flags.",
  tables: [],
  raw: { default: SQL, sqlite: SQL, mysql: SQL },
};
