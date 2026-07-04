import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService, lookupService, reportService, userService } from '../services/api';
import type { IssueCategory, LawyerOption, ReferredOffice, ReportFilters, ReportRow } from '../types/client';

const EMPTY_FILTERS: ReportFilters = {};

const STATUS_OPTIONS = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export default function AdminReportsPage() {
  const [lawyers, setLawyers] = useState<LawyerOption[]>([]);
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [offices, setOffices] = useState<ReferredOffice[]>([]);
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([userService.listLawyers(), lookupService.issueCategories(), lookupService.referredOffices()])
      .then(([l, c, o]) => {
        setLawyers(l);
        setCategories(c);
        setOffices(o);
      })
      .catch(() => {});
  }, []);

  function update<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function runReport(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      setRows(await reportService.run(filters));
      setHasRun(true);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not run report', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  async function handleReferralDownload(row: ReportRow) {
    setDownloadingId(row.client_id);
    try {
      await clientService.downloadReferralPdf(row.client_id, row.reference_no);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not download referral form', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleExport(format: 'xlsx' | 'pdf') {
    setExporting(format);
    try {
      if (format === 'xlsx') await reportService.exportExcel(filters);
      else await reportService.exportPdf(filters);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Export failed', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      <h1 className="pacu-display mb-1">Reports</h1>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
        Filter transactions and export the results.
      </p>

      <div className="card mb-4">
        <div className="card-body p-4">
          <form onSubmit={runReport}>
            <div className="row g-3 mb-3">
              <div className="col-md-3">
                <label className="form-label">Date from</label>
                <input type="date" className="form-control" value={filters.date_from ?? ''} onChange={(e) => update('date_from', e.target.value || undefined)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Date to</label>
                <input type="date" className="form-control" value={filters.date_to ?? ''} onChange={(e) => update('date_to', e.target.value || undefined)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Lawyer</label>
                <select className="form-select" value={filters.lawyer_id ?? ''} onChange={(e) => update('lawyer_id', e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">All</option>
                  {lawyers.map((l) => <option key={l.user_id} value={l.user_id}>{l.first_name} {l.last_name}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Status</label>
                <select className="form-select" value={filters.status ?? ''} onChange={(e) => update('status', e.target.value || undefined)}>
                  <option value="">All</option>
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-3">
                <label className="form-label">Issue category</label>
                <select className="form-select" value={filters.issue_category_id ?? ''} onChange={(e) => update('issue_category_id', e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">All</option>
                  {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_group} — {c.category_name}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Referral office</label>
                <select className="form-select" value={filters.referred_office_id ?? ''} onChange={(e) => update('referred_office_id', e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">All</option>
                  {offices.map((o) => <option key={o.office_id} value={o.office_id}>{o.office_name}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Sex</label>
                <select className="form-select" value={filters.sex ?? ''} onChange={(e) => update('sex', e.target.value || undefined)}>
                  <option value="">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Min age</label>
                <input type="number" min={0} className="form-control" value={filters.min_age ?? ''} onChange={(e) => update('min_age', e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Max age</label>
                <input type="number" min={0} className="form-control" value={filters.max_age ?? ''} onChange={(e) => update('max_age', e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </div>

            <div className="row g-3 mb-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label">City</label>
                <input className="form-control" value={filters.city ?? ''} onChange={(e) => update('city', e.target.value || undefined)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Province</label>
                <input className="form-control" value={filters.province ?? ''} onChange={(e) => update('province', e.target.value || undefined)} />
              </div>
              <div className="col-md-3 pb-2">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="priorityOnly"
                    checked={filters.priority_only ?? false}
                    onChange={(e) => update('priority_only', e.target.checked || undefined)}
                  />
                  <label className="form-check-label" htmlFor="priorityOnly">Priority clients only</label>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-search me-2" />}
                Run Report
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear Filters
              </button>
            </div>
          </form>
        </div>
      </div>

      {hasRun && (
        <div className="card">
          <div className="card-body p-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <p className="mb-0 fw-semibold">{rows.length} record{rows.length === 1 ? '' : 's'}</p>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => handleExport('xlsx')} disabled={exporting !== null || rows.length === 0}>
                  {exporting === 'xlsx' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-file-earmark-excel me-1" />}
                  Excel
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => handleExport('pdf')} disabled={exporting !== null || rows.length === 0}>
                  {exporting === 'pdf' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-file-earmark-pdf me-1" />}
                  PDF
                </button>
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="text-muted mb-0">No records match these filters.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Ref No.</th>
                      <th>Date</th>
                      <th>Client</th>
                      <th>Sex/Age</th>
                      <th>Lawyer</th>
                      <th>Issues</th>
                      <th>Office</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.client_id}>
                        <td className="pacu-mono">{r.reference_no}</td>
                        <td>{r.transaction_date}</td>
                        <td>{r.first_name} {r.last_name}</td>
                        <td>{r.sex ?? '—'}/{r.age ?? '—'}</td>
                        <td>{r.lawyer_name ?? '—'}</td>
                        <td>{r.issue_categories ?? '—'}</td>
                        <td>{r.referred_office ?? '—'}</td>
                        <td><span className="pacu-badge">{r.status}</span></td>
                        <td>
                          {r.referred_office && (
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => handleReferralDownload(r)}
                              disabled={downloadingId === r.client_id}
                            >
                              {downloadingId === r.client_id ? (
                                <span className="spinner-border spinner-border-sm" />
                              ) : (
                                <i className="bi bi-file-earmark-pdf" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
