import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import { TransactionViewModal } from '../components/TransactionViewModal';
import type { CompletedTransaction, IssueTag } from '../types/client';

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const DROPDOWN_MENU_WIDTH = 180;
const DROPDOWN_MENU_HEIGHT = 88; // two-item menu

// Three-dot action dropdown — one rendered at a time via shared open state.
// Rendered through a portal into document.body and positioned with `fixed`
// coordinates measured from the trigger button, so it always renders above
// the table instead of being clipped by .table-responsive's overflow.
interface ActionsDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onView: () => void;
  onSendEmail: () => void;
}

function ActionsDropdown({ isOpen, onToggle, onClose, onView, onSendEmail }: ActionsDropdownProps) {
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
            <li>
              <button
                type="button"
                className="dropdown-item d-flex align-items-center gap-2"
                onClick={() => { onClose(); onSendEmail(); }}
              >
                <i className="bi bi-envelope" />
                Send Summary Email
              </button>
            </li>
          </ul>,
          document.body
        )}
    </div>
  );
}

async function showIssuesSwal(row: CompletedTransaction) {
  let issues: IssueTag[];
  try {
    const detail = await clientService.getMine(row.client_id);
    issues = detail.issues as IssueTag[];
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Could not load issues', text: err instanceof Error ? err.message : 'Please try again' });
    return;
  }

  if (issues.length === 0) {
    Swal.fire({ icon: 'info', title: 'Issues', text: 'No issues recorded for this transaction.' });
    return;
  }

  const grouped = new Map<string, string[]>();
  for (const i of issues) {
    if (!grouped.has(i.category_group)) grouped.set(i.category_group, []);
    grouped.get(i.category_group)!.push(i.category_name);
  }

  const sections = Array.from(grouped.entries()).map(([group, names]) => `
    <div style="margin-bottom:0.75rem">
      <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--pacu-accent);padding:0.35rem 0 0.25rem;border-bottom:2px solid var(--pacu-accent)">${group}</div>
      ${names.map((name) => `<div style="font-size:0.9rem;padding:0.3rem 0 0.3rem 0.5rem;border-bottom:1px solid var(--pacu-border)">${name}</div>`).join('')}
    </div>
  `).join('');

  await Swal.fire({
    title: 'Issues',
    html: `<div style="text-align:left">${sections}</div>`,
    confirmButtonText: 'Close',
    confirmButtonColor: 'var(--pacu-accent)',
  });
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

  async function handleSendEmail(row: CompletedTransaction) {
    if (!row.email) {
      Swal.fire({
        icon: 'info',
        title: 'No email address',
        text: 'This client did not provide an email address.',
      });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Send consultation summary?',
      html: `An email with the legal advice will be sent to <strong>${row.email}</strong>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Send',
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'var(--pacu-accent)',
    });
    if (!confirm.isConfirmed) return;

    // Cycling filler phrases keep the overlay lively while the request is in flight.
    const phrases = [
      'Filling up the template…',
      'Preparing the consultation summary…',
      'Attaching the legal advice…',
      'Contacting the mail server…',
      `Sending to ${row.email}…`,
    ];
    let phraseIdx = 0;
    let phraseTimer: ReturnType<typeof setInterval> | undefined;
    // Firing the toast while the loading modal is open updates it in place rather
    // than closing it, so willClose never fires. Stop the cycling explicitly before
    // the toast, otherwise the filler phrases overwrite the "Email sent" title.
    const stopPhrases = () => {
      if (phraseTimer) { clearInterval(phraseTimer); phraseTimer = undefined; }
    };

    Swal.fire({
      title: phrases[0],
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
        phraseTimer = setInterval(() => {
          // Advance through the phrases once, then hold on the last
          // ("Sending to …") until the toast pops — never loop back.
          if (phraseIdx >= phrases.length - 1) {
            stopPhrases();
            return;
          }
          phraseIdx += 1;
          const titleEl = Swal.getTitle();
          if (titleEl) titleEl.textContent = phrases[phraseIdx];
        }, 900);
      },
      willClose: stopPhrases,
    });

    // Keep the overlay up long enough for the phrases to read as real work,
    // even when Resend responds almost instantly.
    const minDisplay = new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      const [result] = await Promise.all([clientService.sendEmail(row.client_id), minDisplay]);
      stopPhrases();
      setRows((prev) =>
        prev.map((r) => r.client_id === row.client_id ? { ...r, email_sent_at: result.email_sent_at } : r)
      );
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Email sent',
        showConfirmButton: false,
        timer: 3000,
      });
    } catch (err) {
      stopPhrases();
      Swal.fire({ icon: 'error', title: 'Failed to send email', text: err instanceof Error ? err.message : 'Please try again' });
    }
  }

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
            <table className="table mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th className="ps-4">Completion Date</th>
                  <th>Queue No.</th>
                  <th>Client Name</th>
                  <th>Company</th>
                  <th>Issues</th>
                  <th>Email</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.client_id}>
                    <td className="ps-4" style={{ whiteSpace: 'nowrap' }}>
                      {row.completed_at ? fmtDate(row.completed_at) : '—'}
                    </td>
                    <td>
                      <span className="pacu-mono fw-semibold">{row.queue_number}</span>
                    </td>
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
                      {row.employer || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ maxWidth: 240 }}>
                      {row.issue_categories ? (
                        <button
                          type="button"
                          className="btn btn-link p-0 text-start text-truncate d-block"
                          style={{ fontSize: '0.8rem', maxWidth: '100%', textDecoration: 'underline dotted' }}
                          onClick={() => showIssuesSwal(row)}
                        >
                          {row.issue_categories}
                        </button>
                      ) : (
                        <span style={{ opacity: 0.4 }}>—</span>
                      )}
                    </td>
                    <td>
                      {!row.email ? (
                        <span className="text-muted" style={{ opacity: 0.35 }} title="No email on file">
                          <i className="bi bi-envelope-slash" />
                        </span>
                      ) : row.email_sent_at ? (
                        <span className="text-success" title={`Sent ${fmtDate(row.email_sent_at)}`}>
                          <i className="bi bi-envelope-check-fill" />
                        </span>
                      ) : (
                        <span className="text-muted" title="Not yet sent">
                          <i className="bi bi-envelope" />
                        </span>
                      )}
                    </td>
                    <td className="text-end pe-4" style={{ position: 'relative' }}>
                      <ActionsDropdown
                        isOpen={openDropdownId === row.client_id}
                        onToggle={() => setOpenDropdownId((prev) => (prev === row.client_id ? null : row.client_id))}
                        onClose={() => setOpenDropdownId(null)}
                        onView={() => setViewing(row)}
                        onSendEmail={() => handleSendEmail(row)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className="card-footer d-flex flex-wrap align-items-center justify-content-between gap-3 py-2 px-4"
            style={{ fontSize: '0.85rem' }}
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
