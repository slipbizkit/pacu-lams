import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { clientService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Client, LawyerOption } from '../types/client';

function isPriority(c: Client) {
  return c.is_senior || c.is_pwd || c.is_pregnant;
}

function formatDateEncoded(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const REMOVE_REASONS = [
  { value: 'Client Left the Office', description: 'Client left before being served.' },
  { value: 'Client Requested Cancellation', description: 'Client no longer wishes to proceed.' },
  { value: 'Duplicate Entry', description: 'Duplicate or accidental queue registration.' },
  { value: 'Client Did Not Respond When Called', description: 'Client was called but did not respond after reasonable attempts.' },
];

export default function QueuePage() {
  const { role } = useAuth();
  const canAssign = role === 'admin';
  const canRemove = role === 'support_staff' || role === 'personnel' || role === 'admin';

  const [clients, setClients] = useState<Client[]>([]);
  const [lawyers, setLawyers] = useState<LawyerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingNext, setTakingNext] = useState(false);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [countdown, setCountdown] = useState(60);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const openMenuClientRef = useRef<Client | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [queue, lawyerList] = await Promise.all([
        clientService.listQueue(),
        canAssign ? userService.listLawyers() : Promise.resolve([]),
      ]);
      setClients(queue);
      setLawyers(lawyerList);
      setPage(1);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load the queue', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          load();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hasPriorityWaiting = clients.some(isPriority);

  const sorted = useMemo(() => [...clients].sort((a, b) => {
    const dateA = a.created_at.slice(0, 10);
    const dateB = b.created_at.slice(0, 10);
    if (dateA !== dateB) return dateA < dateB ? -1 : 1;
    const prioA = isPriority(a) ? 0 : 1;
    const prioB = isPriority(b) ? 0 : 1;
    if (prioA !== prioB) return prioA - prioB;
    return a.queue_number - b.queue_number;
  }), [clients]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const startIdx = (page - 1) * pageSize;
  const paginated = sorted.slice(startIdx, startIdx + pageSize);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    const nums: number[] = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [page, totalPages]);

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
      setClients((prev) => prev.filter((c) => c.client_id !== claimed.client_id));
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

  useEffect(() => {
    if (openMenuId === null) return;
    function close() { setOpenMenuId(null); }
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('scroll', close, true);
    };
  }, [openMenuId]);

  function toggleMenu(e: React.MouseEvent<HTMLButtonElement>, client: Client) {
    e.stopPropagation();
    if (openMenuId === client.client_id) { setOpenMenuId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    openMenuClientRef.current = client;
    setOpenMenuId(client.client_id);
  }

  async function handleRemove(client: Client) {
    const { value: reason, isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: 'Remove Client from Queue?',
      html: `
        <p style="text-align:left;margin-bottom:0.75rem;font-size:0.9rem">This client will be removed from today's queue and will no longer be available for assignment.</p>
        <select id="pacu-remove-reason" class="form-select">
          <option value="">Select a reason…</option>
          ${REMOVE_REASONS.map((r) => `<option value="${r.value}">${r.value}</option>`).join('')}
        </select>
        <p id="pacu-remove-desc" style="text-align:left;margin-top:0.6rem;font-size:0.82rem;color:var(--bs-secondary-color);min-height:1.2em"></p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Remove from Queue',
      confirmButtonColor: 'var(--bs-danger)',
      cancelButtonText: 'Cancel',
      didOpen: () => {
        const select = document.getElementById('pacu-remove-reason') as HTMLSelectElement;
        const desc = document.getElementById('pacu-remove-desc') as HTMLParagraphElement;
        select.addEventListener('change', () => {
          const found = REMOVE_REASONS.find((r) => r.value === select.value);
          desc.textContent = found?.description ?? '';
        });
      },
      preConfirm: () => {
        const select = document.getElementById('pacu-remove-reason') as HTMLSelectElement;
        if (!select.value) {
          Swal.showValidationMessage('Please select a reason.');
          return false;
        }
        return select.value;
      },
    });

    if (!isConfirmed || !reason) return;

    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      html: `<strong>${client.first_name} ${client.last_name}</strong> will be removed from the queue.<br><br>Reason: <em>${reason}</em>`,
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove',
      confirmButtonColor: 'var(--bs-danger)',
      cancelButtonText: 'Go Back',
    });
    if (!confirm.isConfirmed) return;

    setRemovingId(client.client_id);
    try {
      await clientService.removeFromQueue(client.client_id, reason as string);
      Swal.fire({ icon: 'success', title: 'Removed from queue', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
      setClients((prev) => prev.filter((c) => c.client_id !== client.client_id));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not remove client', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setRemovingId(null);
    }
  }

  async function handleAssign(client: Client) {
    if (lawyers.length === 0) {
      Swal.fire({ icon: 'error', title: 'No active lawyers available', text: 'Ask an administrator to activate a lawyer account first.' });
      return;
    }

    const { value: lawyerId } = await Swal.fire({
      title: `Assign ${client.first_name} ${client.last_name}`,
      input: 'select',
      inputOptions: Object.fromEntries(lawyers.map((l) => [l.user_id, `${l.first_name} ${l.last_name}`])),
      inputPlaceholder: 'Select a lawyer',
      showCancelButton: true,
      confirmButtonText: 'Assign',
      inputValidator: (value) => (!value ? 'Please select a lawyer' : undefined),
    });

    if (!lawyerId) return;

    setAssigningId(client.client_id);
    try {
      await clientService.assign(client.client_id, Number(lawyerId));
      Swal.fire({ icon: 'success', title: 'Assigned', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
      setClients((prev) => prev.filter((c) => c.client_id !== client.client_id));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not assign', text: err instanceof Error ? err.message : 'Please try again' });
      load();
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <h1 className="pacu-display mb-0">Queue</h1>
        <div className="d-flex align-items-center gap-3">
          {role === 'lawyer' && (
            <button className="btn btn-primary" onClick={handleTakeNext} disabled={takingNext}>
              {takingNext ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-plus-lg me-2" />}
              Take Next Client
            </button>
          )}
          <span style={{ fontSize: '0.85rem' }}>
            Automatically refreshes in: <span className="pacu-mono fw-semibold">{countdown}s</span>
          </span>
        </div>
      </div>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
        Clients waiting to be assigned to a lawyer, priority clients first.
      </p>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : clients.length === 0 ? (
        <div className="card">
          <div className="card-body p-5 text-center text-muted">
            <i className="bi bi-check2-circle fs-2 d-block mb-2" />
            No one is waiting right now.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table mb-0 align-middle" style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th className="ps-4" style={{ width: '1%', whiteSpace: 'nowrap' }}>Queue #</th>
                  <th>Client's Name</th>
                  <th>Company</th>
                  <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Client Type</th>
                  <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Date Encoded</th>
                  {(canAssign || canRemove) && <th className="text-end pe-4" style={{ width: '1%', whiteSpace: 'nowrap' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => {
                  const priority = isPriority(c);
                  const blocked = hasPriorityWaiting && !priority;
                  const stale = !isToday(c.created_at);
                  return (
                    <tr key={c.client_id} style={(stale ? { '--bs-table-color': 'var(--bs-danger)' } : priority ? { '--bs-table-color': 'var(--bs-success)' } : undefined) as unknown as React.CSSProperties}>
                      <td className="ps-4">
                        <span className="pacu-mono fw-semibold">{c.queue_number}</span>
                      </td>
                      <td>
                        <span className="d-flex align-items-center gap-2">
                          {c.is_anonymous
                            ? <><i className="bi bi-incognito text-muted" /><span className="text-muted fst-italic">Anonymous</span></>
                            : <>{c.first_name} {c.last_name}</>
                          }
                        </span>
                      </td>
                      <td>
                        {c.employer || <span>&mdash;</span>}
                      </td>
                      <td>
                        {priority ? (
                          <span className={stale ? 'fw-semibold' : 'text-success fw-semibold'}>Priority</span>
                        ) : (
                          <span className={stale ? '' : 'text-muted'}>Regular</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatDateEncoded(c.created_at)}
                        {stale && (
                          <span className="badge bg-danger ms-2" style={{ fontSize: '0.7rem', fontWeight: 500 }}>
                            Recommended for Cancellation
                          </span>
                        )}
                      </td>
                      {(canAssign || canRemove) && (
                        <td className="text-end pe-4">
                          {canAssign ? (
                            <div className="d-flex gap-2 justify-content-end">
                              <button
                                className="btn btn-sm btn-primary"
                                disabled={blocked || assigningId === c.client_id || removingId === c.client_id}
                                title={blocked ? 'Priority clients must be assigned first' : undefined}
                                onClick={() => handleAssign(c)}
                              >
                                {assigningId === c.client_id ? <span className="spinner-border spinner-border-sm" /> : 'Assign'}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                                disabled={removingId === c.client_id || assigningId === c.client_id}
                                onClick={() => handleRemove(c)}
                              >
                                {removingId === c.client_id ? <span className="spinner-border spinner-border-sm" /> : 'Cancel'}
                              </button>
                            </div>
                          ) : (
                            <div>
                              <button
                                type="button"
                                className="btn btn-sm btn-light"
                                disabled={removingId === c.client_id}
                                style={{ lineHeight: 1 }}
                                onClick={(e) => toggleMenu(e, c)}
                              >
                                {removingId === c.client_id
                                  ? <span className="spinner-border spinner-border-sm" />
                                  : <i className="bi bi-three-dots" />}
                              </button>
                              {openMenuId === c.client_id && createPortal(
                                <ul
                                  className="dropdown-menu show shadow-sm"
                                  style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999, minWidth: 200 }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <li>
                                    <button
                                      type="button"
                                      className="dropdown-item d-flex align-items-center gap-2 text-danger"
                                      onClick={() => { setOpenMenuId(null); handleRemove(openMenuClientRef.current!); }}
                                    >
                                      <i className="bi bi-person-x" />
                                      Remove from Queue
                                    </button>
                                  </li>
                                </ul>,
                                document.body
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
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
                <label htmlFor="pacu-queue-page-size" className="text-muted mb-0">Rows per page</label>
                <select
                  id="pacu-queue-page-size"
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>
              {totalPages > 1 && (
                <nav aria-label="Queue pagination">
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button type="button" className="page-link" onClick={() => setPage(1)} disabled={page === 1} aria-label="First page">
                        <i className="bi bi-chevron-bar-left" />
                      </button>
                    </li>
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button type="button" className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">
                        <i className="bi bi-chevron-left" />
                      </button>
                    </li>
                    {pageNumbers.map((n) => (
                      <li key={n} className={`page-item ${n === page ? 'active' : ''}`}>
                        <button type="button" className="page-link" onClick={() => setPage(n)} aria-current={n === page ? 'page' : undefined}>
                          {n}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                      <button type="button" className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page">
                        <i className="bi bi-chevron-right" />
                      </button>
                    </li>
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                      <button type="button" className="page-link" onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="Last page">
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
