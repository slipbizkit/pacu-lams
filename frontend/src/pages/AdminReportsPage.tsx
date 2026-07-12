import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { reportService } from '../services/api';
import type { CountItem, MonthlyReport } from '../types/client';

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
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
