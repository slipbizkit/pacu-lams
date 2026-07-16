import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import { SQD_KEYS } from '../types/client';
import type { CompletedTransaction, IssueTag } from '../types/client';
import { SQD_STATEMENTS } from './FeedbackQuestions';

interface TransactionViewModalProps {
  transaction: CompletedTransaction;
  onClose: () => void;
  // How to fetch the transaction's issue tags. Defaults to the lawyer's own-client
  // endpoint; the Director passes a read-only loader since it doesn't own the client.
  loadIssues?: (clientId: number) => Promise<IssueTag[]>;
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

// Score → semantic token. Mirrors the rating buckets used on the Reports page.
function ratingColor(v: number): string {
  return v >= 4 ? 'var(--pacu-success)' : v === 3 ? 'var(--pacu-warning)' : 'var(--pacu-danger)';
}

// ── Presentational building blocks ───────────────────────────────────────────

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div>
      <p className="pacu-eyebrow mb-1" style={{ fontSize: '0.62rem', letterSpacing: '0.1em' }}>{label}</p>
      <p className="mb-0" style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--pacu-text)' }}>
        {empty ? <span style={{ color: 'var(--pacu-text-muted)', fontWeight: 400 }}>—</span> : value}
      </p>
    </div>
  );
}

function Section({ icon, title, meta, children }: {
  icon: string; title: string; meta?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="pacu-vm-section">
      <div className="d-flex align-items-center gap-2 mb-3">
        <span
          className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 30, height: 30, borderRadius: 'var(--pacu-radius-sm)', backgroundColor: 'var(--pacu-accent-soft)', color: 'var(--pacu-accent)' }}
        >
          <i className={`bi ${icon}`} style={{ fontSize: '0.95rem' }} />
        </span>
        <span className="pacu-eyebrow" style={{ fontSize: '0.7rem', color: 'var(--pacu-text-secondary)' }}>{title}</span>
        {meta && <span className="ms-auto">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

function Panel({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--pacu-bg)',
        borderRadius: 'var(--pacu-radius)',
        border: '1px solid var(--pacu-border)',
        borderLeft: accent ? '3px solid var(--pacu-accent)' : undefined,
        padding: '1rem 1.15rem',
      }}
    >
      {children}
    </div>
  );
}

function Chip({ children, tone = 'accent' }: { children: React.ReactNode; tone?: 'accent' | 'warning' }) {
  const bg = tone === 'warning'
    ? 'color-mix(in srgb, var(--pacu-warning) 14%, transparent)'
    : 'var(--pacu-accent-soft)';
  const fg = tone === 'warning' ? 'var(--pacu-warning)' : 'var(--pacu-accent)';
  return (
    <span
      className="d-inline-flex align-items-center"
      style={{ padding: '4px 12px', borderRadius: 999, backgroundColor: bg, color: fg, fontSize: '0.8rem', fontWeight: 600 }}
    >
      {children}
    </span>
  );
}

export function TransactionViewModal({ transaction: tx, onClose, loadIssues }: TransactionViewModalProps) {
  const [issues, setIssues] = useState<IssueTag[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const request = loadIssues
      ? loadIssues(tx.client_id)
      : clientService.getMine(tx.client_id).then(({ issues: i }) => i);
    request
      .then((i) => setIssues(i))
      .catch((err) => {
        Swal.fire({ icon: 'error', title: 'Could not load issue details', text: err instanceof Error ? err.message : 'Please try again' });
      })
      .finally(() => setLoadingIssues(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx.client_id]);

  const fullName = [tx.first_name, tx.middle_name, tx.last_name, tx.suffix].filter(Boolean).join(' ');
  const displayName = tx.is_anonymous ? 'Anonymous' : (fullName || 'Unnamed Client');
  const monogram = tx.is_anonymous
    ? null
    : `${tx.first_name?.[0] ?? ''}${tx.last_name?.[0] ?? ''}`.toUpperCase() || '—';

  const priorityLabels = [
    tx.is_senior && 'Senior Citizen',
    tx.is_pwd && 'Person with Disability',
    tx.is_pregnant && 'Pregnant',
  ].filter(Boolean) as string[];

  // Overall CSM score = mean of the answered (non-N/A) items.
  const overall = useMemo(() => {
    if (!tx.feedback) return null;
    const vals = SQD_KEYS.map((k) => tx.feedback![k]).filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return { average: vals.reduce((a, b) => a + b, 0) / vals.length, answered: vals.length };
  }, [tx.feedback]);

  const metaItems = [
    { label: 'Intake Date', value: fmtDate(tx.transaction_date) },
    { label: 'Completion Date', value: fmtDateTime(tx.updated_at) },
    { label: 'Reference No.', value: <span className="pacu-mono">{tx.reference_no}</span> },
    { label: 'Queue No.', value: `#${tx.queue_number}` },
  ];

  return (
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered">
          <div className="modal-content" style={{ overflow: 'hidden' }}>
            {/* Header */}
            <div className="modal-header align-items-start" style={{ borderBottom: '1px solid var(--pacu-border)', padding: '1.1rem 1.4rem' }}>
              <div className="d-flex align-items-center gap-3">
                <span className="pacu-avatar" style={{ width: 46, height: 46, fontSize: '1rem' }}>
                  {tx.is_anonymous ? <i className="bi bi-incognito" /> : monogram}
                </span>
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h5 className="modal-title pacu-display mb-0">{displayName}</h5>
                    <span
                      className="pacu-badge"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--pacu-success) 15%, transparent)', color: 'var(--pacu-success)' }}
                    >
                      <i className="bi bi-check-circle-fill" />
                      Completed
                    </span>
                    {priorityLabels.length > 0 && (
                      <span className="pacu-badge pacu-badge--warning">
                        <i className="bi bi-star-fill" />
                        Priority
                      </span>
                    )}
                  </div>
                  <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.82rem' }}>
                    Queue #{tx.queue_number} &middot;{' '}
                    <span className="pacu-mono">{tx.reference_no}</span>
                  </p>
                </div>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>

            {/* Body */}
            <div className="modal-body" style={{ padding: '1.4rem' }}>
              {/* Key dates / identifiers strip */}
              <div
                className="d-flex flex-wrap mb-4"
                style={{ backgroundColor: 'var(--pacu-bg)', border: '1px solid var(--pacu-border)', borderRadius: 'var(--pacu-radius)' }}
              >
                {metaItems.map((it, i) => (
                  <div
                    key={it.label}
                    style={{ flex: '1 1 150px', minWidth: 150, padding: '0.85rem 1.15rem', borderLeft: i > 0 ? '1px solid var(--pacu-border)' : undefined }}
                  >
                    <p className="pacu-eyebrow mb-1" style={{ fontSize: '0.6rem', letterSpacing: '0.1em' }}>{it.label}</p>
                    <p className="mb-0" style={{ fontSize: '0.86rem', fontWeight: 600 }}>{it.value}</p>
                  </div>
                ))}
              </div>

              {priorityLabels.length > 0 && (
                <div className="mb-4">
                  <Section icon="bi-star" title="Priority Groups">
                    <div className="d-flex gap-2 flex-wrap">
                      {priorityLabels.map((l) => (
                        <span key={l} className="pacu-badge pacu-badge--warning">{l}</span>
                      ))}
                    </div>
                  </Section>
                </div>
              )}

              {/* Client Information */}
              <div className="mb-4">
                <Section icon="bi-person-vcard" title="Client Information">
                  <div className="row g-3">
                    <div className="col-12"><Field label="Full Name" value={tx.is_anonymous ? 'Anonymous' : fullName} /></div>
                    <div className="col-md-4"><Field label="Sex" value={tx.sex ? tx.sex.charAt(0).toUpperCase() + tx.sex.slice(1) : null} /></div>
                    <div className="col-md-4"><Field label="Contact No." value={tx.contact_no} /></div>
                    <div className="col-md-4"><Field label="Email" value={tx.email} /></div>
                    <div className="col-md-6"><Field label="City / Municipality" value={tx.city} /></div>
                  </div>
                </Section>
              </div>

              {/* Employment */}
              <div className="mb-4">
                <Section icon="bi-briefcase" title="Employment">
                  <div className="row g-3">
                    <div className="col-md-4"><Field label="Work Position" value={tx.occupation} /></div>
                    <div className="col-md-4"><Field label="Date of Employment" value={fmtDate(tx.date_of_employment)} /></div>
                    <div className="col-md-4"><Field label="Union Member" value={tx.union_member === null ? null : tx.union_member ? 'Yes' : 'No'} /></div>
                  </div>
                </Section>
              </div>

              {/* Company Details */}
              <div className="mb-4">
                <Section icon="bi-building" title="Company Details">
                  <div className="row g-3">
                    <div className="col-md-6"><Field label="Company / Employer" value={tx.employer} /></div>
                    <div className="col-md-6"><Field label="Company City / Municipality" value={tx.company_city} /></div>
                    <div className="col-12">
                      <p className="pacu-eyebrow mb-1" style={{ fontSize: '0.62rem', letterSpacing: '0.1em' }}>Pending Labor Complaint / Case</p>
                      {tx.pending_complaint_types && tx.pending_complaint_types.length > 0 ? (
                        <div className="d-flex flex-wrap gap-2 mt-1">
                          {tx.pending_complaint_types.map((t) => (
                            <Chip key={t} tone="warning">{t}</Chip>
                          ))}
                        </div>
                      ) : (
                        <p className="mb-0" style={{ fontSize: '0.92rem', color: 'var(--pacu-text-muted)' }}>None</p>
                      )}
                    </div>
                  </div>
                </Section>
              </div>

              {/* Stated Concern */}
              {tx.concern && (
                <div className="mb-4">
                  <Section icon="bi-chat-left-quote" title="Client's Stated Concern">
                    <Panel>
                      <p className="mb-0" style={{ fontSize: '0.92rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{tx.concern}</p>
                    </Panel>
                  </Section>
                </div>
              )}

              {/* Issue Categories */}
              <div className="mb-4">
                <Section icon="bi-tags" title="Issue Categories">
                  {loadingIssues ? (
                    <span className="spinner-border spinner-border-sm text-primary" />
                  ) : issues.length === 0 ? (
                    <span style={{ fontSize: '0.9rem', color: 'var(--pacu-text-muted)' }}>None recorded</span>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {issues.map((i) => (
                        <Chip key={i.category_id}>{i.category_name}</Chip>
                      ))}
                    </div>
                  )}
                </Section>
              </div>

              {/* Legal Advice */}
              <div className="mb-4">
                <Section icon="bi-journal-text" title="Legal Advice">
                  <Panel accent>
                    <p className="mb-0" style={{ fontSize: '0.92rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 40 }}>
                      {tx.legal_advice || <span style={{ color: 'var(--pacu-text-muted)' }}>None recorded</span>}
                    </p>
                  </Panel>
                </Section>
              </div>

              {/* Referral */}
              {tx.referred_office_id && (
                <div className="mb-4">
                  <Section icon="bi-signpost-split" title="Referral">
                    <div className="row g-3">
                      <div className="col-md-5"><Field label="Referred Office" value={tx.referred_office_name} /></div>
                      <div className="col-md-7"><Field label="Reason for Referral" value={tx.referred_reason} /></div>
                    </div>
                  </Section>
                </div>
              )}

              {/* Client Satisfaction Feedback */}
              {tx.feedback && (
                <div className="pacu-vm-section">
                  <Section
                    icon="bi-star-fill"
                    title="Client Satisfaction"
                    meta={
                      <span className="pacu-badge" style={{ backgroundColor: 'var(--pacu-accent-soft)', color: 'var(--pacu-accent)' }}>
                        <i className={`bi ${tx.feedback.submitted_via === 'manual' ? 'bi-pencil-fill' : 'bi-check-circle-fill'}`} />
                        {tx.feedback.submitted_via === 'manual' ? 'Encoded' : 'Submitted online'}
                      </span>
                    }
                  >
                    <Panel>
                      {overall && (
                        <div
                          className="d-flex align-items-center gap-3 mb-3 pb-3"
                          style={{ borderBottom: '1px solid var(--pacu-border)' }}
                        >
                          <div
                            className="pacu-display"
                            style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: ratingColor(overall.average) }}
                          >
                            {overall.average.toFixed(1)}
                            <span style={{ fontSize: '0.95rem', color: 'var(--pacu-text-muted)', fontWeight: 500 }}> / 5</span>
                          </div>
                          <div>
                            <p className="pacu-eyebrow mb-1" style={{ fontSize: '0.62rem', letterSpacing: '0.1em' }}>Overall Rating</p>
                            <p className="mb-0" style={{ fontSize: '0.82rem', color: 'var(--pacu-text-secondary)' }}>
                              Average across {overall.answered} answered item{overall.answered !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      )}
                      {SQD_KEYS.map((key, i) => {
                        const value = tx.feedback![key];
                        return (
                          <div
                            key={key}
                            className="d-flex justify-content-between align-items-center gap-3 py-2"
                            style={{ fontSize: '0.86rem', borderTop: i > 0 ? '1px solid var(--pacu-border)' : undefined }}
                          >
                            <span style={{ color: 'var(--pacu-text-secondary)' }}>{i + 1}. {SQD_STATEMENTS[i]}</span>
                            {value == null ? (
                              <span
                                className="flex-shrink-0"
                                style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--pacu-text-muted)', padding: '2px 10px', borderRadius: 999, border: '1px solid var(--pacu-border)' }}
                              >
                                N/A
                              </span>
                            ) : (
                              <span
                                className="flex-shrink-0"
                                style={{
                                  fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap',
                                  color: ratingColor(value),
                                  backgroundColor: `color-mix(in srgb, ${ratingColor(value)} 14%, transparent)`,
                                  padding: '2px 10px', borderRadius: 999,
                                }}
                              >
                                {value} / 5
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {tx.feedback.comments && (
                        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--pacu-border)' }}>
                          <p className="pacu-eyebrow mb-1" style={{ fontSize: '0.62rem', letterSpacing: '0.1em' }}>Comments</p>
                          <p className="mb-0" style={{ fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{tx.feedback.comments}</p>
                        </div>
                      )}
                    </Panel>
                  </Section>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ borderTop: '1px solid var(--pacu-border)', padding: '0.9rem 1.4rem' }}>
              <button type="button" className="btn btn-primary" onClick={onClose}>
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
