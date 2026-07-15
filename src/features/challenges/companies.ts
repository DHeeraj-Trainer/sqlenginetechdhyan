import type { CompanyDef } from "./types";

/**
 * 20 companies commonly asking SQL interview questions.
 * Colors are Tailwind-safe hex used for badges/highlights.
 */
export const COMPANIES: CompanyDef[] = [
  { id: "amazon", name: "Amazon", emoji: "📦", color: "#FF9900", tier: "FAANG" },
  { id: "google", name: "Google", emoji: "🔎", color: "#4285F4", tier: "FAANG" },
  { id: "microsoft", name: "Microsoft", emoji: "🪟", color: "#00A4EF", tier: "FAANG" },
  { id: "meta", name: "Meta", emoji: "📘", color: "#1877F2", tier: "FAANG" },
  { id: "netflix", name: "Netflix", emoji: "🎞️", color: "#E50914", tier: "FAANG" },
  { id: "uber", name: "Uber", emoji: "🚙", color: "#000000", tier: "Big Tech" },
  { id: "airbnb", name: "Airbnb", emoji: "🏠", color: "#FF5A5F", tier: "Big Tech" },
  { id: "oracle", name: "Oracle", emoji: "🗄️", color: "#F80000", tier: "Enterprise" },
  { id: "adobe", name: "Adobe", emoji: "🎨", color: "#FA0F00", tier: "Enterprise" },
  { id: "atlassian", name: "Atlassian", emoji: "🧩", color: "#0052CC", tier: "Enterprise" },
  { id: "stripe", name: "Stripe", emoji: "💳", color: "#635BFF", tier: "Fintech" },
  { id: "paypal", name: "PayPal", emoji: "💰", color: "#003087", tier: "Fintech" },
  { id: "bloomberg", name: "Bloomberg", emoji: "📊", color: "#F98800", tier: "Fintech" },
  { id: "jpmorgan", name: "JP Morgan", emoji: "🏦", color: "#0F4C81", tier: "Fintech" },
  { id: "goldman-sachs", name: "Goldman Sachs", emoji: "🏛️", color: "#7399C6", tier: "Fintech" },
  { id: "salesforce", name: "Salesforce", emoji: "☁️", color: "#00A1E0", tier: "Enterprise" },
  { id: "flipkart", name: "Flipkart", emoji: "🛒", color: "#F7CA00", tier: "Consumer" },
  { id: "swiggy", name: "Swiggy", emoji: "🥡", color: "#FC8019", tier: "Consumer" },
  { id: "doordash", name: "DoorDash", emoji: "🚴", color: "#FF3008", tier: "Consumer" },
  { id: "walmart", name: "Walmart Labs", emoji: "🛍️", color: "#0071CE", tier: "Consumer" },
];

export const COMPANY_MAP = Object.fromEntries(COMPANIES.map((c) => [c.id, c])) as Record<string, CompanyDef>;
