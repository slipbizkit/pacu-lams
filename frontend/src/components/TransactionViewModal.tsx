import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import type { CompletedTransaction, IssueTag } from '../types/client';

interface TransactionViewModalProps {
  transaction: CompletedTransaction;
  onClose: () => void;
}

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

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="pacu-eyebrow mb-1" style={{ fontSize: '0.65rem' }}>{label}</p>
      <p className="mb-0" style={{ fontSize: '0.9rem' }}>{value || '—'}</p>
    </div>
  );
}

export function TransactionViewModal({ transaction: tx, onClose }: TransactionViewModalProps) {
  const [issues, setIssues] = useState<IssueTag[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    clientService.getMine(tx.client_id)
      .then(({ issues: i }) => setIssues(i))
      .catch((err) => {
        Swal.fire({ icon: 'error', title: 'Could not load issue details', text: err instanceof Error ? err.message : 'Please try again' });
      })
      .finally(() => setLoadingIssues(false));
  }, [tx.client_id]);

  const fullName = [tx.first_name, tx.middle_name, tx.last_name, tx.suffix].filter(Boolean).join(' ');
  const priorityLabels = [
    tx.is_senior && 'Senior Citizen',
    tx.is_pwd && 'Person with Disability',
    tx.is_pregnant && 'Pregnant',
  ].filter(Boolean) as string[];

  const civilStatusLabel: Record<string, string> = {
    single: 'Single', married: 'Married', widowed: 'Widowed',
    separated: 'Separated', divorced: 'Divorced',
  };

  return (
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title pacu-display">Transaction Details</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  {fullName} &middot; Queue #{tx.queue_number} &middot;{' '}
                  <span className="pacu-mono">{tx.reference_no}</span>
                </p>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>

            <div className="modal-body">
              {/* Transaction Info */}
              <div className="mb-4 p-3 d-flex gap-4 flex-wrap" style={{ backgroundColor: 'var(--pacu-bg)', borderRadius: 'var(--pacu-radius)' }}>
                <Field label="Intake Date" value={fmtDate(tx.transaction_date)} />
                <Field label="Completion Date" value={fmtDateTime(tx.updated_at)} />
                <Field label="Reference No." value={tx.reference_no} />
                <Field label="Queue No." value={String(tx.queue_number)} />
              </div>

              {/* Priority */}
              {priorityLabels.length > 0 && (
                <div className="mb-4">
                  <p className="pacu-eyebrow mb-2">Priority</p>
                  <div className="d-flex gap-1 flex-wrap">
                    {priorityLabels.map((l) => (
                      <span key={l} className="pacu-badge">{l}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Information */}
              <p className="pacu-eyebrow mb-3">Client Information</p>
              <div className="row g-3 mb-4">
                <div className="col-12"><Field label="Full Name" value={fullName} /></div>
                <div className="col-md-4"><Field label="Sex" value={tx.sex ? tx.sex.charAt(0).toUpperCase() + tx.sex.slice(1) : null} /></div>
                <div className="col-md-4"><Field label="Date of Birth" value={fmtDate(tx.birth_date)} /></div>
                <div className="col-md-4"><Field label="Civil Status" value={tx.civil_status ? civilStatusLabel[tx.civil_status] : null} /></div>
                <div className="col-md-6"><Field label="Contact No." value={tx.contact_no} /></div>
                <div className="col-md-6"><Field label="Email" value={tx.email} /></div>
                <div className="col-md-6"><Field label="Address" value={tx.address} /></div>
                <div className="col-md-3"><Field label="City" value={tx.city} /></div>
                <div className="col-md-3"><Field label="Province" value={tx.province} /></div>
              </div>

              {/* Employment */}
              <p className="pacu-eyebrow mb-3">Employment</p>
              <div className="row g-3 mb-4">
                <div className="col-md-6"><Field label="Occupation" value={tx.occupation} /></div>
                <div className="col-md-6"><Field label="Company / Employer" value={tx.employer} /></div>
              </div>

              {/* Stated Concern */}
              {tx.concern && (
                <>
                  <p className="pacu-eyebrow mb-2">Client's Stated Concern</p>
                  <div className="mb-4 p-3" style={{ backgroundColor: 'var(--pacu-bg)', borderRadius: 'var(--pacu-radius)', fontSize: '0.9rem' }}>
                    {tx.concern}
                  </div>
                </>
              )}

              {/* Issue Categories */}
              <p className="pacu-eyebrow mb-2">Issue Categories</p>
              <div className="mb-4">
                {loadingIssues ? (
                  <span className="spinner-border spinner-border-sm text-primary" />
                ) : issues.length === 0 ? (
                  <span className="text-muted" style={{ fontSize: '0.9rem' }}>None recorded</span>
                ) : (
                  <div className="d-flex flex-wrap gap-1">
                    {issues.map((i) => (
                      <span
                        key={i.category_id}
                        className="d-inline-flex align-items-center"
                        style={{
                          padding: '3px 10px',
                          borderRadius: 'var(--pacu-radius-sm)',
                          backgroundColor: 'var(--pacu-accent-soft)',
                          color: 'var(--pacu-accent)',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                        }}
                      >
                        {i.category_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Legal Advice */}
              <p className="pacu-eyebrow mb-2">Legal Advice</p>
              <div className="mb-4 p-3" style={{ backgroundColor: 'var(--pacu-bg)', borderRadius: 'var(--pacu-radius)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', minHeight: 60 }}>
                {tx.legal_advice || <span className="text-muted">None recorded</span>}
              </div>

              {/* Referral */}
              {tx.referred_office_id && (
                <>
                  <p className="pacu-eyebrow mb-3">Referral</p>
                  <div className="row g-3 mb-4">
                    <div className="col-md-5"><Field label="Referred Office" value={tx.referred_office_name} /></div>
                    <div className="col-md-7"><Field label="Reason for Referral" value={tx.referred_reason} /></div>
                  </div>
                </>
              )}

              {/* Client Feedback */}
              {tx.feedback_rating != null && (
                <>
                  <p className="pacu-eyebrow mb-3">Client Feedback</p>
                  <div className="mb-4 p-3" style={{ backgroundColor: 'var(--pacu-bg)', borderRadius: 'var(--pacu-radius)' }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>Rating:</span>
                      <span style={{ color: 'var(--pacu-accent)', fontSize: '1.1rem', letterSpacing: 1 }}>
                        {'★'.repeat(tx.feedback_rating)}{'☆'.repeat(5 - tx.feedback_rating)}
                      </span>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>({tx.feedback_rating}/5)</span>
                    </div>
                    {tx.feedback_comments && (
                      <p className="mb-0" style={{ fontSize: '0.9rem' }}>{tx.feedback_comments}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
