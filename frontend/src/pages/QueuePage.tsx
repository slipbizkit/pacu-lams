import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService, userService } from '../services/api';
import type { Client, LawyerOption } from '../types/client';

function isPriority(c: Client) {
  return c.is_senior || c.is_pwd || c.is_pregnant;
}

function priorityLabels(c: Client) {
  const labels: string[] = [];
  if (c.is_senior) labels.push('Senior');
  if (c.is_pwd) labels.push('PWD');
  if (c.is_pregnant) labels.push('Pregnant');
  return labels;
}

export default function QueuePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [lawyers, setLawyers] = useState<LawyerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [queue, lawyerList] = await Promise.all([clientService.listQueue(), userService.listLawyers()]);
      setClients(queue);
      setLawyers(lawyerList);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load the queue', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const hasPriorityWaiting = clients.some(isPriority);

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
        <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>
          <i className="bi bi-arrow-clockwise me-1" />
          Refresh
        </button>
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
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th className="ps-4">Queue #</th>
                  <th>Name</th>
                  <th>Priority</th>
                  <th>Concern</th>
                  <th className="text-end pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const priority = isPriority(c);
                  const blocked = hasPriorityWaiting && !priority;
                  return (
                    <tr key={c.client_id}>
                      <td className="ps-4">
                        <span className="pacu-mono fw-semibold">{c.queue_number}</span>
                      </td>
                      <td>
                        {c.first_name} {c.last_name}
                      </td>
                      <td>
                        {priority ? (
                          <div className="d-flex gap-1 flex-wrap">
                            {priorityLabels(c).map((label) => (
                              <span key={label} className="pacu-badge">{label}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">&mdash;</span>
                        )}
                      </td>
                      <td className="text-muted" style={{ maxWidth: 280 }}>
                        <div className="text-truncate">{c.concern || '—'}</div>
                      </td>
                      <td className="text-end pe-4">
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={blocked || assigningId === c.client_id}
                          title={blocked ? 'Priority clients must be assigned first' : undefined}
                          onClick={() => handleAssign(c)}
                        >
                          {assigningId === c.client_id ? <span className="spinner-border spinner-border-sm" /> : 'Assign'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
