// Indian Financial Year months (Apr–Mar)
export const FY_MONTHS = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
] as const;

export type FyMonth = (typeof FY_MONTHS)[number];

export const FINANCIAL_YEARS = ["2024-25", "2025-26", "2026-27"] as const;
export type FinancialYear = (typeof FINANCIAL_YEARS)[number];

export function currentFY(): FinancialYear {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0..11
  // Apr (3) starts FY
  if (m >= 3) {
    return `${y}-${String((y + 1) % 100).padStart(2, "0")}` as FinancialYear;
  }
  return `${y - 1}-${String(y % 100).padStart(2, "0")}` as FinancialYear;
}

export const SERVICE_TYPES = [
  "SEO retainer",
  "Content strategy",
  "AI automation",
  "Performance marketing",
  "Consulting",
  "One-time project",
  "Training",
  "Other",
] as const;

export const EXPENSE_CATEGORIES = [
  "Freelancer / contractor",
  "Office / coworking",
  "Internet & phone",
  "CA / legal",
  "Business travel",
  "Marketing & ads (own)",
  "Facebook Ads",
  "Google Ads",
  "Tools / SaaS",
  "Software & domains",
  "Founder salary",
  "Tax payment",
  "Team meals & events",
  "Miscellaneous",
] as const;

export const RECOVERABLE_CATEGORIES = [
  "Facebook Ads",
  "Google Ads",
  "Other Ads",
  "Tools / SaaS",
  "Travel (Uber/cab)",
  "Hosting / domain",
  "Freelancer",
  "Miscellaneous",
] as const;

export const PAID_VIA_OPTIONS = [
  "Personal card",
  "Business card",
  "UPI (personal)",
  "UPI (business)",
  "Cash",
  "Bank transfer",
] as const;

export const RECOVERABLE_STATUSES = ["Pending", "Recovered", "Written off"] as const;

export const INVOICE_STATUSES = ["Pending", "Paid", "Overdue", "Partial", "Disputed"] as const;

export const TOOL_CATEGORIES = [
  "SEO",
  "AI / ML",
  "Design",
  "Analytics",
  "Project mgmt",
  "Communication",
  "Hosting",
  "CRM",
  "Ads",
  "Accounting",
  "Other",
] as const;

export const BILLING_CYCLES = ["Monthly", "Quarterly", "Annual", "Lifetime"] as const;
export const TOOL_STATUSES = ["Active", "Paused", "Cancelled", "Trial"] as const;
