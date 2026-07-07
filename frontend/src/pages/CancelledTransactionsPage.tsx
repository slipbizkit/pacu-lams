import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import type { Client } from '../types/client';

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CancelledTransactionsPage() {
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  async function handleSearch() {
    setLoading(true);
    setHasSearched(true);
    setCurrentPage(1);
    try {
      const data = await clientService.listCancelled({ search: search || undefined });
      setRows(data);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load cancelled transactions', text: err instanceof Error ? err.message : 'Please try again' });
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
  }, [search]);

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
        <h1 className="pacu-display mb-0">Cancelled Transactions</h1>
      </div>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
        Transactions you claimed from the queue but cancelled before completion.
      </p>

      <div className="card mb-4">
        <div className="card-body p-3">
          <label className="form-label mb-1" style={{ fontSize: '0.85rem' }}>Search by Client Name</label>
          <div className="position-relative" style={{ width: '100%', maxWidth: 320 }}>
            <i
              className="bi bi-search position-absolute text-muted"
              style={{ left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}
            />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: 34, paddingRight: search ? 34 : undefined }}
              placeholder="Client name…"
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

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : !hasSearched ? null : rows.length === 0 ? (
        <div className="card">
          <div className="card-body p-5 text-center text-muted">
            <i className="bi bi-inbox fs-2 d-block mb-2" />
            No cancelled transactions found.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th className="ps-4">Encode Date & Time</th>
                  <th>Client Name</th>
                  <th>Company Name</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.client_id}>
                    <td className="ps-4" style={{ whiteSpace: 'nowrap' }}>
                      {fmtDateTime(row.created_at)}
                    </td>
                    <td>
                      {row.first_name} {row.last_name}
                      {(row.is_senior || row.is_pwd || row.is_pregnant) && (
                        <span className="ms-1 pacu-badge" style={{ fontSize: '0.65rem' }}>Priority</span>
                      )}
                    </td>
                    <td className="text-muted">
                      {row.employer || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td className="text-muted">
                      {row.cancellation_reason || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="card-footer d-flex flex-wrap align-items-center justify-content-between gap-3 py-2 px-4"
            style={{ fontSize: '0.8rem' }}
          >
            <span className="text-muted">
              Showing {startIdx + 1}–{Math.min(startIdx + pageSize, rows.length)} of {rows.length} transaction
              {rows.length !== 1 ? 's' : ''}
            </span>

            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="pacu-cancelled-page-size" className="text-muted mb-0">Rows per page</label>
                <select
                  id="pacu-cancelled-page-size"
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
                <nav aria-label="Cancelled transactions pagination">
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button type="button" className="page-link" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} aria-label="First page">
                        <i className="bi bi-chevron-bar-left" />
                      </button>
                    </li>
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button type="button" className="page-link" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label="Previous page">
                        <i className="bi bi-chevron-left" />
                      </button>
                    </li>
                    {pageNumbers.map((n) => (
                      <li key={n} className={`page-item ${n === currentPage ? 'active' : ''}`}>
                        <button type="button" className="page-link" onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>
                          {n}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button type="button" className="page-link" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} aria-label="Next page">
                        <i className="bi bi-chevron-right" />
                      </button>
                    </li>
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button type="button" className="page-link" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} aria-label="Last page">
                        <i className="bi bi-chevron-bar-right" />
                      </button>
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
