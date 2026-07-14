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

  // Client Satisfaction Measurement (CSM)
  feedback: FeedbackReport;
}

export interface FeedbackQuestionStat {
  key: string;        // sqd1..sqd10
  number: number;     // 1..10
  statement: string;
  group: string;      // thematic category
  average: number;    // mean rating 1-5 (0 when no responses)
  responses: number;  // answered count (excludes N/A)
}

export interface FeedbackReport {
  responses: number;         // feedback submissions for the month's completed transactions
  eligible: number;          // completed transactions in the month (feedback was possible)
  response_rate: number;     // responses / eligible * 100
  overall_average: number;   // mean rating across all answered items, 1-5
  satisfaction_rate: number; // % of answered items rated 4-5 (Agree / Strongly Agree)
  by_question: FeedbackQuestionStat[];
  distribution: { rating: number; count: number }[]; // rating 1..5, count of answered items
}
