import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import type { CompletedTransaction } from '../types/client';

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// June 2026 is the earliest available month
const EARLIEST = { year: 2026, month: 6 };

function buildMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  let y = EARLIEST.year;
  let m = EARLIEST.month;
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
    const date = new Date(y, m - 1, 1);
    const label = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const value = `${y}-${String(m).padStart(2, '0')}`;
    options.push({ value, label });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return options.reverse();
}

function monthToDateRange(value: string): { date_from: string; date_to: string } {
  const [y, m] = value.split('-').map(Number);
  const date_from = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const date_to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { date_from, date_to };
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function SupportStaffHistoryPage() {
  const MONTH_OPTIONS = useMemo(() => buildMonthOptions(), []);

  const [rows, setRows] = useState<CompletedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  async function handleSearch() {
    setLoading(true);
    setHasSearched(true);
    setCurrentPage(1);
    try {
      const dateRange = monthToDateRange(selectedMonth);
      const data = await clientService.listAllHistory({
        search: search || undefined,
        ...dateRange,
      });
      setRows(data);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load completed transactions', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      handleSearch();
      return;
    }
    const handle = setTimeout(() => { handleSearch(); }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedMonth]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(startIdx, startIdx + pageSize);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    const nums: number[] = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [currentPage, totalPages]);

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <h1 className="pacu-display mb-0">Completed Transactions</h1>
      </div>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
        All completed transactions system-wide.
      </p>

      <div className="card mb-4">
        <div className="card-body p-3">
          <label className="form-label mb-1" style={{ fontSize: '0.85rem' }}>Search by Client Name or Company</label>
          <div className="d-flex gap-2 flex-wrap">
            <div style={{ minWidth: 180 }}>
              <select
                className="form-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {MONTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="position-relative" style={{ flex: '1 1 220px', maxWidth: 320 }}>
              <i className="bi bi-search position-absolute text-muted" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: 34, paddingRight: search ? 34 : undefined }}
                placeholder="Client name or company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="btn btn-sm position-absolute text-muted"
                  style={{ right: 4, top: '50%', transform: 'translateY(-50%)', padding: '0.15rem 0.4rem' }}
                  onClick={() => setSearch('')}
                >
                  <i className="bi bi-x-lg" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : !hasSearched ? null : rows.length === 0 ? (
        <div className="card">
          <div className="card-body p-5 text-center text-muted">
            <i className="bi bi-inbox fs-2 d-block mb-2" />
            No completed transactions found.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th className="ps-4">Completion Date</th>
                  <th>Reference No.</th>
                  <th>Client Name</th>
                  <th>Company</th>
                  <th>Lawyer</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.client_id}>
                    <td className="ps-4" style={{ whiteSpace: 'nowrap' }}>{fmtDate(row.updated_at)}</td>
                    <td><span className="pacu-mono fw-semibold">{row.reference_no}</span></td>
                    <td>
                      <span className="d-flex align-items-center gap-2">
                        {row.is_anonymous
                          ? <><i className="bi bi-incognito text-muted" /><span className="text-muted fst-italic">Anonymous</span></>
                          : <>{row.first_name} {row.last_name}</>}
                        {(row.is_senior || row.is_pwd || row.is_pregnant) && (
                          <span className="pacu-badge" style={{ fontSize: '0.65rem' }}>Priority</span>
                        )}
                      </span>
                    </td>
                    <td className="text-muted">
                      {row.employer
                        ? row.employer
                        : row.is_anonymous
                          ? <><i className="bi bi-incognito text-muted me-1" /><span className="fst-italic">Anonymous</span></>
                          : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td className="text-muted">{row.lawyer_name || <span style={{ opacity: 0.4 }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card-footer d-flex flex-wrap align-items-center justify-content-between gap-3 py-2 px-4" style={{ fontSize: '0.8rem' }}>
            <span className="text-muted">
              Showing {startIdx + 1}–{Math.min(startIdx + pageSize, rows.length)} of {rows.length} transaction{rows.length !== 1 ? 's' : ''}
            </span>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="pacu-ss-history-page-size" className="text-muted mb-0">Rows per page</label>
                <select
                  id="pacu-ss-history-page-size"
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>
              {totalPages > 1 && (
                <nav aria-label="Completed transactions pagination">
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
        </div>
      )}
    </div>
  );
}
