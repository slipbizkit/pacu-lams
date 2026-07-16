import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import { TransactionViewModal } from '../components/TransactionViewModal';
import type { CompletedTransaction } from '../types/client';

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// The Director's month picker mirrors the Admin Reports page: a native month input
// capped at the current month. The selected month is converted to a date range and
// passed to the system-wide completed-transactions query.
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthToDateRange(value: string): { date_from: string; date_to: string } {
  const [y, m] = value.split('-').map(Number);
  const date_from = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const date_to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { date_from, date_to };
}

export default function DirectorHistoryPage() {
  const [rows, setRows] = useState<CompletedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState<string>(currentMonth());
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewing, setViewing] = useState<CompletedTransaction | null>(null);

  async function handleSearch() {
    setLoading(true);
    setHasSearched(true);
    setCurrentPage(1);
    try {
      const data = await clientService.listAllHistory({
        search: search || undefined,
        ...monthToDateRange(month),
      });
      setRows(data);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load completed transactions', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  // Load on mount, then re-filter as the month or search changes (search debounced).
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
  }, [search, month]);

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
        Read-only oversight of all completed transactions system-wide.
      </p>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body p-3">
          <div className="d-flex gap-3 flex-wrap align-items-end">
            <div>
              <label htmlFor="pacu-director-month" className="form-label mb-1" style={{ fontSize: '0.85rem' }}>Month</label>
              <input
                id="pacu-director-month"
                type="month"
                className="form-control"
                style={{ maxWidth: 200 }}
                value={month}
                max={currentMonth()}
                onChange={(e) => setMonth(e.target.value || currentMonth())}
              />
            </div>
            <div style={{ flex: '1 1 220px', maxWidth: 320 }}>
              <label className="form-label mb-1" style={{ fontSize: '0.85rem' }}>Search by Client Name or Company</label>
              <div className="position-relative">
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
                    title="Clear search"
                    onClick={() => setSearch('')}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
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
                  <th className="text-end pe-4">Actions</th>
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
                    <td className="text-end pe-4">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
                        onClick={() => setViewing(row)}
                        title="View Transaction"
                      >
                        <i className="bi bi-eye" />
                        View
                      </button>
                    </td>
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
                <label htmlFor="pacu-director-history-page-size" className="text-muted mb-0">Rows per page</label>
                <select
                  id="pacu-director-history-page-size"
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

      {viewing && (
        <TransactionViewModal
          transaction={viewing}
          onClose={() => setViewing(null)}
          loadIssues={clientService.getCompletedIssues}
        />
      )}
    </div>
  );
}
