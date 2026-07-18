// Enterprise Retail / E-Commerce sample database.
import type { SampleDatabase } from "../sample-builder";

const SQL = /* sql */ `
PRAGMA foreign_keys = ON;

CREATE TABLE brands (
  brand_id   INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  country    TEXT
);

CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  parent_id   INTEGER REFERENCES categories(category_id)  -- recursive tree
);

CREATE TABLE suppliers (
  supplier_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  country     TEXT,
  contact     TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE warehouses (
  warehouse_id INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  city         TEXT,
  state        TEXT,
  country      TEXT DEFAULT 'IN',
  capacity     INTEGER
);

CREATE TABLE stores (
  store_id     INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  store_type   TEXT,           -- online|retail|warehouse
  city         TEXT,
  state        TEXT,
  opened_at    DATE,
  status       TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE employees (
  employee_id INTEGER PRIMARY KEY,
  full_name   TEXT NOT NULL,
  role        TEXT,            -- ops|support|manager|driver
  store_id    INTEGER REFERENCES stores(store_id),
  manager_id  INTEGER REFERENCES employees(employee_id),
  hire_date   DATE,
  status      TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE products (
  product_id   INTEGER PRIMARY KEY,
  sku          TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  brand_id     INTEGER REFERENCES brands(brand_id),
  category_id  INTEGER REFERENCES categories(category_id),
  supplier_id  INTEGER REFERENCES suppliers(supplier_id),
  price        REAL NOT NULL,
  cost         REAL,
  weight_kg    REAL,
  is_active    INTEGER NOT NULL DEFAULT 1,
  launched_at  DATE
);
CREATE INDEX idx_products_cat ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);

CREATE TABLE inventory (
  inventory_id INTEGER PRIMARY KEY,
  product_id   INTEGER NOT NULL REFERENCES products(product_id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id),
  quantity     INTEGER NOT NULL DEFAULT 0,
  reserved     INTEGER NOT NULL DEFAULT 0,
  reorder_pt   INTEGER DEFAULT 10,
  last_restocked DATE
);
CREATE INDEX idx_inv_prod ON inventory(product_id);
CREATE INDEX idx_inv_wh ON inventory(warehouse_id);

CREATE TABLE customers (
  customer_id  INTEGER PRIMARY KEY,
  cust_code    TEXT NOT NULL UNIQUE,
  full_name    TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  city         TEXT,
  state        TEXT,
  country      TEXT DEFAULT 'IN',
  segment      TEXT,             -- new|regular|vip
  signup_date  DATE,
  status       TEXT NOT NULL DEFAULT 'active'  -- active|inactive|banned
);
CREATE INDEX idx_cust_segment ON customers(segment);

CREATE TABLE addresses (
  address_id  INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  label       TEXT,               -- home|work|other
  line1       TEXT,
  city        TEXT,
  state       TEXT,
  zip         TEXT,
  country     TEXT DEFAULT 'IN',
  is_default  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE cart (
  cart_id     INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  product_id  INTEGER NOT NULL REFERENCES products(product_id),
  quantity    INTEGER NOT NULL,
  added_at    TEXT NOT NULL
);

CREATE TABLE wishlist (
  wishlist_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  product_id  INTEGER NOT NULL REFERENCES products(product_id),
  added_at    TEXT
);

CREATE TABLE coupons (
  coupon_id   INTEGER PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL,    -- pct|flat
  value       REAL NOT NULL,
  min_order   REAL DEFAULT 0,
  max_uses    INTEGER,
  used_count  INTEGER DEFAULT 0,
  valid_from  DATE,
  valid_to    DATE,
  status      TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE orders (
  order_id       INTEGER PRIMARY KEY,
  order_number   TEXT NOT NULL UNIQUE,
  customer_id    INTEGER NOT NULL REFERENCES customers(customer_id),
  store_id       INTEGER REFERENCES stores(store_id),
  order_date     TEXT NOT NULL,
  subtotal       REAL NOT NULL,
  discount       REAL DEFAULT 0,
  shipping_fee   REAL DEFAULT 0,
  tax            REAL DEFAULT 0,
  total_amount   REAL NOT NULL,
  coupon_id      INTEGER REFERENCES coupons(coupon_id),
  payment_method TEXT,             -- upi|card|cod|netbanking|wallet
  status         TEXT NOT NULL DEFAULT 'pending', -- pending|confirmed|shipped|delivered|cancelled|returned|failed
  is_cod         INTEGER NOT NULL DEFAULT 0,
  is_flash_sale  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);

CREATE TABLE order_items (
  order_item_id INTEGER PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES orders(order_id),
  product_id    INTEGER NOT NULL REFERENCES products(product_id),
  quantity      INTEGER NOT NULL,
  unit_price    REAL NOT NULL,
  discount      REAL DEFAULT 0,
  line_total    REAL NOT NULL
);
CREATE INDEX idx_oi_order ON order_items(order_id);
CREATE INDEX idx_oi_prod ON order_items(product_id);

CREATE TABLE payments (
  payment_id   INTEGER PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(order_id),
  amount       REAL NOT NULL,
  method       TEXT NOT NULL,
  txn_ref      TEXT,
  paid_at      TEXT,
  status       TEXT NOT NULL DEFAULT 'success'  -- success|failed|refunded|pending
);

CREATE TABLE invoices (
  invoice_id  INTEGER PRIMARY KEY,
  invoice_no  TEXT NOT NULL UNIQUE,
  order_id    INTEGER NOT NULL REFERENCES orders(order_id),
  issued_at   DATE,
  total       REAL,
  gst         REAL
);

CREATE TABLE shipments (
  shipment_id  INTEGER PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(order_id),
  warehouse_id INTEGER REFERENCES warehouses(warehouse_id),
  tracking_id  TEXT NOT NULL UNIQUE,
  carrier      TEXT,
  shipped_at   TEXT,
  eta          DATE,
  delivered_at TEXT,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending|in_transit|out_for_delivery|delivered|failed|returned|lost
  is_split     INTEGER NOT NULL DEFAULT 0       -- split shipment marker
);
CREATE INDEX idx_ship_order ON shipments(order_id);
CREATE INDEX idx_ship_status ON shipments(status);

CREATE TABLE returns (
  return_id    INTEGER PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(order_id),
  order_item_id INTEGER REFERENCES order_items(order_item_id),
  reason       TEXT,
  quantity     INTEGER,
  requested_at DATE,
  approved_at  DATE,
  status       TEXT NOT NULL DEFAULT 'requested' -- requested|approved|received|refunded|rejected
);

CREATE TABLE refunds (
  refund_id  INTEGER PRIMARY KEY,
  return_id  INTEGER REFERENCES returns(return_id),
  order_id   INTEGER NOT NULL REFERENCES orders(order_id),
  amount     REAL NOT NULL,
  method     TEXT,
  processed_at DATE,
  status     TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE reviews (
  review_id  INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  customer_id INTEGER REFERENCES customers(customer_id),
  order_id   INTEGER REFERENCES orders(order_id),
  rating     INTEGER NOT NULL,   -- 1..5
  comment    TEXT,
  created_at TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0,
  is_flagged  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_rev_prod ON reviews(product_id);

CREATE TABLE campaigns (
  campaign_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  start_date  DATE,
  end_date    DATE,
  budget      REAL,
  channel     TEXT,               -- email|push|social|search
  status      TEXT NOT NULL DEFAULT 'planned'
);

CREATE TABLE support_tickets (
  ticket_id   INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  order_id    INTEGER REFERENCES orders(order_id),
  subject     TEXT,
  category    TEXT,               -- delivery|refund|payment|product|other
  priority    TEXT,               -- low|med|high|urgent
  opened_at   TEXT,
  resolved_at TEXT,
  status      TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE audit_log (
  audit_id    INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER NOT NULL,
  action      TEXT NOT NULL,
  actor_id    INTEGER,
  changed_at  TEXT,
  old_value   TEXT,
  new_value   TEXT
);

-- Views
CREATE VIEW v_out_of_stock AS
SELECT p.product_id, p.sku, p.name, SUM(i.quantity - i.reserved) AS available
FROM products p
LEFT JOIN inventory i ON i.product_id = p.product_id
GROUP BY p.product_id, p.sku, p.name
HAVING COALESCE(SUM(i.quantity - i.reserved),0) <= 0;

CREATE VIEW v_customer_ltv AS
SELECT c.customer_id, c.full_name, c.segment,
       COUNT(o.order_id) AS orders_count,
       COALESCE(SUM(CASE WHEN o.status IN ('delivered','shipped') THEN o.total_amount END),0) AS lifetime_value,
       MAX(o.order_date) AS last_order
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.full_name, c.segment;

CREATE VIEW v_late_deliveries AS
SELECT s.shipment_id, s.order_id, s.tracking_id, s.eta, s.delivered_at,
       CAST(julianday(s.delivered_at) - julianday(s.eta) AS INTEGER) AS days_late
FROM shipments s
WHERE s.delivered_at IS NOT NULL AND s.eta IS NOT NULL AND julianday(s.delivered_at) > julianday(s.eta);

CREATE VIEW v_coupon_abuse AS
SELECT co.coupon_id, co.code, COUNT(o.order_id) AS uses,
       COUNT(DISTINCT o.customer_id) AS distinct_customers
FROM coupons co
JOIN orders o ON o.coupon_id = co.coupon_id
GROUP BY co.coupon_id, co.code
HAVING COUNT(o.order_id) > COUNT(DISTINCT o.customer_id) * 2;

-- Seed
INSERT INTO brands VALUES
 (1,'Apple','US'),(2,'Samsung','KR'),(3,'Nike','US'),(4,'Adidas','DE'),
 (5,'Boat','IN'),(6,'Levis','US'),(7,'Sony','JP');

INSERT INTO categories VALUES
 (1,'Electronics',NULL),(2,'Phones',1),(3,'Audio',1),(4,'Laptops',1),
 (5,'Fashion',NULL),(6,'Footwear',5),(7,'Apparel',5),(8,'Home',NULL),(9,'Kitchen',8);

INSERT INTO suppliers VALUES
 (1,'Apple India','IN','apple@sup.in','active'),
 (2,'Samsung Trading','KR','sam@sup.kr','active'),
 (3,'Nike Sports','IN','nike@sup.in','active'),
 (4,'Boat HQ','IN','boat@sup.in','active'),
 (5,'Dead Vendor','IN',NULL,'inactive');

INSERT INTO warehouses VALUES
 (1,'BLR WH1','Bengaluru','KA','IN',50000),
 (2,'MUM WH1','Mumbai','MH','IN',60000),
 (3,'DEL WH1','New Delhi','DL','IN',45000);

INSERT INTO stores VALUES
 (1,'ShopOnline','online','Bengaluru','KA','2010-01-01','active'),
 (2,'Flagship BLR','retail','Bengaluru','KA','2015-06-01','active'),
 (3,'MUM Store','retail','Mumbai','MH','2016-01-01','active'),
 (4,'Old DEL Store','retail','New Delhi','DL','2012-01-01','closed');

INSERT INTO employees VALUES
 (1,'Ravi K','manager',1,NULL,'2010-02-01','active'),
 (2,'Priya S','ops',1,1,'2015-06-01','active'),
 (3,'Ankit V','support',1,1,'2018-03-01','active'),
 (4,'Neha I','manager',2,NULL,'2015-07-01','active'),
 (5,'Rohan D','driver',2,4,'2019-05-01','active');

INSERT INTO products VALUES
 (1,'APL-IP15-128','iPhone 15 128GB',1,2,1,79900,60000,0.171,1,'2023-09-15'),
 (2,'APL-MBA-M2','MacBook Air M2',1,4,1,114900,90000,1.24,1,'2022-07-15'),
 (3,'SAM-S24-256','Galaxy S24 256GB',2,2,2,84999,65000,0.168,1,'2024-01-17'),
 (4,'BOAT-450','boAt Rockerz 450',5,3,4,1499,700,0.20,1,'2020-01-01'),
 (5,'NKE-AF1','Nike Air Force 1',3,6,3,7999,3500,0.9,1,'2019-01-01'),
 (6,'ADI-UB22','Adidas Ultraboost 22',4,6,3,17999,7500,0.85,1,'2022-03-01'),
 (7,'LEV-501','Levis 501 Jeans',6,7,3,3999,1500,0.6,1,'2018-01-01'),
 (8,'SNY-WH1000','Sony WH-1000XM5',7,3,2,29990,15000,0.25,1,'2022-05-01'),
 (9,'APL-IP12-64','iPhone 12 64GB',1,2,1,49900,35000,0.164,0,'2020-10-15'),  -- discontinued
 (10,'GEN-KIT-01','Kitchen Blender',NULL,9,4,3999,1500,2.5,1,'2021-01-01');

INSERT INTO inventory VALUES
 (1,1,1,45,5,10,'2025-10-01'),
 (2,1,2,20,2,5,'2025-09-15'),
 (3,2,1,15,1,5,'2025-09-20'),
 (4,3,1,0,0,10,'2025-09-01'),        -- out of stock
 (5,3,2,3,3,10,'2025-10-05'),        -- fully reserved
 (6,4,1,500,20,50,'2025-10-10'),
 (7,5,1,120,10,20,'2025-09-25'),
 (8,6,2,80,4,20,'2025-10-01'),
 (9,7,3,200,15,30,'2025-09-30'),
 (10,8,1,25,2,5,'2025-10-05'),
 (11,9,1,0,0,0,'2024-12-01'),        -- discontinued
 (12,10,3,60,3,15,'2025-09-15');

INSERT INTO customers VALUES
 (1,'C000001','Alice Sharma','alice@example.com','9812340001','Bengaluru','KA','IN','vip','2019-01-15','active'),
 (2,'C000002','Bob Menon','bob@example.com','9812340002','Mumbai','MH','IN','regular','2020-06-20','active'),
 (3,'C000003','Carol Nair','carol@example.com',NULL,'New Delhi','DL','IN','regular','2021-01-10','active'),
 (4,'C000004','Dev Kapoor','not-an-email','9812340004','Kolkata','WB','IN','new','2025-03-15','active'),
 (5,'C000005','Eshaan Patel',NULL,'9812340005','Bengaluru','KA','IN','regular','2018-11-01','inactive'),
 (6,'C000006','Farah Khan','farah@example.com','9812340006','Mumbai','MH','IN','vip','2017-05-01','active'),
 (7,'C000007','Gopal Rao','gopal@example.com','9812340007','Chennai','TN','IN','regular','2019-09-01','active'),
 (8,'C000008','Hina Sethi','hina@example.com','9812340008','Bengaluru','KA','IN','new','2025-08-01','active'),
 (9,'C000009','Coupon Abuser','abuse@example.com','9812340009','New Delhi','DL','IN','new','2025-09-01','banned'),
 (10,'C000010','Jaya Menon','jaya@example.com','9812340010','Bengaluru','KA','IN','vip','2016-11-01','active');

INSERT INTO addresses VALUES
 (1,1,'home','12 Palm St','Bengaluru','KA','560001','IN',1),
 (2,2,'home','7 Elm Rd','Mumbai','MH','400001','IN',1),
 (3,2,'work','5 Business Park','Mumbai','MH','400002','IN',0),
 (4,6,'home','8 Neem Rd','Mumbai','MH','400003','IN',1),
 (5,10,'home','4 Palm St','Bengaluru','KA','560002','IN',1);

INSERT INTO cart VALUES
 (1,1,3,1,'2025-10-15 10:00:00'),
 (2,1,8,1,'2025-10-15 10:05:00'),
 (3,4,4,2,'2025-10-15 09:00:00'),
 (4,8,5,1,'2025-10-14 20:00:00');

INSERT INTO wishlist VALUES
 (1,1,2,'2025-09-01'),
 (2,6,1,'2025-08-15'),
 (3,7,6,'2025-07-01');

INSERT INTO coupons VALUES
 (1,'WELCOME10','pct',10,999,1000,120,'2025-01-01','2025-12-31','active'),
 (2,'FLAT500','flat',500,2999,500,340,'2025-05-01','2025-11-30','active'),
 (3,'DIWALI25','pct',25,4999,2000,1850,'2025-10-01','2025-10-31','active'),
 (4,'EXPIRED','pct',50,499,100,55,'2024-01-01','2024-03-31','expired');

INSERT INTO orders VALUES
 (1,'ORD-2025-10-0001',1,1,'2025-10-01 09:00:00',79900,7990,0,12967,84877,1,'card','delivered',0,0),
 (2,'ORD-2025-10-0002',2,1,'2025-10-02 11:00:00',114900,0,499,20682,136081,NULL,'netbanking','delivered',0,0),
 (3,'ORD-2025-10-0003',6,1,'2025-10-03 15:00:00',29990,0,0,5398,35388,NULL,'card','delivered',0,0),
 (4,'ORD-2025-10-0004',1,1,'2025-10-05 20:00:00',9498,500,49,1620,10667,2,'upi','shipped',0,0),
 (5,'ORD-2025-10-0005',4,1,'2025-10-08 21:00:00',2998,0,79,540,3617,NULL,'cod','pending',1,0),
 (6,'ORD-2025-10-0006',7,1,'2025-10-09 10:00:00',17999,4500,0,2430,15929,3,'upi','cancelled',0,1),
 (7,'ORD-2025-10-0007',8,2,'2025-10-11 12:00:00',7999,0,0,1440,9439,NULL,'card','returned',0,0),
 (8,'ORD-2025-10-0008',10,1,'2025-10-12 14:00:00',84999,21250,0,11475,75224,3,'card','delivered',0,1),
 (9,'ORD-2025-10-0009',9,1,'2025-10-01 08:00:00',9998,2500,0,1350,8848,3,'upi','delivered',0,0),
 (10,'ORD-2025-10-0010',9,1,'2025-10-02 09:00:00',9998,2500,0,1350,8848,3,'upi','delivered',0,0),
 (11,'ORD-2025-10-0011',9,1,'2025-10-03 09:00:00',9998,2500,0,1350,8848,3,'upi','delivered',0,0),
 (12,'ORD-2025-10-0012',3,3,'2025-10-14 16:00:00',3999,0,49,720,4768,NULL,'card','failed',0,0),
 (13,'ORD-2025-09-0100',6,1,'2025-09-20 10:00:00',114900,0,0,20682,135582,NULL,'card','delivered',0,0);

INSERT INTO order_items VALUES
 (1,1,1,1,79900,7990,71910),
 (2,2,2,1,114900,0,114900),
 (3,3,8,1,29990,0,29990),
 (4,4,5,1,7999,0,7999),
 (5,4,4,1,1499,500,999),      -- discount on line
 (6,5,4,2,1499,0,2998),
 (7,6,6,1,17999,4500,13499),
 (8,7,5,1,7999,0,7999),
 (9,8,3,1,84999,21250,63749),
 (10,9,10,1,3999,1000,2999),
 (11,9,7,1,3999,1500,2499),   -- wait: mismatch to test data QA
 (12,10,10,1,3999,1000,2999),
 (13,10,7,1,3999,1500,2499),
 (14,11,10,1,3999,1000,2999),
 (15,11,7,1,3999,1500,2499),
 (16,12,10,1,3999,0,3999),
 (17,13,2,1,114900,0,114900);

INSERT INTO payments VALUES
 (1,1,84877,'card','TXN-P-001','2025-10-01 09:05:00','success'),
 (2,2,136081,'netbanking','TXN-P-002','2025-10-02 11:10:00','success'),
 (3,3,35388,'card','TXN-P-003','2025-10-03 15:10:00','success'),
 (4,4,10667,'upi','TXN-P-004','2025-10-05 20:05:00','success'),
 (5,6,0,'upi',NULL,NULL,'failed'),
 (6,7,9439,'card','TXN-P-005','2025-10-11 12:10:00','refunded'),
 (7,8,75224,'card','TXN-P-006','2025-10-12 14:10:00','success'),
 (8,9,8848,'upi','TXN-P-007','2025-10-01 08:05:00','success'),
 (9,10,8848,'upi','TXN-P-008','2025-10-02 09:05:00','success'),
 (10,11,8848,'upi','TXN-P-009','2025-10-03 09:05:00','success'),
 (11,12,0,'card',NULL,NULL,'failed'),
 (12,13,135582,'card','TXN-P-010','2025-09-20 10:05:00','success');

INSERT INTO invoices VALUES
 (1,'INV-2025-10-0001',1,'2025-10-01',84877,12967),
 (2,'INV-2025-10-0002',2,'2025-10-02',136081,20682),
 (3,'INV-2025-10-0003',3,'2025-10-03',35388,5398),
 (4,'INV-2025-10-0008',8,'2025-10-12',75224,11475);

INSERT INTO shipments VALUES
 (1,1,1,'TRK-A-0001','BlueDart','2025-10-01 18:00:00','2025-10-03','2025-10-03 14:00:00','delivered',0),
 (2,2,2,'TRK-A-0002','Delhivery','2025-10-02 19:00:00','2025-10-05','2025-10-06 10:00:00','delivered',0),  -- late by 1 day
 (3,3,1,'TRK-A-0003','BlueDart','2025-10-03 20:00:00','2025-10-05','2025-10-05 11:00:00','delivered',0),
 (4,4,1,'TRK-A-0004a','Delhivery','2025-10-06 09:00:00','2025-10-08',NULL,'in_transit',1),
 (5,4,2,'TRK-A-0004b','Delhivery','2025-10-06 09:00:00','2025-10-09',NULL,'in_transit',1),
 (6,7,2,'TRK-A-0007','Ekart','2025-10-11 20:00:00','2025-10-13','2025-10-13 16:00:00','returned',0),
 (7,8,1,'TRK-A-0008','BlueDart','2025-10-12 18:00:00','2025-10-14','2025-10-15 12:00:00','delivered',0), -- late
 (8,9,1,'TRK-A-0009','Delhivery','2025-10-01 18:00:00','2025-10-03','2025-10-03 15:00:00','delivered',0),
 (9,10,1,'TRK-A-0010','Delhivery','2025-10-02 18:00:00','2025-10-04','2025-10-04 15:00:00','delivered',0),
 (10,11,1,'TRK-A-0011','Delhivery','2025-10-03 18:00:00','2025-10-05','2025-10-05 15:00:00','delivered',0),
 (11,13,2,'TRK-A-0013','BlueDart','2025-09-20 19:00:00','2025-09-22','2025-09-22 12:00:00','delivered',0);

INSERT INTO returns VALUES
 (1,7,8,'Damaged',1,'2025-10-14','2025-10-15','received'),
 (2,4,5,'Wrong item',1,'2025-10-10',NULL,'requested');

INSERT INTO refunds VALUES
 (1,1,7,9439,'card','2025-10-16','processed'),
 (2,NULL,6,15929,'upi','2025-10-10','processed'),
 (3,NULL,12,0,'card',NULL,'pending');

INSERT INTO reviews VALUES
 (1,1,1,1,5,'Great phone','2025-10-05 10:00:00',1,0),
 (2,2,2,2,4,'Fast, but pricey','2025-10-06 09:00:00',1,0),
 (3,8,6,3,5,'Amazing sound','2025-10-07 11:00:00',1,0),
 (4,5,8,7,1,'Broke immediately','2025-10-14 10:00:00',1,0),
 (5,1,NULL,NULL,5,'Best phone ever!!! 🚀🚀🚀','2025-10-14 11:00:00',0,1),   -- fake review flagged
 (6,4,NULL,NULL,1,'Terrible',           '2025-10-14 12:00:00',0,1),
 (7,3,3,NULL,4,'Nice',                   '2025-10-01 09:00:00',0,0);

INSERT INTO campaigns VALUES
 (1,'Diwali Sale 2025','2025-10-15','2025-11-05',2500000,'social','active'),
 (2,'Flash Weekend',    '2025-09-20','2025-09-22', 500000,'push','completed'),
 (3,'Winter Fashion',   '2025-11-10','2025-12-31',1000000,'email','planned');

INSERT INTO support_tickets VALUES
 (1,4,5,'Delivery pending','delivery','high','2025-10-14 10:00:00',NULL,'open'),
 (2,8,7,'Product broken','product','high','2025-10-14 11:00:00','2025-10-15 14:00:00','resolved'),
 (3,7,6,'Refund status','refund','med','2025-10-10 09:00:00','2025-10-10 15:00:00','resolved'),
 (4,3,12,'Payment failed','payment','urgent','2025-10-14 17:00:00',NULL,'open');

INSERT INTO audit_log VALUES
 (1,'customer',9,'update',1,'2025-10-04 00:00:00','active','banned'),
 (2,'order',6,'update',NULL,'2025-10-09 12:00:00','confirmed','cancelled'),
 (3,'product',9,'update',1,'2024-12-01 00:00:00','active','discontinued'),
 (4,'return',1,'update',3,'2025-10-15 10:00:00','requested','received');
`;

export const enterpriseRetail: SampleDatabase = {
  id: "enterprise_retail",
  name: "🛒 Enterprise Retail / E-Commerce",
  description:
    "Full commerce platform: products, categories (recursive), inventory, orders, order items, payments, shipments (with splits), returns, refunds, reviews, coupons, campaigns, and support tickets. Seeded with out-of-stock, late deliveries, coupon abuse, fake reviews, cancelled/returned/failed orders, and COD.",
  tables: [],
  raw: { default: SQL, sqlite: SQL, mysql: SQL },
};
