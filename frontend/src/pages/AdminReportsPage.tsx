import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService, lookupService, reportService, userService } from '../services/api';
import { SearchableSelect } from '../components/SearchableSelect';
import type { CityMunicipality, IssueCategory, LawyerOption, ReferredOffice, ReportFilters, ReportRow } from '../types/client';

const EMPTY_FILTERS: ReportFilters = {};

const STATUS_OPTIONS = [
  { value: 'waiting',     label: 'Waiting' },
  { value: 'assigned',    label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'incomplete',  label: 'Incomplete' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
];

const STATUS_BADGE: Record<string, string> = {
  waiting:     '',
  assigned:    '',
  in_progress: '',
  incomplete:  'pacu-badge--warning',
  completed:   'pacu-badge--success',
  cancelled:   'pacu-badge--danger',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}


// ---------------------------------------------------------------------------
// AdminReportsPage
// ---------------------------------------------------------------------------

export default function AdminReportsPage() {
  const [lawyers, setLawyers]       = useState<LawyerOption[]>([]);
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [offices, setOffices]       = useState<ReferredOffice[]>([]);
  const [cities, setCities]         = useState<CityMunicipality[]>([]);

  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const [rows, setRows]       = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);
  const [hasRun, setHasRun]   = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [cityId, setCityId] = useState<number | null>(null);

  const [pageSize, setPageSize]       = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    Promise.all([
      userService.listLawyers(),
      lookupService.issueCategories(),
      lookupService.referredOffices(),
      lookupService.citiesMunicipalities(),
    ])
      .then(([l, c, o, cm]) => { setLawyers(l); setCategories(c); setOffices(o); setCities(cm); })
      .catch(() => {});
  }, []);

  const cityOptions = useMemo(() =>
    [...cities]
      .sort((a, b) => a.city_municipality.localeCompare(b.city_municipality))
      .map((c) => ({ id: c.id, label: c.city_municipality })),
  [cities]);

  function handleCityChange(id: number | null) {
    setCityId(id);
    const name = cities.find((c) => c.id === id)?.city_municipality;
    update('city', name || undefined);
  }

  function update<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function runReport(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const data = await reportService.run(filters);
      setRows(data);
      setHasRun(true);
      setCurrentPage(1);
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

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const startIdx   = (currentPage - 1) * pageSize;
  const pageRows   = rows.slice(startIdx, startIdx + pageSize);

  const pageNumbers = useMemo(() => {
    const max = 5;
    let start = Math.max(1, currentPage - Math.floor(max / 2));
    const end = Math.min(totalPages, start + max - 1);
    start = Math.max(1, end - max + 1);
    const nums: number[] = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [currentPage, totalPages]);

  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== false && v !== '').length;

  return (
    <div>
      <h1 className="pacu-display mb-1">Reports</h1>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
        Filter transactions and export the results to Excel or PDF.
      </p>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body p-4">
          <form onSubmit={runReport}>
            <p className="pacu-eyebrow mb-3">Date &amp; Assignment</p>
            <div className="row g-3 mb-4">
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
                  <option value="">All lawyers</option>
                  {lawyers.map((l) => <option key={l.user_id} value={l.user_id}>{l.first_name} {l.last_name}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Status</label>
                <select className="form-select" value={filters.status ?? ''} onChange={(e) => update('status', e.target.value || undefined)}>
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <p className="pacu-eyebrow mb-3">Case Details</p>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label">Issue category</label>
                <select className="form-select" value={filters.issue_category_id ?? ''} onChange={(e) => update('issue_category_id', e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">All categories</option>
                  {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_group} — {c.category_name}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Referral office</label>
                <select className="form-select" value={filters.referred_office_id ?? ''} onChange={(e) => update('referred_office_id', e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">All offices</option>
                  {offices.map((o) => <option key={o.office_id} value={o.office_id}>{o.office_name}</option>)}
                </select>
              </div>
              <div className="col-md-4 d-flex align-items-end pb-1">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="priorityOnly" checked={filters.priority_only ?? false} onChange={(e) => update('priority_only', e.target.checked || undefined)} />
                  <label className="form-check-label" htmlFor="priorityOnly">Priority clients only</label>
                </div>
              </div>
            </div>

            <p className="pacu-eyebrow mb-3">Client Demographics</p>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label">Sex</label>
                <select className="form-select" value={filters.sex ?? ''} onChange={(e) => update('sex', e.target.value || undefined)}>
                  <option value="">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">City / Municipality</label>
                <SearchableSelect
                  options={cityOptions}
                  value={cityId}
                  onChange={handleCityChange}
                  placeholder="Search city or municipality…"
                />
              </div>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-search me-2" />}
                Run Report
              </button>
              {activeFilterCount > 0 && (
                <button type="button" className="btn btn-outline-secondary" onClick={() => { setFilters(EMPTY_FILTERS); setCityId(null); }}>
                  Clear Filters
                  <span className="badge rounded-pill ms-2" style={{ backgroundColor: 'var(--pacu-accent)', fontSize: '0.7rem' }}>{activeFilterCount}</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Results */}
      {hasRun && (
        <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between py-3 px-4">
            <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>
              {rows.length} record{rows.length !== 1 ? 's' : ''}
            </span>
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
            <div className="card-body p-5 text-center text-muted">
              <i className="bi bi-inbox fs-2 d-block mb-2" />
              No records match these filters.
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table mb-0 align-middle" style={{ fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th className="ps-4" style={{ width: '1%', whiteSpace: 'nowrap' }}>Ref No.</th>
                      <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Date</th>
                      <th>Client</th>
                      <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Sex</th>
                      <th>Lawyer</th>
                      <th>Issues</th>
                      <th>Referred Office</th>
                      <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Status</th>
                      <th style={{ width: '1%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => {
                      const priority = [r.is_senior && 'Senior', r.is_pwd && 'PWD', r.is_pregnant && 'Pregnant'].filter(Boolean) as string[];
                      return (
                        <tr key={r.client_id}>
                          <td className="ps-4"><span className="pacu-mono">{r.reference_no}</span></td>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.transaction_date)}</td>
                          <td>
                            <div>{r.first_name} {r.last_name}</div>
                            {priority.length > 0 && (
                              <div className="d-flex gap-1 mt-1">
                                {priority.map((p) => <span key={p} className="pacu-badge" style={{ fontSize: '0.65rem' }}>{p}</span>)}
                              </div>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {r.sex ? r.sex.charAt(0).toUpperCase() + r.sex.slice(1) : '—'}
                          </td>
                          <td>{r.lawyer_name ?? <span className="text-muted">—</span>}</td>
                          <td className="text-muted" style={{ maxWidth: 200 }}>
                            <div className="text-truncate" title={r.issue_categories ?? undefined}>{r.issue_categories ?? '—'}</div>
                          </td>
                          <td>{r.referred_office ?? <span className="text-muted">—</span>}</td>
                          <td>
                            <span className={`pacu-badge ${STATUS_BADGE[r.status] ?? ''}`}>
                              {STATUS_OPTIONS.find((s) => s.value === r.status)?.label ?? r.status}
                            </span>
                          </td>
                          <td className="pe-3">
                            {r.referred_office && (
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => handleReferralDownload(r)} disabled={downloadingId === r.client_id} title="Download referral form">
                                {downloadingId === r.client_id ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-file-earmark-pdf" />}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="card-footer d-flex flex-wrap align-items-center justify-content-between gap-3 py-2 px-4" style={{ fontSize: '0.85rem' }}>
                <span className="text-muted">
                  Showing {startIdx + 1}–{Math.min(startIdx + pageSize, rows.length)} of {rows.length}
                </span>
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <div className="d-flex align-items-center gap-2">
                    <label htmlFor="pacu-report-page-size" className="text-muted mb-0">Rows per page</label>
                    <select id="pacu-report-page-size" className="form-select form-select-sm" style={{ width: 'auto' }} value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  {totalPages > 1 && (
                    <nav aria-label="Report pagination">
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button type="button" className="page-link" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><i className="bi bi-chevron-bar-left" /></button>
                        </li>
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button type="button" className="page-link" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><i className="bi bi-chevron-left" /></button>
                        </li>
                        {pageNumbers.map((n) => (
                          <li key={n} className={`page-item ${n === currentPage ? 'active' : ''}`}>
                            <button type="button" className="page-link" onClick={() => setCurrentPage(n)}>{n}</button>
                          </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button type="button" className="page-link" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><i className="bi bi-chevron-right" /></button>
                        </li>
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button type="button" className="page-link" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><i className="bi bi-chevron-bar-right" /></button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
