import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { reportService } from '../services/api';
import type { CountItem, FeedbackQuestionStat, MonthlyReport } from '../types/client';

const STATUS_LABELS: Record<string, string> = {
  waiting:     'Waiting',
  assigned:    'Assigned',
  in_progress: 'In Progress',
  incomplete:  'Incomplete',
  completed:   'Completed',
  cancelled:   'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  waiting:     'var(--pacu-accent)',
  assigned:    'var(--bs-info)',
  in_progress: 'var(--bs-primary)',
  incomplete:  'var(--bs-warning)',
  completed:   'var(--bs-success)',
  cancelled:   'var(--bs-danger)',
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Reusable pieces
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="pacu-eyebrow mb-2 mt-4" style={{ fontSize: '0.7rem' }}>{children}</p>;
}

function CountBarList({ items, empty, format }: { items: CountItem[]; empty: string; format?: (name: string) => string }) {
  if (items.length === 0) {
    return <p className="text-muted mb-0" style={{ fontSize: '0.82rem' }}>{empty}</p>;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="d-flex flex-column gap-2">
      {items.map((it) => (
        <div key={it.name}>
          <div className="d-flex justify-content-between align-items-baseline mb-1" style={{ fontSize: '0.82rem' }}>
            <span className="text-truncate pe-2" title={it.name}>{format ? format(it.name) : it.name}</span>
            <span className="fw-semibold flex-shrink-0">{it.count}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, backgroundColor: 'var(--bs-border-color)' }}>
            <div style={{ height: 6, borderRadius: 3, width: `${(it.count / max) * 100}%`, backgroundColor: 'var(--pacu-accent)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card h-100">
      <div className="card-body p-4">
        <p className="fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>{title}</p>
        {subtitle && <p className="text-muted mb-3" style={{ fontSize: '0.78rem' }}>{subtitle}</p>}
        {!subtitle && <div className="mb-3" />}
        {children}
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: MonthlyReport['trend'] }) {
  const formatted = data.map((p) => ({
    ...p,
    short: new Date(Number(p.month.slice(0, 4)), Number(p.month.slice(5)) - 1, 1)
      .toLocaleString('en-US', { month: 'short' }),
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bs-border-color)" />
        <XAxis dataKey="short" tick={{ fontSize: 11, fill: 'var(--bs-secondary-color)' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--bs-secondary-color)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--bs-body-bg)', border: '1px solid var(--bs-border-color)', borderRadius: 8, fontSize: '0.82rem' }}
          labelStyle={{ color: 'var(--bs-body-color)', fontWeight: 600 }}
          itemStyle={{ color: 'var(--bs-body-color)' }}
          cursor={{ fill: 'var(--bs-border-color)', opacity: 0.4 }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
          formatter={(v) => [v as number, 'Transactions']}
        />
        <Bar dataKey="count" fill="#4f7ef7" radius={[4, 4, 0, 0]} name="Transactions" maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function scoreColor(v: number): string {
  return v >= 4 ? '#16a34a' : v >= 3 ? '#d97706' : '#dc2626';
}
function distColor(rating: number): string {
  return rating >= 4 ? '#16a34a' : rating === 3 ? '#d97706' : '#dc2626';
}

const DIST_LABELS: Record<number, string> = {
  5: 'Strongly Agree', 4: 'Agree', 3: 'Neither Agree nor Disagree', 2: 'Disagree', 1: 'Strongly Disagree',
};

function StatTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card h-100">
      <div className="card-body p-3">
        <p className="text-muted mb-1" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p className="fw-bold mb-0 lh-1" style={{ fontSize: '1.6rem', color: tone ?? 'var(--pacu-accent)' }}>{value}</p>
      </div>
    </div>
  );
}

// Average score per question, grouped by thematic category, as colored bars.
function ScoreByQuestion({ items }: { items: FeedbackQuestionStat[] }) {
  const groups: { title: string; items: FeedbackQuestionStat[] }[] = [];
  for (const q of items) {
    const last = groups[groups.length - 1];
    if (!last || last.title !== q.group) groups.push({ title: q.group, items: [q] });
    else last.items.push(q);
  }
  return (
    <div className="d-flex flex-column gap-3">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="pacu-eyebrow mb-2" style={{ fontSize: '0.65rem' }}>{g.title}</p>
          <div className="d-flex flex-column gap-2">
            {g.items.map((q) => (
              <div key={q.key}>
                <div className="d-flex justify-content-between align-items-baseline mb-1" style={{ fontSize: '0.82rem' }}>
                  <span className="pe-2" title={q.statement}>
                    <span className="text-muted me-1">{q.number}.</span>{q.statement}
                  </span>
                  <span className="fw-semibold flex-shrink-0">{q.average ? q.average.toFixed(2) : '—'}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, backgroundColor: 'var(--bs-border-color)' }}>
                  <div style={{ height: 6, borderRadius: 3, width: `${(q.average / 5) * 100}%`, backgroundColor: scoreColor(q.average) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DistributionChart({ data }: { data: MonthlyReport['feedback']['distribution'] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bs-border-color)" />
        <XAxis dataKey="rating" tick={{ fontSize: 11, fill: 'var(--bs-secondary-color)' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--bs-secondary-color)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--bs-body-bg)', border: '1px solid var(--bs-border-color)', borderRadius: 8, fontSize: '0.82rem' }}
          labelStyle={{ color: 'var(--bs-body-color)', fontWeight: 600 }}
          itemStyle={{ color: 'var(--bs-body-color)' }}
          cursor={{ fill: 'var(--bs-border-color)', opacity: 0.4 }}
          labelFormatter={(r) => DIST_LABELS[r as number] ?? `Rating ${r}`}
          formatter={(v) => [v as number, 'Ratings']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {data.map((d) => <Cell key={d.rating} fill={distColor(d.rating)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// AdminReportsPage
// ---------------------------------------------------------------------------

export default function AdminReportsPage() {
  const [month, setMonth]     = useState<string>(currentMonth());
  const [report, setReport]   = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  async function load(m: string) {
    setLoading(true);
    try {
      setReport(await reportService.getMonthly(m));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load report', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(month); }, [month]);

  async function handleExport(format: 'xlsx' | 'pdf') {
    setExporting(format);
    try {
      if (format === 'xlsx') await reportService.exportExcel(month);
      else await reportService.exportPdf(month);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Export failed', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setExporting(null);
    }
  }

  const isEmpty = report !== null && report.total === 0;

  return (
    <div>
      <h1 className="pacu-display mb-1">Monthly Report</h1>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
        Accomplishments for a selected month — completed and cancelled transactions.
      </p>

      {/* Controls */}
      <div className="card mb-4">
        <div className="card-body p-4 d-flex flex-wrap align-items-end justify-content-between gap-3">
          <div>
            <label htmlFor="pacu-report-month" className="form-label">Month</label>
            <input
              id="pacu-report-month"
              type="month"
              className="form-control"
              style={{ maxWidth: 220 }}
              value={month}
              max={currentMonth()}
              onChange={(e) => setMonth(e.target.value || currentMonth())}
            />
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => handleExport('xlsx')} disabled={exporting !== null || loading || isEmpty}>
              {exporting === 'xlsx' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-file-earmark-excel me-1" />}
              Excel
            </button>
            <button className="btn btn-outline-secondary" onClick={() => handleExport('pdf')} disabled={exporting !== null || loading || isEmpty}>
              {exporting === 'pdf' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-file-earmark-pdf me-1" />}
              PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : report ? (
        <>
          {/* Headline */}
          <div className="card mb-2">
            <div className="card-body p-4 d-flex flex-wrap align-items-center gap-4">
              <div>
                <div className="fw-bold lh-1" style={{ fontSize: '2.4rem' }}>{report.total}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Accomplishments in {report.month_label}</div>
              </div>
              <div className="d-flex flex-wrap gap-2 ms-auto">
                {report.by_status.map((s) => (
                  <span
                    key={s.name}
                    className="d-inline-flex align-items-center gap-2 px-3 py-2"
                    style={{ borderRadius: 'var(--pacu-radius-sm)', backgroundColor: (STATUS_COLOR[s.name] ?? 'var(--bs-secondary)') + '18', fontSize: '0.82rem' }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: STATUS_COLOR[s.name] ?? 'var(--bs-secondary)' }} />
                    <span className="text-muted">{STATUS_LABELS[s.name] ?? s.name}</span>
                    <span className="fw-semibold">{s.count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {isEmpty ? (
            <div className="card">
              <div className="card-body p-5 text-center text-muted">
                <i className="bi bi-calendar-x fs-2 d-block mb-2" />
                No completed or cancelled transactions for {report.month_label}.
              </div>
            </div>
          ) : (
            <>
              {/* Trend */}
              <SectionLabel>Trend</SectionLabel>
              <div className="card mb-2">
                <div className="card-body p-4">
                  <p className="fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>Accomplishments — Last 6 Months</p>
                  <p className="text-muted mb-3" style={{ fontSize: '0.78rem' }}>Monthly completed &amp; cancelled volume</p>
                  <TrendChart data={report.trend} />
                </div>
              </div>

              {/* Issues & referrals */}
              <SectionLabel>Issues &amp; Referrals</SectionLabel>
              <div className="row g-4">
                <div className="col-lg-6">
                  <SummaryCard title="Top Issue Categories" subtitle="Most common legal issues this month">
                    <CountBarList items={report.by_issue} empty="No tagged issues this month." />
                  </SummaryCard>
                </div>
                <div className="col-lg-6">
                  <SummaryCard title="Referred Offices" subtitle="Where clients were referred">
                    <CountBarList items={report.by_office} empty="No referrals this month." />
                  </SummaryCard>
                </div>
              </div>

              {/* Demographics */}
              <SectionLabel>Demographics</SectionLabel>
              <div className="row g-4">
                <div className="col-lg-4">
                  <SummaryCard title="By Sex">
                    <CountBarList items={report.by_sex} empty="No data." format={cap} />
                  </SummaryCard>
                </div>
                <div className="col-lg-4">
                  <SummaryCard title="Priority Groups">
                    <CountBarList items={report.by_priority} empty="No priority clients this month." />
                  </SummaryCard>
                </div>
                <div className="col-lg-4">
                  <SummaryCard title="Top Cities / Municipalities">
                    <CountBarList items={report.by_city} empty="No location data." />
                  </SummaryCard>
                </div>
              </div>

              {/* Lawyer productivity */}
              <SectionLabel>Lawyer Productivity</SectionLabel>
              <div className="row g-4 mb-2">
                <div className="col-12">
                  <SummaryCard title="Transactions per Lawyer" subtitle="Cases handled this month">
                    <CountBarList items={report.by_lawyer} empty="No assigned transactions this month." />
                  </SummaryCard>
                </div>
              </div>

              {/* Client satisfaction */}
              <SectionLabel>Client Satisfaction (CSM)</SectionLabel>
              <div className="row g-3 mb-3">
                <div className="col-6 col-lg-3">
                  <StatTile label="Overall Score" value={`${report.feedback.overall_average.toFixed(2)} / 5`} tone={scoreColor(report.feedback.overall_average)} />
                </div>
                <div className="col-6 col-lg-3">
                  <StatTile label="Satisfaction (4–5)" value={`${report.feedback.satisfaction_rate}%`} tone={report.feedback.satisfaction_rate >= 80 ? '#16a34a' : report.feedback.satisfaction_rate >= 60 ? '#d97706' : '#dc2626'} />
                </div>
                <div className="col-6 col-lg-3">
                  <StatTile label="Response Rate" value={`${report.feedback.response_rate}%`} />
                </div>
                <div className="col-6 col-lg-3">
                  <StatTile label="Responses" value={`${report.feedback.responses} / ${report.feedback.eligible}`} tone="var(--bs-body-color)" />
                </div>
              </div>

              {report.feedback.responses === 0 ? (
                <div className="card mb-2">
                  <div className="card-body p-4 text-center text-muted" style={{ fontSize: '0.85rem' }}>
                    <i className="bi bi-chat-square-heart fs-4 d-block mb-2" />
                    No feedback responses for {report.month_label} yet.
                  </div>
                </div>
              ) : (
                <div className="row g-4 mb-2">
                  <div className="col-lg-7">
                    <SummaryCard title="Average Score by Question" subtitle="Mean rating (out of 5), grouped by dimension">
                      <ScoreByQuestion items={report.feedback.by_question} />
                    </SummaryCard>
                  </div>
                  <div className="col-lg-5">
                    <SummaryCard title="Rating Distribution" subtitle="All answered items across responses">
                      <DistributionChart data={report.feedback.distribution} />
                    </SummaryCard>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
