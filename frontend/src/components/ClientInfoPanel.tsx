import type { Client, ClientStatus, CityMunicipality } from '../types/client';

interface ClientInfoPanelProps {
  client: Client;
  cities: CityMunicipality[];
  lawyerName?: string;
}

const STATUS_LABELS: Record<ClientStatus, string> = {
  waiting: 'Waiting',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  incomplete: 'Incomplete',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function cityLabel(cities: CityMunicipality[], cityId: number | null): string {
  if (!cityId) return '—';
  const city = cities.find((c) => c.id === cityId);
  return city ? `${city.city_municipality}, ${city.province}` : '—';
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="pacu-detail-row">
      <span className="text-muted">{label}</span>
      <span className="fw-medium text-end">{value}</span>
    </div>
  );
}

export function ClientInfoPanel({ client, cities, lawyerName }: ClientInfoPanelProps) {
  const fullName = [client.first_name, client.middle_name, client.last_name, client.suffix].filter(Boolean).join(' ');
  const sexLabel = client.sex ? client.sex.charAt(0).toUpperCase() + client.sex.slice(1) : '—';
  const unionLabel = client.union_member === null ? '—' : client.union_member ? 'Yes' : 'No';

  return (
    <div className="pacu-client-panel">
      <div className="card mb-3">
        <div className="card-body p-4">
          <p className="pacu-eyebrow mb-3">Client Information</p>
          <DetailRow label="Queue Number" value={`#${client.queue_number}`} />
          <DetailRow label="Full Name" value={fullName || '—'} />
          <DetailRow label="Sex" value={sexLabel} />
          <DetailRow label="Contact Number" value={client.contact_no || '—'} />
          <DetailRow label="Email" value={client.email || '—'} />
          <DetailRow label="Address" value={cityLabel(cities, client.city_id)} />
          <DetailRow label="Work Position" value={client.occupation || '—'} />
          <DetailRow label="Date of Employment" value={fmtDate(client.date_of_employment)} />
          <DetailRow label="Union Membership" value={unionLabel} />
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body p-4">
          <p className="pacu-eyebrow mb-3">Company Information</p>
          <DetailRow label="Company Name" value={client.employer || '—'} />
          <DetailRow label="Company Address" value={cityLabel(cities, client.company_city_id)} />
          <div className="pacu-detail-row pacu-detail-row-stacked">
            <span className="text-muted">Pending Labor Complaint/Case</span>
            {client.pending_complaint_types && client.pending_complaint_types.length > 0 ? (
              <div className="d-flex flex-wrap gap-1 mt-1">
                {client.pending_complaint_types.map((t) => (
                  <span key={t} className="pacu-badge">{t}</span>
                ))}
              </div>
            ) : (
              <span className="fw-medium">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-4">
          <p className="pacu-eyebrow mb-3">Transaction Details</p>
          <DetailRow label="Date Created" value={fmtDateTime(client.created_at)} />
          <DetailRow label="Intake Date" value={fmtDate(client.transaction_date)} />
          {lawyerName && <DetailRow label="Current Lawyer" value={lawyerName} />}
          <DetailRow label="Current Status" value={STATUS_LABELS[client.status]} />
        </div>
      </div>
    </div>
  );
}
