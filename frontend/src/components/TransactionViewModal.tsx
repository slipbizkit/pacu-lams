import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import { SQD_KEYS } from '../types/client';
import type { CompletedTransaction, IssueTag } from '../types/client';
import { SQD_STATEMENTS } from './FeedbackQuestions';

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
                <div className="col-md-4"><Field label="Contact No." value={tx.contact_no} /></div>
                <div className="col-md-4"><Field label="Email" value={tx.email} /></div>
                <div className="col-md-6"><Field label="City / Municipality" value={tx.city} /></div>
              </div>

              {/* Employment */}
              <p className="pacu-eyebrow mb-3">Employment</p>
              <div className="row g-3 mb-4">
                <div className="col-md-4"><Field label="Work Position" value={tx.occupation} /></div>
                <div className="col-md-4"><Field label="Date of Employment" value={fmtDate(tx.date_of_employment)} /></div>
                <div className="col-md-4"><Field label="Union Member" value={tx.union_member === null ? null : tx.union_member ? 'Yes' : 'No'} /></div>
              </div>

              {/* Company Details */}
              <p className="pacu-eyebrow mb-3">Company Details</p>
              <div className="row g-3 mb-4">
                <div className="col-md-6"><Field label="Company / Employer" value={tx.employer} /></div>
                <div className="col-md-6"><Field label="Company City / Municipality" value={tx.company_city} /></div>
                <div className="col-12">
                  <p className="pacu-eyebrow mb-1" style={{ fontSize: '0.65rem' }}>Pending Labor Complaint / Case</p>
                  {tx.pending_complaint_types && tx.pending_complaint_types.length > 0 ? (
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {tx.pending_complaint_types.map((t) => (
                        <span
                          key={t}
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
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-0" style={{ fontSize: '0.9rem' }}>—</p>
                  )}
                </div>
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

              {/* Client Satisfaction Feedback */}
              {tx.feedback && (
                <>
                  <p className="pacu-eyebrow mb-3">
                    Client Satisfaction Feedback
                    <span className="text-muted fw-normal ms-2" style={{ fontSize: '0.7rem', textTransform: 'none', letterSpacing: 0 }}>
                      {tx.feedback.submitted_via === 'manual' ? 'Manually encoded' : 'Submitted online'}
                    </span>
                  </p>
                  <div className="mb-4 p-3" style={{ backgroundColor: 'var(--pacu-bg)', borderRadius: 'var(--pacu-radius)' }}>
                    {SQD_KEYS.map((key, i) => {
                      const value = tx.feedback![key];
                      return (
                        <div
                          key={key}
                          className="d-flex justify-content-between align-items-start gap-3 py-2"
                          style={{ fontSize: '0.85rem', borderTop: i > 0 ? '1px solid var(--pacu-border)' : undefined }}
                        >
                          <span className="text-muted">{i + 1}. {SQD_STATEMENTS[i]}</span>
                          <span className="fw-semibold" style={{ whiteSpace: 'nowrap', color: 'var(--pacu-accent)' }}>
                            {value == null ? 'N/A' : `${value} / 5`}
                          </span>
                        </div>
                      );
                    })}
                    {tx.feedback.comments && (
                      <p className="mb-0 mt-3 pt-3" style={{ fontSize: '0.9rem', borderTop: '1px solid var(--pacu-border)' }}>
                        <span className="pacu-eyebrow d-block mb-1" style={{ fontSize: '0.65rem' }}>Comments</span>
                        {tx.feedback.comments}
                      </p>
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
