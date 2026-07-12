// Monthly analytics report for the admin Reports page. The report is scoped to a
// single calendar month (by client.transaction_date) and returns aggregate summaries
// rather than a flat list of transactions.

export interface CountItem {
  name: string;
  count: number;
}

export interface MonthlyReport {
  month: string;        // 'YYYY-MM' — the month this report covers
  month_label: string;  // e.g. 'July 2026'
  total: number;        // transactions with transaction_date in the month

  // Volume context
  by_status: CountItem[];                 // name = status key
  trend: { month: string; label: string; count: number }[]; // last 6 months incl. selected

  // Issues & referrals
  by_issue: CountItem[];   // top issue categories
  by_office: CountItem[];  // referred offices (non-null)

  // Demographics
  by_sex: CountItem[];
  by_priority: CountItem[]; // Senior / PWD / Pregnant (overlapping counts)
  by_city: CountItem[];     // top cities/municipalities

  // Lawyer productivity
  by_lawyer: CountItem[];
}
