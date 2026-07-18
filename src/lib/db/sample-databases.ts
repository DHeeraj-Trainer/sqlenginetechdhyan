import type { SampleDatabase } from "./sample-builder";
import { enterpriseBanking } from "./enterprise/banking";
import { enterpriseHealthcare } from "./enterprise/healthcare";
import { enterpriseRetail } from "./enterprise/retail";

// Curated production-quality sample databases.
// Legacy domain data (10 domains) is exposed separately as tutorials.
export const sampleDatabases: SampleDatabase[] = [
  enterpriseBanking,
  enterpriseHealthcare,
  enterpriseRetail,
  {
    id: "chinook_lite",
    name: "Chinook Lite (Music Store)",
    description: "Artists, albums, tracks. Great for JOINs and aggregations.",
    tables: [
      {
        name: "artists",
        columns: [
          { name: "artist_id", type: "int", pk: true },
          { name: "name", type: "text", notNull: true },
        ],
        rows: [
          { artist_id: 1, name: "Miles Davis" },
          { artist_id: 2, name: "Radiohead" },
          { artist_id: 3, name: "Kendrick Lamar" },
          { artist_id: 4, name: "Daft Punk" },
        ],
      },
      {
        name: "albums",
        columns: [
          { name: "album_id", type: "int", pk: true },
          { name: "title", type: "text", notNull: true },
          { name: "artist_id", type: "int", notNull: true },
          { name: "release_year", type: "int" },
        ],
        rows: [
          { album_id: 1, title: "Kind of Blue", artist_id: 1, release_year: 1959 },
          { album_id: 2, title: "OK Computer", artist_id: 2, release_year: 1997 },
          { album_id: 3, title: "In Rainbows", artist_id: 2, release_year: 2007 },
          { album_id: 4, title: "DAMN.", artist_id: 3, release_year: 2017 },
          { album_id: 5, title: "Random Access Memories", artist_id: 4, release_year: 2013 },
        ],
      },
      {
        name: "tracks",
        columns: [
          { name: "track_id", type: "int", pk: true },
          { name: "album_id", type: "int", notNull: true },
          { name: "name", type: "text", notNull: true },
          { name: "duration_sec", type: "int" },
          { name: "price", type: "real" },
        ],
        rows: [
          { track_id: 1, album_id: 1, name: "So What", duration_sec: 545, price: 0.99 },
          { track_id: 2, album_id: 1, name: "Freddie Freeloader", duration_sec: 585, price: 0.99 },
          { track_id: 3, album_id: 2, name: "Paranoid Android", duration_sec: 383, price: 1.29 },
          { track_id: 4, album_id: 2, name: "Karma Police", duration_sec: 261, price: 1.29 },
          { track_id: 5, album_id: 3, name: "Nude", duration_sec: 255, price: 1.29 },
          { track_id: 6, album_id: 4, name: "HUMBLE.", duration_sec: 177, price: 1.29 },
          { track_id: 7, album_id: 4, name: "DNA.", duration_sec: 185, price: 1.29 },
          { track_id: 8, album_id: 5, name: "Get Lucky", duration_sec: 369, price: 1.29 },
        ],
      },
    ],
  },
  {
    id: "hr",
    name: "HR (Employees & Departments)",
    description: "Classic HR schema for hierarchical queries and grouping.",
    tables: [
      {
        name: "departments",
        columns: [
          { name: "dept_id", type: "int", pk: true },
          { name: "name", type: "text", notNull: true },
          { name: "location", type: "text" },
        ],
        rows: [
          { dept_id: 10, name: "Engineering", location: "Berlin" },
          { dept_id: 20, name: "Sales", location: "New York" },
          { dept_id: 30, name: "Marketing", location: "London" },
          { dept_id: 40, name: "HR", location: "Berlin" },
        ],
      },
      {
        name: "employees",
        columns: [
          { name: "emp_id", type: "int", pk: true },
          { name: "name", type: "text", notNull: true },
          { name: "dept_id", type: "int" },
          { name: "manager_id", type: "int" },
          { name: "salary", type: "real" },
          { name: "hire_date", type: "date" },
        ],
        rows: [
          { emp_id: 1, name: "Ada Lovelace", dept_id: 10, manager_id: null, salary: 145000, hire_date: "2018-04-11" },
          { emp_id: 2, name: "Linus Torvalds", dept_id: 10, manager_id: 1, salary: 132000, hire_date: "2019-09-01" },
          { emp_id: 3, name: "Grace Hopper", dept_id: 10, manager_id: 1, salary: 128000, hire_date: "2020-02-13" },
          { emp_id: 4, name: "Peggy Olson", dept_id: 30, manager_id: null, salary: 96000, hire_date: "2017-06-22" },
          { emp_id: 5, name: "Don Draper", dept_id: 20, manager_id: null, salary: 152000, hire_date: "2016-01-05" },
          { emp_id: 6, name: "Joan Holloway", dept_id: 40, manager_id: null, salary: 88000, hire_date: "2015-11-30" },
          { emp_id: 7, name: "Pete Campbell", dept_id: 20, manager_id: 5, salary: 71000, hire_date: "2021-03-18" },
        ],
      },
    ],
  },
  {
    id: "ecommerce",
    name: "E-commerce Orders",
    description: "Customers, products, orders and line items.",
    tables: [
      {
        name: "customers",
        columns: [
          { name: "customer_id", type: "int", pk: true },
          { name: "name", type: "text", notNull: true },
          { name: "country", type: "text" },
          { name: "signup_date", type: "date" },
        ],
        rows: [
          { customer_id: 1, name: "Alice", country: "US", signup_date: "2023-01-14" },
          { customer_id: 2, name: "Björn", country: "SE", signup_date: "2023-04-02" },
          { customer_id: 3, name: "Chika", country: "JP", signup_date: "2023-06-19" },
          { customer_id: 4, name: "Diego", country: "MX", signup_date: "2024-01-05" },
        ],
      },
      {
        name: "products",
        columns: [
          { name: "product_id", type: "int", pk: true },
          { name: "name", type: "text", notNull: true },
          { name: "category", type: "text" },
          { name: "price", type: "real" },
        ],
        rows: [
          { product_id: 1, name: "Wireless Mouse", category: "Electronics", price: 25.5 },
          { product_id: 2, name: "USB-C Cable", category: "Electronics", price: 9.99 },
          { product_id: 3, name: "Coffee Beans 1kg", category: "Grocery", price: 18.0 },
          { product_id: 4, name: "Standing Desk", category: "Furniture", price: 349.0 },
        ],
      },
      {
        name: "orders",
        columns: [
          { name: "order_id", type: "int", pk: true },
          { name: "customer_id", type: "int", notNull: true },
          { name: "order_date", type: "date" },
          { name: "status", type: "text" },
        ],
        rows: [
          { order_id: 1001, customer_id: 1, order_date: "2024-03-01", status: "paid" },
          { order_id: 1002, customer_id: 2, order_date: "2024-03-02", status: "shipped" },
          { order_id: 1003, customer_id: 1, order_date: "2024-03-15", status: "paid" },
          { order_id: 1004, customer_id: 3, order_date: "2024-04-01", status: "cancelled" },
          { order_id: 1005, customer_id: 4, order_date: "2024-04-05", status: "paid" },
        ],
      },
      {
        name: "order_items",
        columns: [
          { name: "order_id", type: "int", notNull: true },
          { name: "product_id", type: "int", notNull: true },
          { name: "quantity", type: "int", notNull: true },
        ],
        rows: [
          { order_id: 1001, product_id: 1, quantity: 2 },
          { order_id: 1001, product_id: 2, quantity: 3 },
          { order_id: 1002, product_id: 4, quantity: 1 },
          { order_id: 1003, product_id: 3, quantity: 5 },
          { order_id: 1005, product_id: 1, quantity: 1 },
          { order_id: 1005, product_id: 2, quantity: 2 },
        ],
      },
    ],
  },
];
