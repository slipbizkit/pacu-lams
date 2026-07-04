import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import type { Client } from '../types/client';
import { ConsultationModal } from '../components/ConsultationModal';

function isPriority(c: Client) {
  return c.is_senior || c.is_pwd || c.is_pregnant;
}

export default function MyClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingNext, setTakingNext] = useState(false);
  const [activeClient, setActiveClient] = useState<Client | null>(null);

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
      Swal.fire({ icon: 'success', title: `Claimed ${claimed.first_name} ${claimed.last_name}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not claim next client', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setTakingNext(false);
    }
  }

  function handleSaved(updated: Client) {
    setActiveClient(null);
    if (updated.status === 'completed') {
      setClients((prev) => prev.filter((c) => c.client_id !== updated.client_id));
    } else {
      setClients((prev) => prev.map((c) => (c.client_id === updated.client_id ? updated : c)));
    }
  }

  return (
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
        <div className="row g-3">
          {clients.map((c) => (
            <div key={c.client_id} className="col-md-6 col-lg-4">
              <div className="card h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="pacu-mono fw-semibold" style={{ fontSize: '0.85rem' }}>#{c.queue_number}</span>
                    {c.status === 'in_progress' ? (
                      <span className="pacu-badge">In Progress</span>
                    ) : (
                      <span className="pacu-badge">Assigned</span>
                    )}
                  </div>
                  <h6 className="fw-semibold mb-1">{c.first_name} {c.last_name}</h6>
                  {isPriority(c) && (
                    <div className="d-flex gap-1 mb-2 flex-wrap">
                      {c.is_senior && <span className="pacu-badge">Senior</span>}
                      {c.is_pwd && <span className="pacu-badge">PWD</span>}
                      {c.is_pregnant && <span className="pacu-badge">Pregnant</span>}
                    </div>
                  )}
                  <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                    {c.concern || 'No concern noted at intake.'}
                  </p>
                  <button className="btn btn-sm btn-primary w-100" onClick={() => setActiveClient(c)}>
                    Open
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeClient && (
        <ConsultationModal client={activeClient} onClose={() => setActiveClient(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
