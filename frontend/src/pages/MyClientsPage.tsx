import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { clientService, lookupService } from '../services/api';
import type { Client, CityMunicipality } from '../types/client';
import { ClientInfoPanel } from '../components/ClientInfoPanel';
import { CompleteTransactionPanel } from '../components/CompleteTransactionPanel';
import { useAuth } from '../context/AuthContext';

function isPriority(c: Client) {
  return c.is_senior || c.is_pwd || c.is_pregnant;
}

const CANCEL_REASONS = [
  { value: 'Client Left the Office', description: 'Client left before being served.' },
  { value: 'Client Requested Cancellation', description: 'Client no longer wishes to proceed.' },
  { value: 'Duplicate Entry', description: 'Duplicate or accidental queue registration.' },
  { value: 'Client Did Not Respond When Called', description: 'Client was called but did not respond after reasonable attempts.' },
];

export default function MyClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [cities, setCities] = useState<CityMunicipality[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingNext, setTakingNext] = useState(false);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [openDropdown, setOpenDropdown] = useState<{ id: number; top: number; right: number } | null>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    function closeAll(e: MouseEvent) {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return;
      setOpenDropdown(null);
    }
    document.addEventListener('click', closeAll);
    return () => document.removeEventListener('click', closeAll);
  }, []);

  const lawyerName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : undefined;

  useEffect(() => {
    if (activeClient) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activeClient]);

  async function load() {
    setLoading(true);
    try {
      setClients(await clientService.listMine());
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load your clients', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    lookupService.citiesMunicipalities().then(setCities).catch(() => {});
  }, []);

  async function handleTakeNext() {
    setTakingNext(true);
    try {
      const queue = await clientService.listQueue();
      if (queue.length === 0) {
        Swal.fire({ icon: 'info', title: 'No one is waiting right now' });
        return;
      }
      const next = queue[0];
      const claimed = await clientService.claim(next.client_id);
      setClients((prev) => [claimed, ...prev]);
      window.dispatchEvent(new Event('pacu:counts-changed'));
      Swal.fire({ icon: 'success', title: `Claimed ${claimed.first_name} ${claimed.last_name}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
    } catch (err) {
      if (err instanceof Error && err.message === 'LAWYER_IN_PROGRESS') {
        await Swal.fire({
          icon: 'warning',
          title: 'Cannot Accept Client',
          html: 'You already have a client that is currently <strong>In Progress</strong>.<br><br>Please complete or mark the current client as <strong>Incomplete</strong> before accepting another client from the queue.',
          confirmButtonText: 'OK',
          confirmButtonColor: 'var(--pacu-accent)',
        });
      } else {
        Swal.fire({ icon: 'error', title: 'Could not claim next client', text: err instanceof Error ? err.message : 'Please try again' });
      }
    } finally {
      setTakingNext(false);
    }
  }

  const sorted = useMemo(() => [...clients].sort((a, b) => {
    const rank = (s: string) => s === 'in_progress' ? 0 : 1;
    return rank(a.status) - rank(b.status);
  }), [clients]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = sorted.slice(startIdx, startIdx + pageSize);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    const nums: number[] = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [currentPage, totalPages]);

  async function handleCancelTransaction(client: Client) {
    const { value: reason, isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: 'Cancel Transaction',
      html: `
        <p style="text-align:left;margin-bottom:0.75rem;font-size:0.9rem">Select a reason for cancelling this transaction.</p>
        <select id="pacu-cancel-reason" class="form-select">
          <option value="">Select a reason…</option>
          ${CANCEL_REASONS.map((r) => `<option value="${r.value}">${r.value}</option>`).join('')}
        </select>
        <p id="pacu-cancel-desc" style="text-align:left;margin-top:0.6rem;font-size:0.82rem;color:var(--bs-secondary-color);min-height:1.2em"></p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cancel Transaction',
      confirmButtonColor: 'var(--bs-danger)',
      cancelButtonText: 'Go Back',
      didOpen: () => {
        const select = document.getElementById('pacu-cancel-reason') as HTMLSelectElement;
        const desc = document.getElementById('pacu-cancel-desc') as HTMLParagraphElement;
        select.addEventListener('change', () => {
          const found = CANCEL_REASONS.find((r) => r.value === select.value);
          desc.textContent = found?.description ?? '';
        });
      },
      preConfirm: () => {
        const select = document.getElementById('pacu-cancel-reason') as HTMLSelectElement;
        if (!select.value) {
          Swal.showValidationMessage('Please select a reason for cancellation.');
          return false;
        }
        return select.value;
      },
    });

    if (!isConfirmed || !reason) return;

    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      html: `This will cancel the transaction with reason: <strong>${reason}</strong>.<br><br>This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: 'Yes, Cancel Transaction',
      confirmButtonColor: 'var(--bs-danger)',
      cancelButtonText: 'Go Back',
    });
    if (!confirm.isConfirmed) return;

    try {
      const updated = await clientService.cancelTransaction(client.client_id, reason as string);
      Swal.fire({ icon: 'success', title: 'Transaction cancelled', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      window.dispatchEvent(new Event('pacu:counts-changed'));
      setClients((prev) => prev.filter((c) => c.client_id !== updated.client_id));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not cancel transaction', text: err instanceof Error ? err.message : 'Please try again' });
    }
  }

  function handleSaved(updated: Client) {
    setActiveClient(null);
    window.dispatchEvent(new Event('pacu:counts-changed'));
    if (updated.status === 'completed' || updated.status === 'cancelled') {
      setClients((prev) => prev.filter((c) => c.client_id !== updated.client_id));
    } else {
      setClients((prev) => prev.map((c) => (c.client_id === updated.client_id ? updated : c)));
    }
  }

  return (
    <>
      <div>
        <div className="d-flex align-items-center justify-content-between mb-1">
          <h1 className="pacu-display mb-0">My Clients</h1>
          <button className="btn btn-primary" onClick={handleTakeNext} disabled={takingNext}>
            {takingNext ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-plus-lg me-2" />}
            Take Next Client
          </button>
        </div>
        <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
          Clients assigned to you, including any transactions you saved as incomplete.
        </p>

        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        ) : clients.length === 0 ? (
          <div className="card">
            <div className="card-body p-5 text-center text-muted">
              <i className="bi bi-inbox fs-2 d-block mb-2" />
              No clients assigned yet. Take the next one from the queue when you're ready.
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="table-responsive">
              <table className="table mb-0 align-middle" style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th className="ps-4" style={{ width: '1%', whiteSpace: 'nowrap' }}>Queue #</th>
                    <th>Client Name</th>
                    <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Client Type</th>
                    <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Status</th>
                    <th className="text-end pe-4" style={{ width: '1%', whiteSpace: 'nowrap' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c) => (
                    <tr key={c.client_id}>
                      <td className="ps-4">
                        <span className="pacu-mono fw-semibold">#{c.queue_number}</span>
                      </td>
                      <td>
                        <span className="d-flex align-items-center gap-2">
                          {c.is_anonymous
                            ? <><i className="bi bi-incognito text-muted" /><span className="text-muted fst-italic">Anonymous</span></>
                            : <>{c.first_name} {c.last_name}</>}
                        </span>
                      </td>
                      <td>
                        {isPriority(c)
                          ? <span className="text-success fw-semibold">Priority</span>
                          : <span>Regular</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {c.status === 'incomplete'
                          ? <span className="pacu-badge pacu-badge--warning">Incomplete</span>
                          : <span className="pacu-badge">In Progress</span>}
                      </td>
                      <td className="text-end pe-4">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openDropdown?.id === c.client_id) { setOpenDropdown(null); return; }
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setOpenDropdown({ id: c.client_id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          }}
                        >
                          <i className="bi bi-three-dots-vertical" />
                        </button>
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
                Showing {clients.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, clients.length)} of {clients.length} client{clients.length !== 1 ? 's' : ''}
              </span>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <label htmlFor="pacu-myclients-page-size" className="text-muted mb-0">Rows per page</label>
                  <select
                    id="pacu-myclients-page-size"
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
                  <nav aria-label="My clients pagination">
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

      {/* Row dropdown — portalled to body so it escapes table-responsive overflow */}
      {openDropdown && createPortal(
        <ul
          ref={dropdownRef}
          className="dropdown-menu show"
          style={{ position: 'fixed', top: openDropdown.top, right: openDropdown.right, zIndex: 1055, minWidth: 140 }}
        >
          <li>
            <button
              className="dropdown-item"
              onClick={() => {
                const client = clients.find((c) => c.client_id === openDropdown.id) ?? null;
                setOpenDropdown(null);
                setActiveClient(client);
              }}
            >
              <i className="bi bi-folder2-open me-2" />Open
            </button>
          </li>
          <li><hr className="dropdown-divider" /></li>
          <li>
            <button
              className="dropdown-item text-danger"
              onClick={() => {
                const client = clients.find((c) => c.client_id === openDropdown.id) ?? null;
                setOpenDropdown(null);
                if (client) handleCancelTransaction(client);
              }}
            >
              <i className="bi bi-x-circle me-2" />Cancel Transaction
            </button>
          </li>
        </ul>,
        document.body
      )}

      {/* Client modal */}
      {activeClient && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveClient(null); }}
        >
          <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxWidth: 1200 }}>
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-semibold mb-0">{activeClient.first_name} {activeClient.last_name}</h5>
                  <div style={{ fontSize: '0.8rem' }}>Queue #{activeClient.queue_number}</div>
                </div>
                <button type="button" className="btn-close" onClick={() => setActiveClient(null)} />
              </div>
              <div className="modal-body p-4">
                <div className="row g-4">
                  <div className="col-lg-5">
                    <ClientInfoPanel client={activeClient} cities={cities} lawyerName={lawyerName} />
                  </div>
                  <div className="col-lg-7 d-flex flex-column">
                    <CompleteTransactionPanel
                      client={activeClient}
                      onCancel={() => setActiveClient(null)}
                      onSaved={handleSaved}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
