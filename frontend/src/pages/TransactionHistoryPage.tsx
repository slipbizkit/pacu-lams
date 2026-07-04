import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import { TransactionViewModal } from '../components/TransactionViewModal';
import type { CompletedTransaction } from '../types/client';

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const DROPDOWN_MENU_WIDTH = 160;
const DROPDOWN_MENU_HEIGHT = 44; // single-item menu

// Three-dot action dropdown — one rendered at a time via shared open state.
// Rendered through a portal into document.body and positioned with `fixed`
// coordinates measured from the trigger button, so it always renders above
// the table instead of being clipped by .table-responsive's overflow.
interface ActionsDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onView: () => void;
}

function ActionsDropdown({ isOpen, onToggle, onClose, onView }: ActionsDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function measure() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < DROPDOWN_MENU_HEIGHT + 8 ? rect.top - DROPDOWN_MENU_HEIGHT - 4 : rect.bottom + 4;
    const left = Math.max(8, rect.right - DROPDOWN_MENU_WIDTH);
    setPos({ top, left });
  }

  function handleToggle() {
    if (!isOpen) measure();
    onToggle();
  }

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) onClose();
    }
    // Reposition is non-trivial while scrolling/resizing — closing keeps the
    // menu from drifting away from the row it belongs to.
    function handleDismiss() {
      onClose();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [isOpen, onClose]);

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Actions"
      >
        <i className="bi bi-three-dots" />
      </button>
      {isOpen && pos &&
        createPortal(
          <ul
            ref={menuRef}
            className="dropdown-menu show"
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1070, minWidth: DROPDOWN_MENU_WIDTH }}
          >
            <li>
              <button
                type="button"
                className="dropdown-item d-flex align-items-center gap-2"
                onClick={() => { onClose(); onView(); }}
              >
                <i className="bi bi-eye" />
                View Transaction
              </button>
            </li>
          </ul>,
          document.body
        )}
    </div>
  );
}

export default function TransactionHistoryPage() {
  const [rows, setRows] = useState<CompletedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [search, setSearch] = useState('');

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<CompletedTransaction | null>(null);

  async function handleSearch() {
    setLoading(true);
    setHasSearched(true);
    setOpenDropdownId(null);
    setCurrentPage(1);
    try {
      const data = await clientService.listHistory({ search: search || undefined });
      setRows(data);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load history', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  // Load on mount, then re-filter as the user types (debounced) — no explicit
  // search button, mirroring the removal of the From/To Date filters.
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

  // Client-side pagination over the already-fetched, already-filtered rows —
  // the backend returns the full search result set in one call, so slicing
  // here avoids adding limit/offset plumbing for what's typically a small
  // per-lawyer history.
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
        Completed transactions you have personally handled.
      </p>

      {/* Search */}
      <div className="card mb-4">
        <div className="card-body p-3">
          <label className="form-label mb-1" style={{ fontSize: '0.85rem' }}>Search by Client Name or Company</label>
          <div className="position-relative" style={{ width: '100%', maxWidth: 320 }}>
            <i
              className="bi bi-search position-absolute text-muted"
              style={{ left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}
            />
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
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th className="ps-4">Completion Date</th>
                  <th>Queue No.</th>
                  <th>Client Name</th>
                  <th>Company</th>
                  <th>Transaction Type</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.client_id}>
                    <td className="ps-4" style={{ whiteSpace: 'nowrap' }}>
                      {fmtDate(row.updated_at)}
                    </td>
                    <td>
                      <span className="pacu-mono fw-semibold">{row.queue_number}</span>
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
                    <td style={{ maxWidth: 240 }}>
                      {row.issue_categories ? (
                        <span className="text-truncate d-block" style={{ fontSize: '0.875rem' }}>{row.issue_categories}</span>
                      ) : row.referred_office_name ? (
                        <span className="text-muted" style={{ fontSize: '0.875rem' }}>Referral</span>
                      ) : (
                        <span style={{ opacity: 0.4 }}>—</span>
                      )}
                    </td>
                    <td className="text-end pe-4" style={{ position: 'relative' }}>
                      <ActionsDropdown
                        isOpen={openDropdownId === row.client_id}
                        onToggle={() => setOpenDropdownId((prev) => (prev === row.client_id ? null : row.client_id))}
                        onClose={() => setOpenDropdownId(null)}
                        onView={() => setViewing(row)}
                      />
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
                <label htmlFor="pacu-history-page-size" className="text-muted mb-0">Rows per page</label>
                <select
                  id="pacu-history-page-size"
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
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        aria-label="First page"
                      >
                        <i className="bi bi-chevron-bar-left" />
                      </button>
                    </li>
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                      >
                        <i className="bi bi-chevron-left" />
                      </button>
                    </li>
                    {pageNumbers.map((n) => (
                      <li key={n} className={`page-item ${n === currentPage ? 'active' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage(n)}
                          aria-current={n === currentPage ? 'page' : undefined}
                        >
                          {n}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                      >
                        <i className="bi bi-chevron-right" />
                      </button>
                    </li>
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        aria-label="Last page"
                      >
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

      {viewing && (
        <TransactionViewModal
          transaction={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
