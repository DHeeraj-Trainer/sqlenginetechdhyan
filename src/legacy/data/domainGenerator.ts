// @ts-nocheck
import { DomainData, SQLTable, PracticeQuestion } from "../types";
import { healthcareData } from "./domain_healthcare";

// Seed arrays for realistic data generation
const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Elizabeth", "William", "Linda", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", "San Francisco", "Indianapolis", "Columbus", "Fort Worth", "Charlotte", "Seattle", "Denver", "Boston"];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName(index: number): string {
  const first = firstNames[index % firstNames.length];
  const last = lastNames[(index + 3) % lastNames.length];
  return `${first} ${last}`;
}

export function generateAllDomains(): DomainData[] {
  const domains: DomainData[] = [];

  // 1. HEALTHCARE is pre-coded as high-fidelity manually crafted baseline
  domains.push(healthcareData);

  // Define structures for the remaining 9 domains
  const bluePrints = [
    {
      id: "retail",
      name: "Retail",
      icon: "ShoppingBag",
      businessScenario: "Manage the 'PrimeCommerce Mall' database including customer cards, inventory products, and sales orders. Analyze store performance, discount distribution, and high-value orders to stock the physical outlet wisely.",
      realWorldUse: "Retailers run massive databases to track item counts, trace transaction records, reward loyal shoppers, audit clerk register cashflows, and run custom promotions.",
      importance: "Sales analysts use SQL to identify underperforming inventories, compute tax levels, run holiday promotions, and trace user profiles.",
      tables: [
        {
          name: "customers",
          description: "Contains shopper files, membership details, and location identifiers.",
          columns: [
            { name: "customer_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique loyalty profile ID" },
            { name: "name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Customer full name" },
            { name: "age", type: "INT", constraints: "CHECK (age >= 12)", description: " shopper age" },
            { name: "city", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Primary shopping city" },
            { name: "membership_level", type: "VARCHAR(15)", constraints: "CHECK (membership_level IN ('Bronze', 'Silver', 'Gold', 'Platinum'))", description: "Tier level" },
            { name: "join_date", type: "DATE", constraints: "NOT NULL", description: "Joined the program" }
          ],
          generateRows: () => {
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                customer_id: 100 + i,
                name: generateName(i),
                age: 18 + (i * 3) % 45,
                city: cities[i % cities.length],
                membership_level: i % 4 === 0 ? "Platinum" : i % 3 === 0 ? "Gold" : i % 2 === 0 ? "Silver" : "Bronze",
                join_date: `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i * 5) % 28 + 1).padStart(2, "0")}`
              });
            }
            return rows;
          }
        },
        {
          name: "products",
          description: "Inventory details, classifications, and vendor information.",
          columns: [
            { name: "product_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique SKU product identifier" },
            { name: "name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Commercial product name" },
            { name: "category", type: "VARCHAR(30)", constraints: "NOT NULL", description: "Item department classification" },
            { name: "price", type: "DECIMAL(8,2)", constraints: "CHECK (price > 0)", description: "Retail unit price" },
            { name: "stock_quantity", type: "INT", constraints: "CHECK (stock_quantity >= 0)", description: "Units in warehouse" },
            { name: "supplier_id", type: "INT", constraints: "NOT NULL", description: "Reference value for distributor" }
          ],
          generateRows: () => {
            const productNames = ["Smart TV", "Laptop Shield", "Cozy Sofa", "LED Desk Lamp", "Wireless Mouse", "Noise-Cancelling Headphones", "Stainless Water Bottle", "Organic Coffee Beans", "Leather Wallet", "Running Sneakers", "Yoga Mat", "Chef Cookbook", "Blender 9000", "Ceramic Dinner Set", "Smart Watch Tracker"];
            const cats = ["Electronics", "Electronics", "Furniture", "Office Supply", "Electronics", "Electronics", "Accessories", "Food", "Accessories", "Sports", "Sports", "Books", "Kitchen", "Kitchen", "Electronics"];
            const rows = [];
            for (let i = 1; i <= 15; i++) {
              rows.push({
                product_id: 200 + i,
                name: productNames[i - 1],
                category: cats[i - 1],
                price: 15.00 + (i * 123) % 350,
                stock_quantity: 5 + (i * 17) % 120,
                supplier_id: 500 + (i % 3) + 1
              });
            }
            return rows;
          }
        },
        {
          name: "orders",
          description: "Sale records mapping consumer behavior and overall revenue stats.",
          columns: [
            { name: "order_id", type: "INT", constraints: "PRIMARY KEY", description: "Receipt order index" },
            { name: "customer_id", type: "INT", constraints: "NOT NULL", description: "Associated shopper" },
            { name: "order_date", type: "DATE", constraints: "NOT NULL", description: "Transaction timestamp" },
            { name: "total_amount", type: "DECIMAL(8,2)", constraints: "CHECK (total_amount >= 0)", description: "Total price paid" },
            { name: "status", type: "VARCHAR(20)", constraints: "CHECK (status IN ('Shipped', 'Pending', 'Cancelled', 'Returned'))", description: "Fulfilment phase" }
          ],
          generateRows: () => {
            const statuses = ["Shipped", "Pending", "Cancelled", "Returned"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                order_id: 3000 + i,
                customer_id: 100 + ((i * 7) % 20) + 1,
                order_date: `2026-${String((i % 4) + 1).padStart(2, "0")}-${String((i * 4) % 28 + 1).padStart(2, "0")}`,
                total_amount: 25.50 + (i * 87) % 400,
                status: statuses[i % statuses.length]
              });
            }
            return rows;
          }
        }
      ]
    },
    {
      id: "banking",
      name: "Banking",
      icon: "DollarSign",
      businessScenario: "Manage accounts, branches, and high-frequency financial ledgers for 'SafeReserve Bank'. Screen transactions for potential money-laundering risks or poor credit score holders.",
      realWorldUse: "Financial systems require transactional integrity. Databases process atomic ledgers, check credit balance overdrafts, flag instant debit fraud, and monitor ATM deposits.",
      importance: "Compliance audits rely on SQL statement logs to audit wire transactions, summarize ledger reports, calculate savings interests, and report risky activities.",
      tables: [
        {
          name: "customers",
          description: "Personal credentials and credit rating scores of checking account holders.",
          columns: [
            { name: "customer_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique bank account owner record" },
            { name: "name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Client full legal name" },
            { name: "age", type: "INT", constraints: "CHECK (age >= 18)", description: "Verified legal age" },
            { name: "city", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Branch residence city" },
            { name: "credit_score", type: "INT", constraints: "CHECK (credit_score BETWEEN 300 AND 850)", description: "FICO credit evaluation score" },
            { name: "occupation", type: "VARCHAR(40)", constraints: "NOT NULL", description: "Stated line of employment" }
          ],
          generateRows: () => {
            const occupations = ["Software Engineer", "Teacher", "Doctor", "Retail Manager", "Freelancer", "Consultant", "Nurse", "Chef", "Accountant", "Retired"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                customer_id: 500 + i,
                name: generateName(i),
                age: 21 + (i * 4) % 55,
                city: cities[i % cities.length],
                credit_score: 550 + (i * 17) % 290,
                occupation: occupations[i % occupations.length]
              });
            }
            return rows;
          }
        },
        {
          name: "accounts",
          description: "Subscribed checking, savings, or investment accounts with ledger values.",
          columns: [
            { name: "account_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique account reference mapping" },
            { name: "customer_id", type: "INT", constraints: "NOT NULL", description: "Reference pointer to client profiles" },
            { name: "account_type", type: "VARCHAR(20)", constraints: "CHECK (account_type IN ('Savings', 'Checking', 'Fixed Deposit'))", description: "Asset tier type" },
            { name: "balance", type: "DECIMAL(12,2)", constraints: "NOT NULL", description: "Direct credit balance standing" },
            { name: "status", type: "VARCHAR(15)", constraints: "CHECK (status IN ('Active', 'Suspended', 'Closed'))", description: "Operational capability status" },
            { name: "open_date", type: "DATE", constraints: "NOT NULL", description: "Establishment timestamp date" }
          ],
          generateRows: () => {
            const types = ["Savings", "Checking", "Fixed Deposit"];
            const states = ["Active", "Suspended", "Closed"];
            const rows = [];
            for (let i = 1; i <= 15; i++) {
              rows.push({
                account_id: 1000 + i,
                customer_id: 500 + i,
                account_type: types[i % types.length],
                balance: 500.00 + (i * 1872) % 45000,
                status: i === 12 ? "Suspended" : i === 15 ? "Closed" : "Active",
                open_date: `2024-${String((i % 12) + 1).padStart(2, "0")}-${String((i * 7) % 28 + 1).padStart(2, "0")}`
              });
            }
            return rows;
          }
        },
        {
          name: "transactions",
          description: "Financial event streams recording all physical transfers.",
          columns: [
            { name: "transaction_id", type: "INT", constraints: "PRIMARY KEY", description: "Audit trail transaction ID" },
            { name: "account_id", type: "INT", constraints: "NOT NULL", description: "Source bank bank account" },
            { name: "transaction_date", type: "DATE", constraints: "NOT NULL", description: "Posted execution timeline" },
            { name: "amount", type: "DECIMAL(10,2)", constraints: "CHECK (amount > 0)", description: "Absolute financial amount" },
            { name: "transaction_type", type: "VARCHAR(15)", constraints: "CHECK (transaction_type IN ('Deposit', 'Withdrawal', 'Fee', 'Transfer'))", description: "Ledger transaction type classification" },
            { name: "channel", type: "VARCHAR(15)", constraints: "CHECK (channel IN ('ATM', 'Online', 'In-Branch', 'Mobile'))", description: "Direct execution origin" }
          ],
          generateRows: () => {
            const trxTypes = ["Deposit", "Withdrawal", "Transfer", "Fee"];
            const channels = ["ATM", "Online", "In-Branch", "Mobile"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                transaction_id: 8000 + i,
                account_id: 1000 + ((i % 15) + 1),
                transaction_date: `2026-04-${String((i * 4) % 28 + 1).padStart(2, "0")}`,
                amount: 10.00 + (i * 219) % 2500,
                transaction_type: trxTypes[i % trxTypes.length],
                channel: channels[i % channels.length]
              });
            }
            return rows;
          }
        }
      ]
    },
    {
      id: "education",
      name: "Education",
      icon: "GraduationCap",
      businessScenario: "Manage rosters and grades for 'Excel Academic Institute'. Calculate averages for honors list selection, and screen fees of registered learners.",
      realWorldUse: "Academic administrators rely on relational files to enroll learners, store class grades, balance scholarship ledgers, and index faculty research budgets.",
      importance: "Registrars use database SQL queries daily to find course attendance levels, verify grade requirements, and generate transcripts.",
      tables: [
        {
          name: "students",
          description: "Biographical portfolios and academic status of registered students.",
          columns: [
            { name: "student_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique campus student number" },
            { name: "name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Student full name" },
            { name: "age", type: "INT", constraints: "CHECK (age >= 16)", description: "Registered age" },
            { name: "gender", type: "VARCHAR(10)", constraints: "NOT NULL", description: "Stated gender identity" },
            { name: "city", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Dorm or hometown residence" },
            { name: "enrollment_year", type: "INT", constraints: "CHECK (enrollment_year >= 2020)", description: "Starting academic year" },
            { name: "GPA", type: "DECIMAL(3,2)", constraints: "CHECK (GPA BETWEEN 0.0 AND 4.0)", description: "Standing Grade Point Average" }
          ],
          generateRows: () => {
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                student_id: 202600 + i,
                name: generateName(i),
                age: 18 + i % 6,
                gender: i % 2 === 0 ? "Female" : "Male",
                city: cities[i % cities.length],
                enrollment_year: 2022 + i % 4,
                GPA: parseFloat((2.0 + (i * 7) % 21 / 10).toFixed(2))
              });
            }
            return rows;
          }
        },
        {
          name: "courses",
          description: "Curriculum code specifications, unit weights, and budget tiers.",
          columns: [
            { name: "course_id", type: "INT", constraints: "PRIMARY KEY", description: "Course identification number" },
            { name: "code", type: "VARCHAR(10)", constraints: "UNIQUE", description: "Syllabus department abbreviation code" },
            { name: "title", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Offered course class title" },
            { name: "credits", type: "INT", constraints: "CHECK (credits BETWEEN 1 AND 5)", description: "Academic unit weight" },
            { name: "department", type: "VARCHAR(30)", constraints: "NOT NULL", description: "Overseeing faculty team department" },
            { name: "fee", type: "DECIMAL(6,2)", constraints: "NOT NULL", description: "Direct tuition charge fee" }
          ],
          generateRows: () => {
            const titles = ["Intro to SQL", "Modern Physics", "Macroeconomics", "Organic Chemistry", "Data Algorithms", "Calculus II", "Global History", "Cognitive Psychology", "Creative Writing", "Corporate Finance"];
            const codes = ["CS101", "PHY201", "ECO102", "CHM301", "CS202", "MTH202", "HIS110", "PSY150", "ENG220", "FIN350"];
            const depts = ["Computer Science", "Physics", "Economics", "Chemistry", "Computer Science", "Mathematics", "History", "Psychology", "English", "Finance"];
            const rows = [];
            for (let i = 1; i <= 10; i++) {
              rows.push({
                course_id: 400 + i,
                code: codes[i - 1],
                title: titles[i - 1],
                credits: i % 3 === 0 ? 4 : 3,
                department: depts[i - 1],
                fee: 300.00 + (i * 95) % 800
              });
            }
            return rows;
          }
        },
        {
          name: "enrollments",
          description: "Syllabus registration state tracking grade assessments.",
          columns: [
            { name: "enrollment_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique enrolment key ledger" },
            { name: "student_id", type: "INT", constraints: "NOT NULL", description: "Associated campus student" },
            { name: "course_id", type: "INT", constraints: "NOT NULL", description: "Target class database listing" },
            { name: "enrollment_date", type: "DATE", constraints: "NOT NULL", description: "Enrolled date" },
            { name: "grade_point", type: "DECIMAL(3,1)", constraints: "CHECK (grade_point BETWEEN 0.0 AND 4.0)", description: "Exam result achieved" },
            { name: "status", type: "VARCHAR(20)", constraints: "CHECK (status IN ('Active', 'Dropped', 'Completed'))", description: "Registration outcome status" }
          ],
          generateRows: () => {
            const statuses = ["Completed", "Active", "Dropped"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                enrollment_id: 9000 + i,
                student_id: 202600 + ((i * 3) % 20 + 1),
                course_id: 400 + ((i % 10) + 1),
                enrollment_date: `2025-09-${String((i * 4) % 28 + 1).padStart(2, "0")}`,
                grade_point: parseFloat((1.5 + (i * 9) % 26 / 10).toFixed(1)),
                status: statuses[i % statuses.length]
              });
            }
            return rows;
          }
        }
      ]
    },
    {
      id: "ecommerce",
      name: "E-Commerce",
      icon: "Globe",
      businessScenario: "Analyze online performance metrics for 'OmniShop E-Store'. Monitor transaction order checkout cycles, stock levels, and shipment handling fees.",
      realWorldUse: "E-Commerce hubs run distributed databases tracing users, tracking shipment milestones, storing catalog items, and logging coupon uses.",
      importance: "Logistics coordinators and marketing executives execute queries daily to check cart conversions, discover transit times, and trace buyer categories.",
      tables: [
        {
          name: "users",
          description: "Shopper profiles, login catalogs, and geographical locations.",
          columns: [
            { name: "user_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique portal account customer ID" },
            { name: "username", type: "VARCHAR(30)", constraints: "UNIQUE NOT NULL", description: "Verified handle nickname" },
            { name: "email", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Primary communication inbox" },
            { name: "city", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Delivery shipping city location" },
            { name: "registration_date", type: "DATE", constraints: "NOT NULL", description: "Account establishment date" },
            { name: "preferred_category", type: "VARCHAR(25)", constraints: "NOT NULL", description: "Catalog preference priority" }
          ],
          generateRows: () => {
            const categories = ["Home", "Apparel", "Electronics", "Fitness", "Books"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                user_id: 700 + i,
                username: `user_${firstNames[i % firstNames.length].toLowerCase()}${i}`,
                email: `${firstNames[i % firstNames.length].toLowerCase()}@example.com`,
                city: cities[i % cities.length],
                registration_date: `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i * 11) % 28 + 1).padStart(2, "0")}`,
                preferred_category: categories[i % categories.length]
              });
            }
            return rows;
          }
        },
        {
          name: "inventory",
          description: "Commercial items stock level logs and rating metrics.",
          columns: [
            { name: "item_id", type: "INT", constraints: "PRIMARY KEY", description: "Physical warehouse item index" },
            { name: "product_name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Listing display product name" },
            { name: "category", type: "VARCHAR(25)", constraints: "NOT NULL", description: "Catalog hierarchy classification" },
            { name: "price", type: "DECIMAL(8,2)", constraints: "NOT NULL", description: "Stated unit price" },
            { name: "stock_count", type: "INT", constraints: "CHECK (stock_count >= 0)", description: "Quantity physically on shelves" },
            { name: "rating", type: "DECIMAL(2,1)", constraints: "CHECK (rating BETWEEN 1.0 AND 5.0)", description: " shopper rating" }
          ],
          generateRows: () => {
            const items = ["Fitted Tee", "Fleece Blanket", "Desk Organizer", "Insulated Mug", "E-Reader Shell", "Jump Rope", "Aroma Diffuser", "Desk Chair Cushion", "Waffle Maker", "Power Bank Pro", "Bamboo Towel", "Retro Keyboard", "Spillproof Laptop Deck", "Dough Cookboard", "Smart Plug Suite"];
            const cats = ["Apparel", "Home", "Office", "Home", "Electronics", "Fitness", "Home", "Office", "Kitchen", "Electronics", "Home", "Electronics", "Electronics", "Kitchen", "Electronics"];
            const rows = [];
            for (let i = 1; i <= 15; i++) {
              rows.push({
                item_id: 900 + i,
                product_name: items[i - 1],
                category: cats[i - 1],
                price: 10.00 + (i * 153) % 250,
                stock_count: 10 + (i * 29) % 300,
                rating: parseFloat((3.5 + (i * 3) % 15 / 10).toFixed(1))
              });
            }
            return rows;
          }
        },
        {
          name: "shipments",
          description: "State records of delivery operations logistics trackers.",
          columns: [
            { name: "shipment_id", type: "INT", constraints: "PRIMARY KEY", description: "Logistics tracking index code" },
            { name: "user_id", type: "INT", constraints: "NOT NULL", description: "Recipient account customer ID" },
            { name: "order_date", type: "DATE", constraints: "NOT NULL", description: "Purchase completion date" },
            { name: "status", type: "VARCHAR(20)", constraints: "NOT NULL", description: "Milestone status of package package" },
            { name: "shipment_fee", type: "DECIMAL(5,2)", constraints: "NOT NULL", description: "Packaging and shipping fee" },
            { name: "weight_kg", type: "DECIMAL(6,2)", constraints: "NOT NULL", description: "Package measured mass index value" }
          ],
          generateRows: () => {
            const statuses = ["Delivered", "In-Transit", "Delayed", "Returned"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                shipment_id: 1200 + i,
                user_id: 700 + ((i * 13) % 20 + 1),
                order_date: `2026-05-${String((i * 4) % 28 + 1).padStart(2, "0")}`,
                status: statuses[i % statuses.length],
                shipment_fee: 5.00 + (i * 3) % 35,
                weight_kg: parseFloat((0.5 + (i * 17) % 25).toFixed(2))
              });
            }
            return rows;
          }
        }
      ]
    },
    {
      id: "hospitality",
      name: "Hospitality",
      icon: "Bed",
      businessScenario: "Optimize rooms, bookings, and guests records for 'Grand Horizon Resort'. Examine floor pricing strategies and check-out ledger statistics.",
      realWorldUse: "Relational tools power front desk portals, ensuring rooms are booked, guests pay matching night rates, and amenities are logged.",
      importance: "Resort operational managers utilize SQL queries to check average rate yields, calculate occupancy loads, and schedule cleanings.",
      tables: [
        {
          name: "guests",
          description: "Shopper roster and resort status mapping guest characteristics.",
          columns: [
            { name: "guest_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique guest ledger directory ID" },
            { name: "name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Guest full name" },
            { name: "age", type: "INT", constraints: "CHECK (age >= 18)", description: "Registered legal guardian age" },
            { name: "country", type: "VARCHAR(30)", constraints: "NOT NULL", description: "Guest nationality country code" },
            { name: "loyalty_tier", type: "VARCHAR(15)", constraints: "CHECK (loyalty_tier IN ('Regular', 'Silver', 'Gold', 'VIP'))", description: "Loyalty club subscription status level" },
            { name: "checkout_status", type: "VARCHAR(15)", constraints: "NOT NULL", description: "Outpatient check-out condition value" }
          ],
          generateRows: () => {
            const nations = ["USA", "Canada", "UK", "Germany", "Australia", "Japan", "France", "Brazil"];
            const tiers = ["Regular", "Silver", "Gold", "VIP"];
            const co = ["Checked-Out", "Occupied", "Pending"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                guest_id: 1100 + i,
                name: generateName(i),
                age: 21 + (i * 7) % 60,
                country: nations[i % nations.length],
                loyalty_tier: i % 5 === 0 ? "VIP" : i % 3 === 0 ? "Gold" : i % 2 === 0 ? "Silver" : "Regular",
                checkout_status: co[i % co.length]
              });
            }
            return rows;
          }
        },
        {
          name: "rooms",
          description: "Physical room capacity properties and pricing catalogs.",
          columns: [
            { name: "room_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique bedroom tracker key" },
            { name: "room_number", type: "VARCHAR(10)", constraints: "UNIQUE", description: "Physical architectural room number code" },
            { name: "type", type: "VARCHAR(20)", constraints: "NOT NULL", description: "Room class tier standard" },
            { name: "price_per_night", type: "DECIMAL(7,2)", constraints: "NOT NULL", description: "Overnight flat stay price" },
            { name: "floor", type: "INT", constraints: "CHECK (floor BETWEEN 1 AND 25)", description: "Highrise building level location" },
            { name: "is_occupied", type: "INT", constraints: "CHECK (is_occupied IN (0, 1))", description: "Binary occupancy marker" }
          ],
          generateRows: () => {
            const types = ["Single", "Double", "Suite", "Penthouse"];
            const prices = [120.00, 180.00, 350.00, 850.00];
            const rows = [];
            for (let i = 1; i <= 15; i++) {
              const typeIdx = i % types.length;
              rows.push({
                room_id: 300 + i,
                room_number: `${100 * (1 + i % 5) + i}`,
                type: types[typeIdx],
                price_per_night: prices[typeIdx],
                floor: 1 + i % 5,
                is_occupied: i % 2 === 0 ? 1 : 0
              });
            }
            return rows;
          }
        },
        {
          name: "bookings",
          description: "Stay transactions logs correlating room usage with checkout charges.",
          columns: [
            { name: "booking_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique stay booking index" },
            { name: "guest_id", type: "INT", constraints: "NOT NULL", description: "Booker guest catalog pointer" },
            { name: "room_id", type: "INT", constraints: "NOT NULL", description: "Target bedroom asset ID" },
            { name: "checkin_date", type: "DATE", constraints: "NOT NULL", description: "Registration entry date" },
            { name: "total_nights", type: "INT", constraints: "CHECK (total_nights > 0)", description: "Stay duration tracking integer" },
            { name: "bill_amount", type: "DECIMAL(8,2)", constraints: "NOT NULL", description: "Total checkout charge" }
          ],
          generateRows: () => {
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              const nights = 1 + (i * 5) % 9;
              rows.push({
                booking_id: 2200 + i,
                guest_id: 1100 + ((i * 11) % 20 + 1),
                room_id: 300 + ((i % 15) + 1),
                checkin_date: `2026-05-${String((i * 4) % 28 + 1).padStart(2, "0")}`,
                total_nights: nights,
                bill_amount: 150.00 + (nights * 120.00) + (i * 12) % 300
              });
            }
            return rows;
          }
        }
      ]
    },
    {
      id: "logistics",
      name: "Logistics",
      icon: "Truck",
      businessScenario: "Manage freight carriers, dispatch workers, and cargo streams for 'Apex Express Shipping'. Trace diesel efficiency and route expense metrics.",
      realWorldUse: "Fleet systems coordinate heavy freight transport. Query scripts allow dispatchers to track load caps, schedule maintenance intervals, and balance drivers.",
      importance: "Dispatchers run analytical scripts daily to map payload thresholds, verify carrier compliance, and summarize regional cargo routes.",
      tables: [
        {
          name: "vehicles",
          description: "Commercial delivery vehicles and capacity specs.",
          columns: [
            { name: "vehicle_id", type: "INT", constraints: "PRIMARY KEY", description: "Fleet carrier asset key" },
            { name: "plate_number", type: "VARCHAR(15)", constraints: "UNIQUE", description: "Government licensed license plate number" },
            { name: "capacity_tons", type: "DECIMAL(4,1)", constraints: "CHECK (capacity_tons > 0)", description: "Max payload weight restriction" },
            { name: "status", type: "VARCHAR(20)", constraints: "NOT NULL", description: "Yard operational state status" },
            { name: "fuel_efficiency", type: "DECIMAL(4,1)", description: "Kilometers covered per liter of fuel" },
            { name: "purchase_year", type: "INT", description: "Year vehicle was bought" }
          ],
          generateRows: () => {
            const states = ["Active", "Maintenance", "Standby"];
            const rows = [];
            for (let i = 1; i <= 15; i++) {
              rows.push({
                vehicle_id: 400 + i,
                plate_number: `TX-${4000 + i}-HD`,
                capacity_tons: parseFloat((2.5 + (i * 3) % 15).toFixed(1)),
                status: states[i % states.length],
                fuel_efficiency: parseFloat((5.5 + i % 6).toFixed(1)),
                purchase_year: 2018 + i % 8
              });
            }
            return rows;
          }
        },
        {
          name: "drivers",
          description: "Registered transport dispatch practitioners.",
          columns: [
            { name: "driver_id", type: "INT", constraints: "PRIMARY KEY", description: "Professional operator identification ID" },
            { name: "name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Full legal driver name" },
            { name: "license_class", type: "VARCHAR(5)", constraints: "NOT NULL", description: "CDL driver license categorization class classification" },
            { name: "experience_years", type: "INT", constraints: "CHECK (experience_years >= 0)", description: "Total driving tenure in years" },
            { name: "phone", type: "VARCHAR(15)", description: "Contact number record" },
            { name: "rating", type: "DECIMAL(2,1)", constraints: "CHECK (rating BETWEEN 1.0 AND 5.0)", description: "Dispatch evaluator rank score" }
          ],
          generateRows: () => {
            const licenses = ["Class A", "Class B", "Class C"];
            const rows = [];
            for (let i = 1; i <= 15; i++) {
              rows.push({
                driver_id: 800 + i,
                name: generateName(i),
                license_class: licenses[i % licenses.length],
                experience_years: 1 + (i * 5) % 16,
                phone: `555-010${i}`,
                rating: parseFloat((4.0 + (i * 1) % 10 / 10).toFixed(1))
              });
            }
            return rows;
          }
        },
        {
          name: "shipments",
          description: "National state package transfers registering costs and origin points.",
          columns: [
            { name: "shipment_id", type: "INT", constraints: "PRIMARY KEY", description: "Audit logistics shipment ID record" },
            { name: "driver_id", type: "INT", constraints: "NOT NULL", description: "Assigned route operator carrier ID" },
            { name: "origin_city", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Dispatch terminal loading point" },
            { name: "destination_city", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Recipient delivery terminal point" },
            { name: "weight_kg", type: "DECIMAL(8,2)", constraints: "NOT NULL", description: "Total freight measured mass weight" },
            { name: "shipping_cost", type: "DECIMAL(8,2)", constraints: "NOT NULL", description: "Dispatch billed routing cost" },
            { name: "status", type: "VARCHAR(20)", constraints: "NOT NULL", description: "Milestone routing position status" }
          ],
          generateRows: () => {
            const statuses = ["Delivered", "Dispatched", "Exceptions", "Stalled"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                shipment_id: 15000 + i,
                driver_id: 800 + ((i % 15) + 1),
                origin_city: cities[i % cities.length],
                destination_city: cities[(i + 4) % cities.length],
                weight_kg: 50.00 + (i * 350) % 5000,
                shipping_cost: 120.00 + (i * 129) % 2500,
                status: statuses[i % statuses.length]
              });
            }
            return rows;
          }
        }
      ]
    },
    {
      id: "insurance",
      name: "Insurance",
      icon: "ShieldAlert",
      businessScenario: "Process risk plans, policies, and heavy client claims records for 'Apex Mutual Group'. Screen claimants reporting massive billing limits.",
      realWorldUse: "Insurance claims processing uses tables to catalog active covers, run risk ratings, crosscheck claim ratios, and distribute broker fees.",
      importance: "Underwriters and pricing risk managers utilize databases to query monthly premium sums, monitor liability bounds, and check payout trends.",
      tables: [
        {
          name: "clients",
          description: "Policyholder profiles, and verified habits catalog.",
          columns: [
            { name: "client_id", type: "INT", constraints: "PRIMARY KEY", description: "Client directory identifier" },
            { name: "name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Full legal client name" },
            { name: "age", type: "INT", constraints: "CHECK (age >= 18)", description: "Registered legal policyholder age" },
            { name: "city", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Residence city location" },
            { name: "occupation", type: "VARCHAR(40)", constraints: "NOT NULL", description: "Primary employment categorization" },
            { name: "smoke_status", type: "VARCHAR(5)", constraints: "CHECK (smoke_status IN ('Yes', 'No'))", description: "Stated smoker categorization" }
          ],
          generateRows: () => {
            const jobs = ["Factory Worker", "Retail Desk", "Office Analyst", "Builder", "Tech Director", "Pilot", "Artist", "Doctor", "Logistics Sorter", "Student"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                client_id: 1300 + i,
                name: generateName(i),
                age: 20 + (i * 3) % 55,
                city: cities[i % cities.length],
                occupation: jobs[i % jobs.length],
                smoke_status: i % 4 === 1 ? "Yes" : "No"
              });
            }
            return rows;
          }
        },
        {
          name: "policies",
          description: "Subscribed hazard coverage plan characteristics and premiums standard.",
          columns: [
            { name: "policy_id", type: "INT", constraints: "PRIMARY KEY", description: "Hazard policy ledger reference number" },
            { name: "client_id", type: "INT", constraints: "NOT NULL", description: "Pointer mapping to primary client file catalog" },
            { name: "type", type: "VARCHAR(25)", constraints: "CHECK (type IN ('Life', 'Health', 'Auto', 'Home'))", description: "Product catalog plan coverage category" },
            { name: "annual_premium", type: "DECIMAL(8,2)", constraints: "CHECK (annual_premium > 0)", description: "Assessed annualized cover payment premium" },
            { name: "coverage_limit", type: "DECIMAL(10,2)", constraints: "CHECK (coverage_limit > 0)", description: "Premium liability threshold limit claim cap" },
            { name: "status", type: "VARCHAR(15)", constraints: "NOT NULL", description: "Active standing indicator status" }
          ],
          generateRows: () => {
            const types = ["Life", "Health", "Auto", "Home"];
            const prems = [1200.00, 2400.00, 850.00, 1500.00];
            const caps = [500000.00, 100000.00, 50000.00, 250000.00];
            const rows = [];
            for (let i = 1; i <= 15; i++) {
              const tIdx = i % types.length;
              rows.push({
                policy_id: 4000 + i,
                client_id: 1300 + i,
                type: types[tIdx],
                annual_premium: prems[tIdx] + (i * 87) % 500,
                coverage_limit: caps[tIdx],
                status: i === 11 ? "Suspended" : i === 14 ? "Expired" : "Active"
              });
            }
            return rows;
          }
        },
        {
          name: "claims",
          description: "Registered loss declarations, filing times, and payout logs.",
          columns: [
            { name: "claim_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique claim tracker key ID" },
            { name: "policy_id", type: "INT", constraints: "NOT NULL", description: "Linked coverage plan number" },
            { name: "date_filed", type: "DATE", constraints: "NOT NULL", description: "First notice of loss filed timeline" },
            { name: "claim_amount", type: "DECIMAL(10,2)", constraints: "CHECK (claim_amount >= 0)", description: "Demanded payout financial amount scale" },
            { name: "status", type: "VARCHAR(15)", constraints: "CHECK (status IN ('Approved', 'Adjudicating', 'Declined'))", description: "Case review outcome phase" },
            { name: "approval_date", type: "DATE", description: "Priced settlement validation date" }
          ],
          generateRows: () => {
            const states = ["Approved", "Adjudicating", "Declined"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                claim_id: 77000 + i,
                policy_id: 4000 + ((i % 15) + 1),
                date_filed: `2026-03-${String((i * 4) % 28 + 1).padStart(2, "0")}`,
                claim_amount: 500.00 + (i * 2490) % 20000,
                status: states[i % states.length],
                approval_date: i % 3 === 0 ? `2026-04-${String((i * 4) % 28 + 1).padStart(2, "0")}` : null
              });
            }
            return rows;
          }
        }
      ]
    },
    {
      id: "telecom",
      name: "Telecommunications",
      icon: "PhoneCall",
      businessScenario: "Manage network subscriptions, carrier billing, and data logs for 'Apex Telco Network'. Verify network support metrics and subscribers on high usage bundles.",
      realWorldUse: "Carrier systems require high throughput tracking. Databases trace cellular logs, manage subscriber checkouts, process monthly invoice balances, and route call streams.",
      importance: "Network operations center engineers run analytical statements daily to check base station loading, count sms quotas, and check network drop errors.",
      tables: [
        {
          name: "subscribers",
          description: "Subscriber accounts, demographics, and subscribed plans list.",
          columns: [
            { name: "subscriber_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique phone/sim owner carrier index" },
            { name: "name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Subscriber full name" },
            { name: "age", type: "INT", constraints: "CHECK (age >= 18)", description: "Registered legal subscriber age" },
            { name: "plan_type", type: "VARCHAR(15)", constraints: "CHECK (plan_type IN ('Prepaid', 'Postpaid', 'Enterprise'))", description: "Product plan category tier standard" },
            { name: "state", type: "VARCHAR(5)", constraints: "NOT NULL", description: "State location indicator code key" },
            { name: "join_date", type: "DATE", constraints: "NOT NULL", description: "First SIM activation timeline" }
          ],
          generateRows: () => {
            const plans = ["Prepaid", "Postpaid", "Enterprise"];
            const statesList = ["NY", "CA", "TX", "MA", "IL", "FL", "WA", "GA"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                subscriber_id: 1400 + i,
                name: generateName(i),
                age: 18 + (i * 7) % 63,
                plan_type: plans[i % plans.length],
                state: statesList[i % statesList.length],
                join_date: `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i * 5) % 28 + 1).padStart(2, "0")}`
              });
            }
            return rows;
          }
        },
        {
          name: "usage_logs",
          description: "Granular network usage history tracks data bundles.",
          columns: [
            { name: "log_id", type: "INT", constraints: "PRIMARY KEY", description: "Usage audit log unique trace ID" },
            { name: "subscriber_id", type: "INT", constraints: "NOT NULL", description: "SIM card subscriber mapping ID" },
            { name: "gigabytes_used", type: "DECIMAL(6,2)", description: "Total cellular network data consumed" },
            { name: "minutes_called", type: "INT", description: "Total circuit-switch voice minutes used" },
            { name: "sms_sent", type: "INT", description: "Count of basic alphanumeric SMS sent" },
            { name: "charge_amount", type: "DECIMAL(5,2)", description: "Computed excess usage charges" }
          ],
          generateRows: () => {
            const rows = [];
            for (let i = 1; i <= 15; i++) {
              rows.push({
                log_id: 99000 + i,
                subscriber_id: 1400 + i,
                gigabytes_used: parseFloat((1.5 + (i * 47) % 150).toFixed(2)),
                minutes_called: 10 + (i * 183) % 1400,
                sms_sent: i * 19 % 400,
                charge_amount: parseFloat((i * 3 % 45).toFixed(2))
              });
            }
            return rows;
          }
        },
        {
          name: "support_tickets",
          description: "Technical network outages support requests logged.",
          columns: [
            { name: "ticket_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique service ticket number index" },
            { name: "subscriber_id", type: "INT", constraints: "NOT NULL", description: "Caller account customer ID pointer" },
            { name: "category", type: "VARCHAR(25)", constraints: "NOT NULL", description: "Support request topic category" },
            { name: "date_opened", type: "DATE", constraints: "NOT NULL", description: "Registration entry timeline date" },
            { name: "status", type: "VARCHAR(15)", constraints: "CHECK (status IN ('Open', 'In-Progress', 'Closed'))", description: "Ticket solution tracker status" },
            { name: "resolution_hours", type: "INT", description: "Hours expended to close ticket" }
          ],
          generateRows: () => {
            const categories = ["Network Drop", "Billing Dispute", "SIM Activation", "Device Binding", "Roaming Issue"];
            const states = ["Closed", "Open", "In-Progress"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                ticket_id: 6500 + i,
                subscriber_id: 1400 + ((i * 11) % 20 + 1),
                category: categories[i % categories.length],
                date_opened: `2026-05-${String((i * 4) % 28 + 1).padStart(2, "0")}`,
                status: states[i % states.length],
                resolution_hours: i % 2 === 0 ? 1 + (i * 7) % 48 : null
              });
            }
            return rows;
          }
        }
      ]
    },
    {
      id: "hr",
      name: "Human Resources",
      icon: "Users",
      businessScenario: "Manage personnel, compensation payroll registers, and performance reviews for 'Apex Corporate Solutions'. Analyze tenure stats and organizational ratings.",
      realWorldUse: "HR managers use personnel grids to catalog salaries, trace hires, maintain compliance records, scale bonuses, and manage departmental heads.",
      importance: "HR systems analyst experts review payroll aggregates, track monthly worker retention metrics, and analyze salary fairness metrics using SQL.",
      tables: [
        {
          name: "employees",
          description: "Official career registry portfolios of contracted workers.",
          columns: [
            { name: "employee_id", type: "INT", constraints: "PRIMARY KEY", description: "Staff directory ID record" },
            { name: "name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Worker full legal name" },
            { name: "age", type: "INT", constraints: "CHECK (age >= 18)", description: "Registered legal age" },
            { name: "gender", type: "VARCHAR(10)", constraints: "NOT NULL", description: "Stated gender identity" },
            { name: "position", type: "VARCHAR(40)", constraints: "NOT NULL", description: "Commercial professional job role" },
            { name: "department", type: "VARCHAR(30)", constraints: "NOT NULL", description: "Stated work team department" },
            { name: "hire_date", type: "DATE", constraints: "NOT NULL", description: "First service orientation date" }
          ],
          generateRows: () => {
            const roles = ["Software Engineer", "HR Specialist", "DevOps Engineer", "Marketing Associate", "Sales Executive", "Visual Designer", "Financial Auditor", "Product Manager", "Support Lead", "Data Scientist"];
            const depts = ["Engineering", "Human Resources", "Engineering", "Marketing", "Sales", "Design", "Finance", "Product", "Support", "Engineering"];
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                employee_id: 1800 + i,
                name: generateName(i),
                age: 22 + (i * 3) % 40,
                gender: i % 2 === 0 ? "Female" : "Male",
                position: roles[i % roles.length],
                department: depts[i % depts.length],
                hire_date: `2021-${String((i % 12) + 1).padStart(2, "0")}-${String((i * 4) % 28 + 1).padStart(2, "0")}`
              });
            }
            return rows;
          }
        },
        {
          name: "salaries",
          description: "Confidential payroll compensation registries and scorecard evaluations.",
          columns: [
            { name: "salary_id", type: "INT", constraints: "PRIMARY KEY", description: "Payroll account voucher ID" },
            { name: "employee_id", type: "INT", constraints: "UNIQUE NOT NULL", description: "Associated target staff directory member" },
            { name: "monthly_salary", type: "DECIMAL(10,2)", constraints: "CHECK (monthly_salary > 0)", description: "Monthly base compensation" },
            { name: "bonus", type: "DECIMAL(10,2)", constraints: "CHECK (bonus >= 0)", description: "Direct performance reward bonus" },
            { name: "rating_score", type: "DECIMAL(3,1)", constraints: "CHECK (rating_score BETWEEN 1.0 AND 5.0)", description: "Self & supervisor execution score metric" },
            { name: "currency", type: "VARCHAR(5)", constraints: "DEFAULT 'USD'", description: "Payout currency denomination code" }
          ],
          generateRows: () => {
            const rows = [];
            for (let i = 1; i <= 15; i++) {
              rows.push({
                salary_id: 3300 + i,
                employee_id: 1800 + i,
                monthly_salary: 3500.00 + (i * 730) % 8500,
                bonus: i % 3 === 0 ? 500.00 + (i * 120) : 0,
                rating_score: parseFloat((3.0 + (i * 3) % 21 / 10).toFixed(1)),
                currency: "USD"
              });
            }
            return rows;
          }
        },
        {
          name: "performance",
          description: "Formal administrative reviews log and training trackers.",
          columns: [
            { name: "review_id", type: "INT", constraints: "PRIMARY KEY", description: "Unique catalog rating index" },
            { name: "employee_id", type: "INT", constraints: "NOT NULL", description: "Pointer mapping to primary employee file catalog" },
            { name: "review_year", type: "INT", constraints: "CHECK (review_year >= 2020)", description: "Fiscal year being measured" },
            { name: "score", type: "INT", constraints: "CHECK (score BETWEEN 1 AND 10)", description: "Consolidated grade point scalar score" },
            { name: "training_completed_hours", type: "INT", description: "Professional course hours logged" }
          ],
          generateRows: () => {
            const rows = [];
            for (let i = 1; i <= 20; i++) {
              rows.push({
                review_id: 7400 + i,
                employee_id: 1800 + ((i * 13) % 20 + 1),
                review_year: 2025,
                score: 5 + i % 6,
                training_completed_hours: 5 * (1 + i % 8)
              });
            }
            return rows;
          }
        }
      ]
    }
  ];

  // Compile full Data structure for each domain
  bluePrints.forEach((bp) => {
    const tables: SQLTable[] = bp.tables.map((tbl) => {
      const generatedRows = tbl.generateRows();
      
      // Build Create SQL Script string
      let createScript = `CREATE TABLE ${tbl.name} (\n`;
      tbl.columns.forEach((col, idx) => {
        const comma = idx === tbl.columns.length - 1 ? "" : ",";
        createScript += `  ${col.name} ${col.type} ${col.constraints ? col.constraints : ""}${comma} -- ${col.description}\n`;
      });
      createScript += `);`;

      // Build Insert SQL Script string
      let insertScript = `INSERT INTO ${tbl.name} (${tbl.columns.map(c => c.name).join(", ")}) VALUES\n`;
      generatedRows.forEach((row, idx) => {
        const values = tbl.columns.map(col => {
          const val = row[col.name];
          if (val === null || val === undefined) return "NULL";
          if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
          return val;
        }).join(", ");
        const comma = idx === generatedRows.length - 1 ? ";" : ",";
        insertScript += `(${values})${comma}\n`;
      });

      return {
        name: tbl.name,
        description: tbl.description,
        columns: tbl.columns,
        createScript,
        insertScript,
        rawRows: generatedRows
      };
    });

    const questions: PracticeQuestion[] = buildDynamicQuestions(bp.id, tables);

    // Mini Quiz templates
    const miniQuizBlueprints: Record<string, { question: string; options: string[]; correctIndex: number; explanation: string }[]> = {
      retail: [
        {
          question: "Which of the following describes the difference between the WHERE clause and the HAVING clause?",
          options: ["WHERE works on database schemas; HAVING targets physical records.", "WHERE filters rows before items are grouped/aggregated; HAVING filters grouped metrics completed.", "WHERE requires logical AND operators; HAVING operates with only aggregate SUM functions.", "They are entirely interchangeable in ANSI standard SQL."],
          correctIndex: 1,
          explanation: "In SQL execution priority, WHERE takes place before GROUP BY compiles, discarding unwanted entries early. HAVING applies strictly to matching categories of summarized fields."
        },
        {
          question: "How do you search for inventory products whose exact product_name ends with the case-sensitive characters 'Shield'?",
          options: ["WHERE product_name LIKE 'Shield%'", "WHERE product_name LIKE '%Shield'", "WHERE product_name = '%Shield%'", "WHERE product_name CONTAINS 'Shield'"],
          correctIndex: 1,
          explanation: "In SQL, the % character matches any sequence of letters. Placement at the start ('%Shield') checks if the column ends with 'Shield'."
        }
      ],
      banking: [
        {
          question: "If checking account balance values are mapped to NULL, which predicate is syntactically sound?",
          options: ["WHERE balance = NULL", "WHERE balance EQUALS NULL", "WHERE balance IS NULL", "WHERE ISNULL(balance, 0) == true"],
          correctIndex: 2,
          explanation: "NULL is a clinical state token representing the absolute absence of a value, not a zero or empty string. Always use 'IS NULL' or 'IS NOT NULL'."
        }
      ],
      education: [
        {
          question: "What does the query SELECT DISTINCT department FROM courses return?",
          options: ["A list of departments including duplicate lines for each course offered.", "An alphabetically ordered list of computer laboratories on campus.", "A unique list of department names, removing all duplicates.", "The course listings filtered by highest credits weight."],
          correctIndex: 2,
          explanation: "DISTINCT filters out adjacent or non-adjacent duplicate rows from the selected column list, reporting each unique value once."
        }
      ],
      ecommerce: [
        {
          question: "How does LIMIT 3 impact a query result set?",
          options: ["It lists the top three columns of the primary index schema.", "It discards the final three rows of the source tables.", "It limits the returned rows count to at most three rows.", "It compresses the byte footprint of text elements."],
          correctIndex: 2,
          explanation: "The LIMIT clause constraints the maximum results size the database engine returns, which is crucial to optimize memory on larger environments."
        }
      ],
      hospitality: [
        {
          question: "What is the consequence of executing: SELECT COUNT(loyalty_tier) FROM guests?",
          options: ["It returns the unique count of loyalty tier categories.", "It returns the count of guests with non-null values in the loyalty_tier column.", "It returns the sum of all guest ages on record.", "It registers a syntax crash on string types."],
          correctIndex: 1,
          explanation: "COUNT(column) evaluates only non-NULL occurrences inside that specific field. It excludes NULL values from the result tallies."
        }
      ],
      logistics: [
        {
          question: "Which arithmetic query is syntactically valid in standard SQL?",
          options: ["SELECT capacity_tons + fuel_efficiency FROM vehicles", "SELECT capacity_tons PLUS fuel_efficiency FROM vehicles", "SELECT SUM_ADD(capacity_tons, fuel_efficiency)", "SELECT capacity_tons & fuel_efficiency"],
          correctIndex: 0,
          explanation: "SQL fully supports arithmetic symbol operators (+, -, *, /) directly in select blocks mapping numeric column names."
        }
      ],
      insurance: [
        {
          question: "What occurs if you group claims status details but select raw client names without aggregate bounds?",
          options: ["The database resolves the match smoothly reporting first names.", "It generates a syntax engine crash representing non-grouped items.", "It creates an in-memory temporary database.", "It automatically triggers an outer join."],
          correctIndex: 1,
          explanation: "Every column stated in the SELECT list of a GROUP BY query MUST either be specified inside the GROUP BY clause or be wrapped in an aggregate function."
        }
      ],
      telecom: [
        {
          question: "Which expression yields phone subscribers with age values strictly between 20 and 40 inclusive?",
          options: ["WHERE age >= 20 OR age <= 40", "WHERE age BETWEEN 20 AND 40", "WHERE age IN (20, 30, 40)", "WHERE age > 20 AND age < 40"],
          correctIndex: 1,
          explanation: "BETWEEN is a concise operator that represents an inclusive comparison query equivalent to 'age >= 20 AND age <= 40'."
        }
      ],
      hr: [
        {
          question: "Which code correctly calculates performance averages on reviewed scoreboards?",
          options: ["SELECT AVG(score) FROM performance", "SELECT SUM(score) / COUNT(employee_id)", "Both of the above answers are functionally identical mathematical operations", "Neither, AVG only accepts float keys with decimal notation"],
          correctIndex: 2,
          explanation: "Average is calculated as sum divided by count. Standard AVG is the built-in shorthand, but both math sequences map the exact algebraic result."
        }
      ]
    };

    const miniQuiz = miniQuizBlueprints[bp.id] || [
      {
        question: `Standard SQL query categories include DDL, DML, and DQL. Which category does 'SELECT' belong to?`,
        options: ["DDL (Data Definition Language)", "DML (Data Manipulation Language)", "DQL (Data Query Language)", "TCL (Transaction Control Language)"],
        correctIndex: 2,
        explanation: "SELECT statements form Data Query Language (DQL) as their primary functional mandate is to retrieve table readings from databases."
      }
    ];

    domains.push({
      id: bp.id,
      name: bp.name,
      icon: bp.icon,
      businessScenario: bp.businessScenario,
      realWorldUse: bp.realWorldUse,
      importance: bp.importance,
      tables,
      questions,
      miniQuiz
    });
  });

  return domains;
}

// Dynamic Practice Question Builder
// For each of the nine dynamically generated domains, compile exactly 30 questions
// 20 Basic/Beginner and 10 Intermediate without Joins
function buildDynamicQuestions(domainId: string, tables: SQLTable[]): PracticeQuestion[] {
  const t1 = tables[0].name; // primary entity (e.g. customers, clients)
  const t2 = tables[1].name; // core product/account/plan
  const t3 = tables[2].name; // logistics transactions, shipments, reviews

  const domainCode = domainId.substring(0, 2).toUpperCase();

  // Primary column selectors based on domain
  const getCol = (tblIndex: number, colIndex: number): string => {
    return tables[tblIndex].columns[colIndex]?.name || "*";
  };

  const getColDesc = (tblIndex: number, colIndex: number): string => {
    return tables[tblIndex].columns[colIndex]?.description || "the field";
  };

  const q: PracticeQuestion[] = [];

  // --- 20 BEGINNER QUESTIONS ---
  q.push({
    id: `${domainCode}-B01`,
    text: `Retrieve all columns and rows from the ${t1} table.`,
    expectedQuery: `SELECT * FROM ${t1}`,
    difficulty: "Beginner",
    category: "SELECT & Filtering",
    hints: [`Use SELECT followed by * from the target table ${t1}.`],
    explanation: `This query displays the entire contents of the ${t1} table.`
  });

  q.push({
    id: `${domainCode}-B02`,
    text: `Select only the names/titles and unique descriptors from the ${t1} table.`,
    expectedQuery: `SELECT DISTINCT ${getCol(0, 1)} FROM ${t1}`,
    difficulty: "Beginner",
    category: "SELECT & Filtering",
    hints: [`Use SELECT DISTINCT with column: ${getCol(0, 1)}.`],
    explanation: `Eliminates repeating rows to report a tidy index checklist of records.`
  });

  q.push({
    id: `${domainCode}-B03`,
    text: `Display specific profiles from the ${t1} table where age is strictly greater than 30.`,
    expectedQuery: `SELECT * FROM ${t1} WHERE age > 30`,
    difficulty: "Beginner",
    category: "SELECT & Filtering",
    hints: [`The constraint column is 'age'. Add 'WHERE age > 30' at the end.`],
    explanation: `Extracts a demographic subset targeting post-junior categories.`
  });

  q.push({
    id: `${domainCode}-B04`,
    text: `Show all details from the ${t1} table where the city residency field is exactly '${cities[1]}'.`,
    expectedQuery: `SELECT * FROM ${t1} WHERE city = '${cities[1]}'`,
    difficulty: "Beginner",
    category: "SELECT & Filtering",
    hints: [`Matches string parameters. Wrap '${cities[1]}' in single straight quotes.`],
    explanation: `Addresses localized regional focus parameters inside the main index.`
  });

  q.push({
    id: `${domainCode}-B05`,
    text: `Retrieve all items from the ${t2} table, ordered by price or monthly score from highest to lowest.`,
    expectedQuery: `SELECT * FROM ${t2} ORDER BY ${getCol(1, 3)} DESC`,
    difficulty: "Beginner",
    category: "ORDER BY",
    hints: [`Sorts fields. Write ORDER BY ${getCol(1, 3)} DESC to sorting variables descending.`],
    explanation: `Assists management by sorting records based on their pricing or financial value scale.`
  });

  q.push({
    id: `${domainCode}-B06`,
    text: `Find specific rows from the ${t2} table where price or standing balance is strictly between 100 and 1500.`,
    expectedQuery: `SELECT * FROM ${t2} WHERE ${getCol(1, 3)} BETWEEN 100 AND 1500`,
    difficulty: "Beginner",
    category: "Operators",
    hints: [`Use the BETWEEN clause. Structure: ${getCol(1, 3)} BETWEEN 100 AND 1500`],
    explanation: `Assists in auditing average target brackets in operational sheets.`
  });

  q.push({
    id: `${domainCode}-B07`,
    text: `Search for names or tags in the ${t1} table that start with the letter 'J'.`,
    expectedQuery: `SELECT * FROM ${t1} WHERE ${getCol(0, 1)} LIKE 'J%'`,
    difficulty: "Beginner",
    category: "Operators",
    hints: [`The LIKE operator combined with wildcards like 'J%' is designed for start character checking.`],
    explanation: `Allows rapid queries indexing specific profiles by initial characters.`
  });

  q.push({
    id: `${domainCode}-B08`,
    text: `Show records from the ${t3} table where status is strictly 'Pending' or 'Active'.`,
    expectedQuery: `SELECT * FROM ${t3} WHERE status = 'Pending' OR status = 'Active'`,
    difficulty: "Beginner",
    category: "Logical Operators",
    hints: [`Combine conditions using OR. Make sure to repeat 'status =' in both checks.`],
    explanation: `Filters columns to isolates work tasks still requiring staff reviews.`
  });

  q.push({
    id: `${domainCode}-B09`,
    text: `List unique ${getCol(0, 3)} values available inside the ${t1} table.`,
    expectedQuery: `SELECT DISTINCT ${getCol(0, 3)} FROM ${t1}`,
    difficulty: "Beginner",
    category: "SELECT & Filtering",
    hints: [`Focus on DISTINCT on column name: ${getCol(0, 3)}`],
    explanation: `Retrieves clean rosters of unique categorization classes represented.`
  });

  q.push({
    id: `${domainCode}-B10`,
    text: `Check the ${t3} table columns and retrieve top 5 rows sorted by ID descending.`,
    expectedQuery: `SELECT * FROM ${t3} ORDER BY ${getCol(2, 0)} DESC LIMIT 5`,
    difficulty: "Beginner",
    category: "LIMIT & TOP",
    hints: [`Limit yields. Sort by ${getCol(2, 0)} DESC first, then end with LIMIT 5.`],
    explanation: `Returns quick audits profiling the most recent logs added to the registry.`
  });

  // Basic Queries B11 to B20
  for (let i = 11; i <= 20; i++) {
    const isEven = i % 2 === 0;
    const cat = isEven ? "Operators" : "Aggregate Functions";
    
    let text = "";
    let expectedQuery = "";
    let hints: string[] = [];
    let explanation = "";

    if (i === 11) {
      text = `Find any entries in the ${t1} table where the optional descriptor field columns are NOT null.`;
      expectedQuery = `SELECT * FROM ${t1} WHERE ${getCol(0, 2)} IS NOT NULL`;
      hints = [`Never use '!= NULL'. Write: WHERE ${getCol(0, 2)} IS NOT NULL.`];
      explanation = `Filters out rows that lack records in the secondary properties field.`;
    } else if (i === 12) {
      text = `Count the total number of physical entities on record in the ${t1} table.`;
      expectedQuery = `SELECT COUNT(*) FROM ${t1}`;
      hints = [`The COUNT aggregate acts with wildcard '*' inside parameters: COUNT(*).`];
      explanation = `Computes the gross volume of recorded subjects.`;
    } else if (i === 13) {
      text = `Show details from ${t2} table where category or type is either 'Savings', 'Electronics', 'Apparel' or 'Health'.`;
      expectedQuery = `SELECT * FROM ${t2} WHERE ${getCol(1, 2)} IN ('Savings', 'Electronics', 'Apparel', 'Health')`;
      hints = [`Specify multiple categorical matches cleanly inside an IN clause.`];
      explanation = `Simplifies wide boolean filters into grouped categories.`;
    } else if (i === 14) {
      text = `Calculate the maximum value of ${getCol(1, 3)} inside the ${t2} table.`;
      expectedQuery = `SELECT MAX(${getCol(1, 3)}) FROM ${t2}`;
      hints = [`Specify aggregate function MAX on the numerical column: ${getCol(1, 3)}`];
      explanation = `Reveals the peak pricing tier registered in product files.`;
    } else if (i === 15) {
      text = `Display the minimum value of ${getCol(1, 3)} inside the ${t2} table.`;
      expectedQuery = `SELECT MIN(${getCol(1, 3)}) FROM ${t2}`;
      hints = [`Use the MIN aggregate function.`];
      explanation = `Identifies the lowest priced option available in active items.`;
    } else if (i === 16) {
      text = `Find entries in ${t1} table whose name contains the letters 'an' anywhere.`;
      expectedQuery = `SELECT * FROM ${t1} WHERE ${getCol(0, 1)} LIKE '%an%'`;
      hints = [`Enclose 'an' within % wildcards: '%an%'.`];
      explanation = `Scans name fields employing robust string match algorithms.`;
    } else if (i === 17) {
      text = `Find records in ${t3} table matching status 'Delivered' or 'Approved' or 'Completed' sorted chronologically.`;
      expectedQuery = `SELECT * FROM ${t3} WHERE status IN ('Delivered', 'Approved', 'Completed') ORDER BY ${getCol(2, 0)} ASC`;
      hints = [`Combine IN filtering with ORDER BY sorting.`];
      explanation = `Isolates finished items sorted chronologically.`;
    } else if (i === 18) {
      text = `Select the name/identifiers alongside an incremental alias label from table ${t2}.`;
      expectedQuery = `SELECT ${getCol(1, 1)} AS label_name FROM ${t2}`;
      hints = [`To declare an alias, write: SELECT column_name AS alias_name FROM table.`];
      explanation = `Apples contextual clean headings for automated client reports.`;
    } else if (i === 19) {
      text = `Evaluate all rows in ${t2} where current stock or measured metric is strictly equal to 0.`;
      expectedQuery = `SELECT * FROM ${t2} WHERE ${getCol(1, 4)} = 0`; // usually stock_count/status
      hints = [`Filter on the column integer value: ${getCol(1, 4)} = 0`];
      explanation = `Draws immediate operational attention to empty stock sheets.`;
    } else {
      text = `Aggregate the gross sum of ${getCol(1, 3)} values compiled in the ${t2} table.`;
      expectedQuery = `SELECT SUM(${getCol(1, 3)}) FROM ${t2}`;
      hints = [`Use the SUM aggregate function on numeric column ${getCol(1, 3)}.`];
      explanation = `Summarizes capital allocations compiled across departments.`;
    }

    q.push({
      id: `${domainCode}-B${String(i).padStart(2, "0")}`,
      text,
      expectedQuery,
      difficulty: "Beginner",
      category: cat,
      hints,
      explanation
    });
  }

  // --- 10 INTERMEDIATE QUESTIONS ---
  q.push({
    id: `${domainCode}-I01`,
    text: `Calculate the average of ${getCol(1, 3)} grouped separately by classification category: ${getCol(1, 2)}.`,
    expectedQuery: `SELECT ${getCol(1, 2)}, AVG(${getCol(1, 3)}) FROM ${t2} GROUP BY ${getCol(1, 2)}`,
    difficulty: "Intermediate",
    category: "GROUP BY",
    hints: [`Structure as: SELECT group_column, AVG(calc_column) FROM table GROUP BY group_column.`],
    explanation: `Segments numerical parameters across core categorical variables.`
  });

  q.push({
    id: `${domainCode}-I02`,
    text: `Find category groupings in ${t2} where the calculated average value is strictly greater than 150.`,
    expectedQuery: `SELECT ${getCol(1, 2)}, AVG(${getCol(1, 3)}) FROM ${t2} GROUP BY ${getCol(1, 2)} HAVING AVG(${getCol(1, 3)}) > 150`,
    difficulty: "Intermediate",
    category: "HAVING Clause",
    hints: [`Filtering after GROUP BY requires the HAVING clause: HAVING AVG(${getCol(1, 3)}) > 150.`],
    explanation: `Filters summary calculations using the post-aggregate SQL scheduler.`
  });

  q.push({
    id: `${domainCode}-I03`,
    text: `Count matching rows in ${t1} table grouped by reside city field, ordered descending by tally count.`,
    expectedQuery: `SELECT city, COUNT(*) FROM ${t1} GROUP BY city ORDER BY COUNT(*) DESC`,
    difficulty: "Intermediate",
    category: "GROUP BY & ORDER BY",
    hints: [`Group by city, project COUNT(*), then write: ORDER BY COUNT(*) DESC.`],
    explanation: `Reveals regional density distributions sorted by popularity.`
  });

  q.push({
    id: `${domainCode}-I04`,
    text: `Find cities from the ${t1} table that host strictly more than 2 profiles.`,
    expectedQuery: `SELECT city, COUNT(*) FROM ${t1} GROUP BY city HAVING COUNT(*) > 2`,
    difficulty: "Intermediate",
    category: "HAVING Clause",
    hints: [`Use GROUP BY city followed by HAVING COUNT(*) > 2.`],
    explanation: `Excludes low density geographic entities from marketing sheets.`
  });

  q.push({
    id: `${domainCode}-I05`,
    text: `Show the minimum and maximum ${getCol(1, 3)} grouped under each category ${getCol(1, 2)}.`,
    expectedQuery: `SELECT ${getCol(1, 2)}, MIN(${getCol(1, 3)}), MAX(${getCol(1, 3)}) FROM ${t2} GROUP BY ${getCol(1, 2)}`,
    difficulty: "Intermediate",
    category: "GROUP BY",
    hints: [`Project multiple aggregates: MIN and MAX, then apply GROUP BY on ${getCol(1, 2)}.`],
    explanation: `Reports price ranges mapping product lines to identify variance models.`
  });

  q.push({
    id: `${domainCode}-I06`,
    text: `Retrieve records in ${t1} that represent ages between 25 and 65, sorting results descending by age values.`,
    expectedQuery: `SELECT * FROM ${t1} WHERE age BETWEEN 25 AND 65 ORDER BY age DESC`,
    difficulty: "Intermediate",
    category: "Operators",
    hints: [`Combine BETWEEN filters with active ORDER BY queries.`],
    explanation: `Provides demographics logs sorted chronologically.`
  });

  q.push({
    id: `${domainCode}-I07`,
    text: `Calculate the total sum of matching values in ${t3} where status is strictly 'Delivered' or 'Approved' or 'Completed'.`,
    expectedQuery: `SELECT SUM(${getCol(2, 4)}) FROM ${t3} WHERE status IN ('Delivered', 'Approved', 'Completed')`,
    difficulty: "Intermediate",
    category: "Aggregate & Filters",
    hints: [`Focus sum checks on: ${getCol(2, 4)}. Apply filter WHERE status IN (...) beforehand.`],
    explanation: `Gathers gross capital flows resulting strictly from executed conversions.`
  });

  q.push({
    id: `${domainCode}-I08`,
    text: `Group transaction details in ${t3} by status, displaying status, count, and average values.`,
    expectedQuery: `SELECT status, COUNT(*), AVG(${getCol(2, 4)}) FROM ${t3} GROUP BY status`,
    difficulty: "Intermediate",
    category: "GROUP BY",
    hints: [`Group by status. Compute COUNT(*) and AVG(${getCol(2, 4)}).`],
    explanation: `Summarizes pipeline health variables cleanly.`
  });

  q.push({
    id: `${domainCode}-I09`,
    text: `Find rows in ${t1} where city is NOT '${cities[0]}' and names do NOT end with 'son'.`,
    expectedQuery: `SELECT * FROM ${t1} WHERE city <> '${cities[0]}' AND name NOT LIKE '%son'`,
    difficulty: "Intermediate",
    category: "Logical Operators",
    hints: [`Combine inequity '<>' with NOT LIKE '%son' using logical AND.`],
    explanation: `Discards localized major hubs and common family names from audit lists.`
  });

  q.push({
    id: `${domainCode}-I10`,
    text: `Find top premium entities in ${t2} whose values exceed five times the baseline of $30.`,
    expectedQuery: `SELECT * FROM ${t2} WHERE ${getCol(1, 3)} > (5 * 30) ORDER BY ${getCol(1, 3)} DESC`,
    difficulty: "Intermediate",
    category: "Arithmetic Operators",
    hints: [`Use math checking: WHERE ${getCol(1, 3)} > 150 or > (5 * 30).`],
    explanation: `Assists premium merchandisers targeting elite customers.`
  });

  return q;
}